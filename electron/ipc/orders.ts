import { ipcMain } from 'electron';
import { getDb } from '../db.ts';
import { calculateItemValue, calculateOrderTotals } from '../../src/lib/calculations.ts';
import {
  ITEM_TYPES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  UNIT_VALUES,
  assertEnum,
  assertFiniteNumber,
  assertPositiveInt,
  sanitizeText
} from '../validation.ts';

type OrderItemInput = {
  item_type: string;
  label?: string;
  height: number;
  width: number;
  quantity: number;
  rate: number;
};

type ActiveDb = ReturnType<typeof getDb>;

type OrderUnits = {
  door_unit: string;
  chaukhat_unit: string;
  railing_unit: string;
  fix_gola_unit: string;
  moulding_unit: string;
};

type OrderItemRow = OrderItemInput & {
  id: number;
  order_id: number;
  calculated_value: number;
};

function sanitizeOrderInput(data: {
  clientId: number;
  notes?: string;
  doorUnit: string;
  chaukhatUnit: string;
  railingUnit: string;
  fixGolaUnit: string;
  mouldingUnit: string;
  woodType?: string;
}) {
  return {
    clientId: assertPositiveInt(data?.clientId, 'Client ID'),
    notes: sanitizeText(data?.notes, 'Notes', 2000),
    doorUnit: assertEnum(data?.doorUnit, UNIT_VALUES, 'Door unit'),
    chaukhatUnit: assertEnum(data?.chaukhatUnit, UNIT_VALUES, 'Chaukhat unit'),
    railingUnit: assertEnum(data?.railingUnit, UNIT_VALUES, 'Railing unit'),
    fixGolaUnit: assertEnum(data?.fixGolaUnit, UNIT_VALUES, 'Fix gola unit'),
    mouldingUnit: assertEnum(data?.mouldingUnit, UNIT_VALUES, 'Moulding unit'),
    woodType: sanitizeText(data?.woodType, 'Wood type', 100)
  };
}

function sanitizeOrderItemInput(item: OrderItemInput) {
  return {
    item_type: assertEnum(item?.item_type, ITEM_TYPES, 'Item type'),
    label: sanitizeText(item?.label, 'Item label', 120),
    height: assertFiniteNumber(item?.height, 'Height', { min: 0, max: 100_000 }),
    width: assertFiniteNumber(item?.width, 'Width', { min: 0, max: 100_000 }),
    quantity: assertFiniteNumber(item?.quantity, 'Quantity', { min: 1, max: 100_000, integer: true }),
    rate: assertFiniteNumber(item?.rate, 'Rate', { min: 0, max: 10_000_000 })
  };
}

function unitForItem(itemType: string, order: OrderUnits): string {
  if (itemType === 'door_window') return order.door_unit;
  if (itemType === 'chaukhat') return order.chaukhat_unit;
  if (itemType === 'railing') return order.railing_unit;
  if (itemType === 'fix_gola') return order.fix_gola_unit;
  if (itemType === 'moulding') return order.moulding_unit;
  throw new Error('Item type is not valid.');
}

function insertOrderItem(db: ActiveDb, orderId: number, item: OrderItemInput, orderUnits: OrderUnits) {
  const cleanItem = sanitizeOrderItemInput(item);
  const calculatedValue = calculateItemValue({
    item_type: cleanItem.item_type,
    height: cleanItem.height,
    width: cleanItem.width,
    quantity: cleanItem.quantity,
    unit: unitForItem(cleanItem.item_type, orderUnits)
  });

  const stmt = db.prepare(`
    INSERT INTO order_items (order_id, item_type, label, height, width, quantity, rate, calculated_value)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    orderId,
    cleanItem.item_type,
    cleanItem.label,
    cleanItem.height,
    cleanItem.width,
    cleanItem.quantity,
    cleanItem.rate,
    calculatedValue
  );
}

// Helper to recalculate and persist totals for an order
export function recalculateAndUpdateOrderTotals(db: ActiveDb, orderId: number) {
  // 1. Fetch all items for this order
  const items = db
    .prepare('SELECT item_type, calculated_value, rate FROM order_items WHERE order_id = ?')
    .all(orderId) as Array<{ item_type: string; calculated_value: number; rate: number }>;

  // 2. Compute totals
  const totals = calculateOrderTotals(items);

  // 3. Update the order row in the database
  db.prepare(`
    UPDATE orders 
    SET doors_subtotal = ?, chaukhat_subtotal = ?, railings_subtotal = ?, fix_gola_subtotal = ?, moulding_subtotal = ?,
        doors_amount = ?, chaukhat_amount = ?, railings_amount = ?, fix_gola_amount = ?, moulding_amount = ?,
        total_value = ? 
    WHERE id = ?
  `).run(
    totals.doorsSubtotal, totals.chaukhatSubtotal, totals.railingsSubtotal, totals.fixGolaSubtotal, totals.mouldingSubtotal,
    totals.doorsAmount, totals.chaukhatAmount, totals.railingsAmount, totals.fixGolaAmount, totals.mouldingAmount,
    totals.totalAmount, orderId
  );
}

export function registerOrdersHandlers() {
  const db = getDb();

  // Create new order
  ipcMain.handle('createOrder', (_event, { 
    clientId, notes, doorUnit, chaukhatUnit, railingUnit, fixGolaUnit, mouldingUnit, woodType 
  }: { 
    clientId: number; 
    notes?: string; 
    doorUnit: string; 
    chaukhatUnit: string; 
    railingUnit: string;
    fixGolaUnit: string;
    mouldingUnit: string;
    woodType?: string 
  }) => {
    const data = sanitizeOrderInput({ clientId, notes, doorUnit, chaukhatUnit, railingUnit, fixGolaUnit, mouldingUnit, woodType });
    const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(data.clientId);
    if (!client) {
      throw new Error('Client not found.');
    }

    const stmt = db.prepare(`
      INSERT INTO orders (client_id, notes, door_unit, chaukhat_unit, railing_unit, fix_gola_unit, moulding_unit, wood_type, 
                          doors_subtotal, chaukhat_subtotal, railings_subtotal, fix_gola_subtotal, moulding_subtotal, 
                          doors_amount, chaukhat_amount, railings_amount, fix_gola_amount, moulding_amount, total_value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    `);
    const info = stmt.run(
      data.clientId, data.notes, data.doorUnit, data.chaukhatUnit, data.railingUnit, data.fixGolaUnit, data.mouldingUnit, data.woodType
    );
    return { id: info.lastInsertRowid };
  });

  ipcMain.handle('createOrderWithItems', (_event, payload: {
    order: {
      clientId: number;
      notes?: string;
      doorUnit: string;
      chaukhatUnit: string;
      railingUnit: string;
      fixGolaUnit: string;
      mouldingUnit: string;
      woodType?: string;
    };
    items: OrderItemInput[];
  }) => {
    const data = sanitizeOrderInput(payload?.order);
    const items = Array.isArray(payload?.items) ? payload.items.map(sanitizeOrderItemInput) : [];
    if (items.length === 0) {
      throw new Error('Order must contain at least one item.');
    }
    if (items.length > 1000) {
      throw new Error('Order cannot contain more than 1000 items.');
    }

    const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(data.clientId);
    if (!client) {
      throw new Error('Client not found.');
    }

    const createTransaction = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO orders (client_id, notes, door_unit, chaukhat_unit, railing_unit, fix_gola_unit, moulding_unit, wood_type, 
                            doors_subtotal, chaukhat_subtotal, railings_subtotal, fix_gola_subtotal, moulding_subtotal, 
                            doors_amount, chaukhat_amount, railings_amount, fix_gola_amount, moulding_amount, total_value)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
      `).run(
        data.clientId, data.notes, data.doorUnit, data.chaukhatUnit, data.railingUnit, data.fixGolaUnit, data.mouldingUnit, data.woodType
      );
      const orderId = Number(info.lastInsertRowid);
      const orderUnits = {
        door_unit: data.doorUnit,
        chaukhat_unit: data.chaukhatUnit,
        railing_unit: data.railingUnit,
        fix_gola_unit: data.fixGolaUnit,
        moulding_unit: data.mouldingUnit
      };

      for (const item of items) {
        insertOrderItem(db, orderId, item, orderUnits);
      }
      recalculateAndUpdateOrderTotals(db, orderId);
      return { id: orderId };
    });

    return createTransaction();
  });

  // Get orders for a specific client
  ipcMain.handle('getOrdersForClient', (_event, clientId: number) => {
    return db.prepare('SELECT * FROM orders WHERE client_id = ? ORDER BY order_date DESC').all(assertPositiveInt(clientId, 'Client ID'));
  });

  // Get full order details, including line items
  ipcMain.handle('getOrder', (_event, orderId: number) => {
    const cleanOrderId = assertPositiveInt(orderId, 'Order ID');
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(cleanOrderId);
    if (!order) return null;
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(cleanOrderId);
    return { ...order, items };
  });

  // Update order notes
  ipcMain.handle('updateOrderNotes', (_event, orderId: number, notes: string) => {
    db.prepare('UPDATE orders SET notes = ? WHERE id = ?').run(
      sanitizeText(notes, 'Notes', 2000),
      assertPositiveInt(orderId, 'Order ID')
    );
    return true;
  });

  // Update order wood type
  ipcMain.handle('updateOrderWoodType', (_event, orderId: number, woodType: string) => {
    db.prepare('UPDATE orders SET wood_type = ? WHERE id = ?').run(
      sanitizeText(woodType, 'Wood type', 100),
      assertPositiveInt(orderId, 'Order ID')
    );
    return true;
  });

  // Update order status
  ipcMain.handle('updateOrderStatus', (_event, orderId: number, status: string) => {
    db.prepare('UPDATE orders SET order_status = ? WHERE id = ?').run(
      assertEnum(status, ORDER_STATUSES, 'Order status'),
      assertPositiveInt(orderId, 'Order ID')
    );
    return true;
  });

  // Update order payment status and advance paid
  ipcMain.handle('updateOrderPaymentDetails', (_event, orderId: number, { paymentStatus, advancePaid }: { paymentStatus: string; advancePaid: number }) => {
    db.prepare('UPDATE orders SET payment_status = ?, advance_paid = ? WHERE id = ?').run(
      assertEnum(paymentStatus, PAYMENT_STATUSES, 'Payment status'),
      assertFiniteNumber(advancePaid, 'Advance paid', { min: 0, max: 1_000_000_000 }),
      assertPositiveInt(orderId, 'Order ID')
    );
    return true;
  });

  // Add a line item to an order
  ipcMain.handle('addOrderItem', (_event, orderId: number, item: { item_type: string; label?: string; height: number; width: number; quantity: number; rate: number }) => {
    const cleanOrderId = assertPositiveInt(orderId, 'Order ID');
    const order = db.prepare('SELECT door_unit, chaukhat_unit, railing_unit, fix_gola_unit, moulding_unit FROM orders WHERE id = ?').get(cleanOrderId) as OrderUnits | undefined;
    if (!order) throw new Error('Order not found');

    const info = insertOrderItem(db, cleanOrderId, item, order);
    recalculateAndUpdateOrderTotals(db, cleanOrderId);
    return { id: info.lastInsertRowid };
  });

  // Update a line item & recalculate totals
  ipcMain.handle('updateOrderItem', (_event, itemId: number, fields: { label?: string; height?: number; width?: number; quantity?: number; rate?: number }) => {
    const cleanItemId = assertPositiveInt(itemId, 'Item ID');
    const item = db.prepare('SELECT * FROM order_items WHERE id = ?').get(cleanItemId) as OrderItemRow | undefined;
    if (!item) throw new Error('Item not found');

    const order = db.prepare('SELECT door_unit, chaukhat_unit, railing_unit, fix_gola_unit, moulding_unit FROM orders WHERE id = ?').get(item.order_id) as OrderUnits | undefined;
    if (!order) throw new Error('Order not found');

    const merged = sanitizeOrderItemInput({
      item_type: item.item_type,
      label: fields.label !== undefined ? fields.label : item.label,
      height: fields.height !== undefined ? fields.height : item.height,
      width: fields.width !== undefined ? fields.width : item.width,
      quantity: fields.quantity !== undefined ? fields.quantity : item.quantity,
      rate: fields.rate !== undefined ? fields.rate : item.rate
    });

    const calculatedValue = calculateItemValue({
      item_type: merged.item_type,
      height: merged.height,
      width: merged.width,
      quantity: merged.quantity,
      unit: unitForItem(merged.item_type, order)
    });

    const stmt = db.prepare(`
      UPDATE order_items
      SET label = ?, height = ?, width = ?, quantity = ?, rate = ?, calculated_value = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.label || '',
      merged.height,
      merged.width,
      merged.quantity,
      merged.rate,
      calculatedValue,
      cleanItemId
    );

    recalculateAndUpdateOrderTotals(db, item.order_id);
    return true;
  });

  // Delete a line item & recalculate totals
  ipcMain.handle('deleteOrderItem', (_event, itemId: number) => {
    const cleanItemId = assertPositiveInt(itemId, 'Item ID');
    const item = db.prepare('SELECT order_id FROM order_items WHERE id = ?').get(cleanItemId) as { order_id: number } | undefined;
    if (!item) return false;

    db.prepare('DELETE FROM order_items WHERE id = ?').run(cleanItemId);
    recalculateAndUpdateOrderTotals(db, item.order_id);
    return true;
  });

  // Delete an entire order
  ipcMain.handle('deleteOrder', (_event, orderId: number) => {
    db.prepare('DELETE FROM orders WHERE id = ?').run(assertPositiveInt(orderId, 'Order ID'));
    return true;
  });
}
