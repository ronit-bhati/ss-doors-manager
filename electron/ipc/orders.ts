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
import { assertLicensed } from '../license.ts';


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
  doorsExtraLabel?: string;
  doorsExtraRate?: number;
  chaukhatExtraLabel?: string;
  chaukhatExtraRate?: number;
  railingsExtraLabel?: string;
  railingsExtraRate?: number;
  fixGolaExtraLabel?: string;
  fixGolaExtraRate?: number;
  mouldingExtraLabel?: string;
  mouldingExtraRate?: number;
}) {
  return {
    clientId: assertPositiveInt(data?.clientId, 'Client ID'),
    notes: sanitizeText(data?.notes, 'Notes', 2000),
    doorUnit: assertEnum(data?.doorUnit, UNIT_VALUES, 'Door unit'),
    chaukhatUnit: assertEnum(data?.chaukhatUnit, UNIT_VALUES, 'Chaukhat unit'),
    railingUnit: assertEnum(data?.railingUnit, UNIT_VALUES, 'Railing unit'),
    fixGolaUnit: assertEnum(data?.fixGolaUnit, UNIT_VALUES, 'Fix gola unit'),
    mouldingUnit: assertEnum(data?.mouldingUnit, UNIT_VALUES, 'Moulding unit'),
    woodType: sanitizeText(data?.woodType, 'Wood type', 100),
    doorsExtraLabel: sanitizeText(data?.doorsExtraLabel ?? '', 'Doors extra label', 100),
    doorsExtraRate: assertFiniteNumber(data?.doorsExtraRate ?? 0, 'Doors extra rate', { min: 0 }),
    chaukhatExtraLabel: sanitizeText(data?.chaukhatExtraLabel ?? '', 'Chaukhat extra label', 100),
    chaukhatExtraRate: assertFiniteNumber(data?.chaukhatExtraRate ?? 0, 'Chaukhat extra rate', { min: 0 }),
    railingsExtraLabel: sanitizeText(data?.railingsExtraLabel ?? '', 'Railings extra label', 100),
    railingsExtraRate: assertFiniteNumber(data?.railingsExtraRate ?? 0, 'Railings extra rate', { min: 0 }),
    fixGolaExtraLabel: sanitizeText(data?.fixGolaExtraLabel ?? '', 'Fix gola extra label', 100),
    fixGolaExtraRate: assertFiniteNumber(data?.fixGolaExtraRate ?? 0, 'Fix gola extra rate', { min: 0 }),
    mouldingExtraLabel: sanitizeText(data?.mouldingExtraLabel ?? '', 'Moulding extra label', 100),
    mouldingExtraRate: assertFiniteNumber(data?.mouldingExtraRate ?? 0, 'Moulding extra rate', { min: 0 })
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

type OrderExtrasRow = {
  doors_extra_rate: number;
  chaukhat_extra_rate: number;
  railings_extra_rate: number;
  fix_gola_extra_rate: number;
  moulding_extra_rate: number;
  total_value: number;
  payment_status: string;
  advance_paid: number;
};

// Helper to recalculate and persist totals for an order
export function recalculateAndUpdateOrderTotals(db: ActiveDb, orderId: number) {
  // Fetch current extra rates from orders table
  const order = db.prepare(`
    SELECT doors_extra_rate, chaukhat_extra_rate, railings_extra_rate, fix_gola_extra_rate, moulding_extra_rate, total_value, payment_status, advance_paid
    FROM orders WHERE id = ?
  `).get(orderId) as OrderExtrasRow | undefined;

  if (!order) return;

  const extras = {
    doorsExtraRate: order.doors_extra_rate || 0,
    chaukhatExtraRate: order.chaukhat_extra_rate || 0,
    railingsExtraRate: order.railings_extra_rate || 0,
    fixGolaExtraRate: order.fix_gola_extra_rate || 0,
    mouldingExtraRate: order.moulding_extra_rate || 0,
  };

  // 1. Fetch all items for this order
  const items = db
    .prepare('SELECT item_type, calculated_value, rate FROM order_items WHERE order_id = ?')
    .all(orderId) as Array<{ item_type: string; calculated_value: number; rate: number }>;

  // 2. Compute totals
  const totals = calculateOrderTotals(items, extras);

  // Auto-update payment status if payment is in full
  const finalAdvance = order.advance_paid || 0;
  const newPaymentStatus = (finalAdvance >= totals.totalAmount && totals.totalAmount > 0) ? 'paid' : order.payment_status;

  // 3. Update the order row in the database
  db.prepare(`
    UPDATE orders 
    SET doors_subtotal = ?, chaukhat_subtotal = ?, railings_subtotal = ?, fix_gola_subtotal = ?, moulding_subtotal = ?,
        doors_amount = ?, chaukhat_amount = ?, railings_amount = ?, fix_gola_amount = ?, moulding_amount = ?,
        total_value = ?, payment_status = ? 
    WHERE id = ?
  `).run(
    totals.doorsSubtotal, totals.chaukhatSubtotal, totals.railingsSubtotal, totals.fixGolaSubtotal, totals.mouldingSubtotal,
    totals.doorsAmount, totals.chaukhatAmount, totals.railingsAmount, totals.fixGolaAmount, totals.mouldingAmount,
    totals.totalAmount, newPaymentStatus, orderId
  );
}

export function registerOrdersHandlers() {
  const db = getDb();

  // Create new order
  ipcMain.handle('createOrder', (_event, payload: any) => {
    assertLicensed();
    const data = sanitizeOrderInput(payload);
    const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(data.clientId);
    if (!client) {
      throw new Error('Client not found.');
    }

    const stmt = db.prepare(`
      INSERT INTO orders (client_id, notes, door_unit, chaukhat_unit, railing_unit, fix_gola_unit, moulding_unit, wood_type, 
                          doors_subtotal, chaukhat_subtotal, railings_subtotal, fix_gola_subtotal, moulding_subtotal, 
                          doors_amount, chaukhat_amount, railings_amount, fix_gola_amount, moulding_amount, total_value,
                          doors_extra_label, doors_extra_rate, chaukhat_extra_label, chaukhat_extra_rate,
                          railings_extra_label, railings_extra_rate, fix_gola_extra_label, fix_gola_extra_rate,
                          moulding_extra_label, moulding_extra_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      data.clientId, data.notes, data.doorUnit, data.chaukhatUnit, data.railingUnit, data.fixGolaUnit, data.mouldingUnit, data.woodType,
      data.doorsExtraLabel, data.doorsExtraRate,
      data.chaukhatExtraLabel, data.chaukhatExtraRate,
      data.railingsExtraLabel, data.railingsExtraRate,
      data.fixGolaExtraLabel, data.fixGolaExtraRate,
      data.mouldingExtraLabel, data.mouldingExtraRate
    );
    return { id: info.lastInsertRowid };
  });

  ipcMain.handle('createOrderWithItems', (_event, payload: {
    order: any;
    items: OrderItemInput[];
  }) => {
    assertLicensed();
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
                            doors_amount, chaukhat_amount, railings_amount, fix_gola_amount, moulding_amount, total_value,
                            doors_extra_label, doors_extra_rate, chaukhat_extra_label, chaukhat_extra_rate,
                            railings_extra_label, railings_extra_rate, fix_gola_extra_label, fix_gola_extra_rate,
                            moulding_extra_label, moulding_extra_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.clientId, data.notes, data.doorUnit, data.chaukhatUnit, data.railingUnit, data.fixGolaUnit, data.mouldingUnit, data.woodType,
        data.doorsExtraLabel, data.doorsExtraRate,
        data.chaukhatExtraLabel, data.chaukhatExtraRate,
        data.railingsExtraLabel, data.railingsExtraRate,
        data.fixGolaExtraLabel, data.fixGolaExtraRate,
        data.mouldingExtraLabel, data.mouldingExtraRate
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
    assertLicensed();
    return db.prepare('SELECT * FROM orders WHERE client_id = ? ORDER BY order_date DESC').all(assertPositiveInt(clientId, 'Client ID'));
  });

  // Get full order details, including line items and payments
  ipcMain.handle('getOrder', (_event, orderId: number) => {
    assertLicensed();
    const cleanOrderId = assertPositiveInt(orderId, 'Order ID');
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(cleanOrderId);
    if (!order) return null;
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(cleanOrderId);
    const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY payment_date ASC').all(cleanOrderId);
    return { ...order, items, payments };
  });

  // Update order notes
  ipcMain.handle('updateOrderNotes', (_event, orderId: number, notes: string) => {
    assertLicensed();
    db.prepare('UPDATE orders SET notes = ? WHERE id = ?').run(
      sanitizeText(notes, 'Notes', 2000),
      assertPositiveInt(orderId, 'Order ID')
    );
    return true;
  });

  // Update order wood type
  ipcMain.handle('updateOrderWoodType', (_event, orderId: number, woodType: string) => {
    assertLicensed();
    db.prepare('UPDATE orders SET wood_type = ? WHERE id = ?').run(
      sanitizeText(woodType, 'Wood type', 100),
      assertPositiveInt(orderId, 'Order ID')
    );
    return true;
  });

  // Update order status
  ipcMain.handle('updateOrderStatus', (_event, orderId: number, status: string) => {
    assertLicensed();
    db.prepare('UPDATE orders SET order_status = ? WHERE id = ?').run(
      assertEnum(status, ORDER_STATUSES, 'Order status'),
      assertPositiveInt(orderId, 'Order ID')
    );
    return true;
  });

  // Update order payment status (manual override — does NOT touch advance_paid,
  // which is exclusively managed by the payments table via addOrderPayment / deleteOrderPayment)
  ipcMain.handle('updateOrderPaymentDetails', (_event, orderId: number, { paymentStatus }: { paymentStatus: string }) => {
    assertLicensed();
    db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(
      assertEnum(paymentStatus, PAYMENT_STATUSES, 'Payment status'),
      assertPositiveInt(orderId, 'Order ID')
    );
    return true;
  });

  // Add a line item to an order
  ipcMain.handle('addOrderItem', (_event, orderId: number, item: { item_type: string; label?: string; height: number; width: number; quantity: number; rate: number }) => {
    assertLicensed();
    const cleanOrderId = assertPositiveInt(orderId, 'Order ID');
    const order = db.prepare('SELECT door_unit, chaukhat_unit, railing_unit, fix_gola_unit, moulding_unit FROM orders WHERE id = ?').get(cleanOrderId) as OrderUnits | undefined;
    if (!order) throw new Error('Order not found');

    const info = insertOrderItem(db, cleanOrderId, item, order);
    recalculateAndUpdateOrderTotals(db, cleanOrderId);
    return { id: info.lastInsertRowid };
  });

  // Update a line item & recalculate totals
  ipcMain.handle('updateOrderItem', (_event, itemId: number, fields: { label?: string; height?: number; width?: number; quantity?: number; rate?: number }) => {
    assertLicensed();
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
    assertLicensed();
    const cleanItemId = assertPositiveInt(itemId, 'Item ID');
    const item = db.prepare('SELECT order_id FROM order_items WHERE id = ?').get(cleanItemId) as { order_id: number } | undefined;
    if (!item) return false;

    db.prepare('DELETE FROM order_items WHERE id = ?').run(cleanItemId);
    recalculateAndUpdateOrderTotals(db, item.order_id);
    return true;
  });

  // Delete an entire order
  ipcMain.handle('deleteOrder', (_event, orderId: number) => {
    assertLicensed();
    db.prepare('DELETE FROM orders WHERE id = ?').run(assertPositiveInt(orderId, 'Order ID'));
    return true;
  });

  // Update order extras & recalculate
  ipcMain.handle('updateOrderExtras', (_event, orderId: number, fields: {
    doorsExtraLabel?: string;
    doorsExtraRate?: number;
    chaukhatExtraLabel?: string;
    chaukhatExtraRate?: number;
    railingsExtraLabel?: string;
    railingsExtraRate?: number;
    fixGolaExtraLabel?: string;
    fixGolaExtraRate?: number;
    mouldingExtraLabel?: string;
    mouldingExtraRate?: number;
  }) => {
    assertLicensed();
    const cleanOrderId = assertPositiveInt(orderId, 'Order ID');
    
    const current = db.prepare(`
      SELECT doors_extra_label, doors_extra_rate, chaukhat_extra_label, chaukhat_extra_rate,
             railings_extra_label, railings_extra_rate, fix_gola_extra_label, fix_gola_extra_rate,
             moulding_extra_label, moulding_extra_rate
      FROM orders WHERE id = ?
    `).get(cleanOrderId) as any;
    if (!current) throw new Error('Order not found');

    const merged = {
      doorsExtraLabel: fields.doorsExtraLabel !== undefined ? sanitizeText(fields.doorsExtraLabel, 'Doors extra label', 100) : current.doors_extra_label,
      doorsExtraRate: fields.doorsExtraRate !== undefined ? assertFiniteNumber(fields.doorsExtraRate, 'Doors extra rate', { min: 0 }) : current.doors_extra_rate,
      
      chaukhatExtraLabel: fields.chaukhatExtraLabel !== undefined ? sanitizeText(fields.chaukhatExtraLabel, 'Chaukhat extra label', 100) : current.chaukhat_extra_label,
      chaukhatExtraRate: fields.chaukhatExtraRate !== undefined ? assertFiniteNumber(fields.chaukhatExtraRate, 'Chaukhat extra rate', { min: 0 }) : current.chaukhat_extra_rate,
      
      railingsExtraLabel: fields.railingsExtraLabel !== undefined ? sanitizeText(fields.railingsExtraLabel, 'Railings extra label', 100) : current.railings_extra_label,
      railingsExtraRate: fields.railingsExtraRate !== undefined ? assertFiniteNumber(fields.railingsExtraRate, 'Railings extra rate', { min: 0 }) : current.railings_extra_rate,
      
      fixGolaExtraLabel: fields.fixGolaExtraLabel !== undefined ? sanitizeText(fields.fixGolaExtraLabel, 'Fix gola extra label', 100) : current.fix_gola_extra_label,
      fixGolaExtraRate: fields.fixGolaExtraRate !== undefined ? assertFiniteNumber(fields.fixGolaExtraRate, 'Fix gola extra rate', { min: 0 }) : current.fix_gola_extra_rate,
      
      mouldingExtraLabel: fields.mouldingExtraLabel !== undefined ? sanitizeText(fields.mouldingExtraLabel, 'Moulding extra label', 100) : current.moulding_extra_label,
      mouldingExtraRate: fields.mouldingExtraRate !== undefined ? assertFiniteNumber(fields.mouldingExtraRate, 'Moulding extra rate', { min: 0 }) : current.moulding_extra_rate,
    };

    db.prepare(`
      UPDATE orders
      SET doors_extra_label = ?, doors_extra_rate = ?,
          chaukhat_extra_label = ?, chaukhat_extra_rate = ?,
          railings_extra_label = ?, railings_extra_rate = ?,
          fix_gola_extra_label = ?, fix_gola_extra_rate = ?,
          moulding_extra_label = ?, moulding_extra_rate = ?
      WHERE id = ?
    `).run(
      merged.doorsExtraLabel, merged.doorsExtraRate,
      merged.chaukhatExtraLabel, merged.chaukhatExtraRate,
      merged.railingsExtraLabel, merged.railingsExtraRate,
      merged.fixGolaExtraLabel, merged.fixGolaExtraRate,
      merged.mouldingExtraLabel, merged.mouldingExtraRate,
      cleanOrderId
    );

    recalculateAndUpdateOrderTotals(db, cleanOrderId);
    return true;
  });

  // Add order payment
  ipcMain.handle('addOrderPayment', (_event, orderId: number, amount: number, paymentDate: string, notes?: string) => {
    assertLicensed();
    const cleanOrderId = assertPositiveInt(orderId, 'Order ID');
    const cleanAmount = assertFiniteNumber(amount, 'Payment amount', { min: 0.01 });
    const cleanDate = sanitizeText(paymentDate, 'Payment date', 50, true);
    const cleanNotes = sanitizeText(notes || '', 'Payment notes', 200);

    db.prepare(`
      INSERT INTO payments (order_id, amount, payment_date, notes)
      VALUES (?, ?, ?, ?)
    `).run(cleanOrderId, cleanAmount, cleanDate, cleanNotes);

    // Sum all payments and update order advance_paid & payment_status
    const totals = db.prepare('SELECT SUM(amount) as total FROM payments WHERE order_id = ?').get(cleanOrderId) as any;
    const finalAdvance = totals ? (totals.total || 0) : 0;

    const order = db.prepare('SELECT total_value, payment_status FROM orders WHERE id = ?').get(cleanOrderId) as any;
    const newStatus = (finalAdvance >= order.total_value && order.total_value > 0) ? 'paid' : order.payment_status;

    db.prepare('UPDATE orders SET advance_paid = ?, payment_status = ? WHERE id = ?').run(
      finalAdvance,
      newStatus,
      cleanOrderId
    );

    return true;
  });

  // Delete order payment
  ipcMain.handle('deleteOrderPayment', (_event, paymentId: number) => {
    assertLicensed();
    const cleanPaymentId = assertPositiveInt(paymentId, 'Payment ID');
    
    const payment = db.prepare('SELECT order_id FROM payments WHERE id = ?').get(cleanPaymentId) as any;
    if (!payment) return false;

    db.prepare('DELETE FROM payments WHERE id = ?').run(cleanPaymentId);

    const cleanOrderId = payment.order_id;
    const totals = db.prepare('SELECT SUM(amount) as total FROM payments WHERE order_id = ?').get(cleanOrderId) as any;
    const finalAdvance = totals ? (totals.total || 0) : 0;

    const order = db.prepare('SELECT total_value, payment_status FROM orders WHERE id = ?').get(cleanOrderId) as any;
    // Always recompute: paid only if payments fully cover the total; otherwise pending.
    // Do NOT preserve old payment_status here — a deleted payment may un-cover a previously paid order.
    const newStatus = (finalAdvance >= order.total_value && order.total_value > 0) ? 'paid' : 'pending';

    db.prepare('UPDATE orders SET advance_paid = ?, payment_status = ? WHERE id = ?').run(
      finalAdvance,
      newStatus,
      cleanOrderId
    );

    return true;
  });
}

