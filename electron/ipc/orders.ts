/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron';
import { getDb } from '../db.ts';
import { calculateItemValue, calculateOrderTotals } from '../../src/lib/calculations.ts';

// Helper to recalculate and persist totals for an order
export function recalculateAndUpdateOrderTotals(db: any, orderId: number) {
  // 1. Fetch all items for this order
  const items = db.prepare('SELECT item_type, calculated_value, rate FROM order_items WHERE order_id = ?').all(orderId);

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
    const stmt = db.prepare(`
      INSERT INTO orders (client_id, notes, door_unit, chaukhat_unit, railing_unit, fix_gola_unit, moulding_unit, wood_type, 
                          doors_subtotal, chaukhat_subtotal, railings_subtotal, fix_gola_subtotal, moulding_subtotal, 
                          doors_amount, chaukhat_amount, railings_amount, fix_gola_amount, moulding_amount, total_value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    `);
    const info = stmt.run(
      clientId, notes || '', doorUnit, chaukhatUnit, railingUnit, fixGolaUnit, mouldingUnit, woodType || ''
    );
    return { id: info.lastInsertRowid };
  });

  // Get orders for a specific client
  ipcMain.handle('getOrdersForClient', (_event, clientId: number) => {
    return db.prepare('SELECT * FROM orders WHERE client_id = ? ORDER BY order_date DESC').all(clientId);
  });

  // Get full order details, including line items
  ipcMain.handle('getOrder', (_event, orderId: number) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) return null;
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    return { ...order, items };
  });

  // Update order notes
  ipcMain.handle('updateOrderNotes', (_event, orderId: number, notes: string) => {
    db.prepare('UPDATE orders SET notes = ? WHERE id = ?').run(notes, orderId);
    return true;
  });

  // Update order wood type
  ipcMain.handle('updateOrderWoodType', (_event, orderId: number, woodType: string) => {
    db.prepare('UPDATE orders SET wood_type = ? WHERE id = ?').run(woodType, orderId);
    return true;
  });

  // Update order status
  ipcMain.handle('updateOrderStatus', (_event, orderId: number, status: string) => {
    db.prepare('UPDATE orders SET order_status = ? WHERE id = ?').run(status, orderId);
    return true;
  });

  // Update order payment status and advance paid
  ipcMain.handle('updateOrderPaymentDetails', (_event, orderId: number, { paymentStatus, advancePaid }: { paymentStatus: string; advancePaid: number }) => {
    db.prepare('UPDATE orders SET payment_status = ?, advance_paid = ? WHERE id = ?').run(paymentStatus, advancePaid, orderId);
    return true;
  });

  // Add a line item to an order
  ipcMain.handle('addOrderItem', (_event, orderId: number, item: { item_type: string; label?: string; height: number; width: number; quantity: number; rate: number }) => {
    if (item.height < 0 || item.width < 0 || isNaN(item.height) || isNaN(item.width)) {
      throw new Error('Measurements cannot be negative');
    }
    if (item.quantity < 1 || isNaN(item.quantity)) {
      throw new Error('Quantity must be at least 1');
    }
    if (item.rate < 0 || isNaN(item.rate)) {
      throw new Error('Rate cannot be negative');
    }

    const order = db.prepare('SELECT door_unit, chaukhat_unit, railing_unit, fix_gola_unit, moulding_unit FROM orders WHERE id = ?').get(orderId) as any;
    if (!order) throw new Error('Order not found');

    let unit = 'inches';
    if (item.item_type === 'door_window') unit = order.door_unit;
    else if (item.item_type === 'chaukhat') unit = order.chaukhat_unit;
    else if (item.item_type === 'railing') unit = order.railing_unit;
    else if (item.item_type === 'fix_gola') unit = order.fix_gola_unit;
    else if (item.item_type === 'moulding') unit = order.moulding_unit;

    const calculatedValue = calculateItemValue({
      item_type: item.item_type,
      height: item.height,
      width: item.width,
      quantity: item.quantity,
      unit
    });

    const stmt = db.prepare(`
      INSERT INTO order_items (order_id, item_type, label, height, width, quantity, rate, calculated_value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      orderId,
      item.item_type,
      item.label || '',
      item.height,
      item.width,
      item.quantity,
      item.rate,
      calculatedValue
    );

    recalculateAndUpdateOrderTotals(db, orderId);
    return { id: info.lastInsertRowid };
  });

  // Update a line item & recalculate totals
  ipcMain.handle('updateOrderItem', (_event, itemId: number, fields: { label?: string; height?: number; width?: number; quantity?: number; rate?: number }) => {
    if (fields.height !== undefined && (typeof fields.height !== 'number' || fields.height < 0 || isNaN(fields.height))) {
      throw new Error('Height cannot be negative');
    }
    if (fields.width !== undefined && (typeof fields.width !== 'number' || fields.width < 0 || isNaN(fields.width))) {
      throw new Error('Width cannot be negative');
    }
    if (fields.quantity !== undefined && (typeof fields.quantity !== 'number' || fields.quantity < 1 || isNaN(fields.quantity))) {
      throw new Error('Quantity must be at least 1');
    }
    if (fields.rate !== undefined && (typeof fields.rate !== 'number' || fields.rate < 0 || isNaN(fields.rate))) {
      throw new Error('Rate cannot be negative');
    }

    const item = db.prepare('SELECT * FROM order_items WHERE id = ?').get(itemId) as any;
    if (!item) throw new Error('Item not found');

    const order = db.prepare('SELECT door_unit, chaukhat_unit, railing_unit, fix_gola_unit, moulding_unit FROM orders WHERE id = ?').get(item.order_id) as any;
    if (!order) throw new Error('Order not found');

    const merged = { ...item, ...fields };
    let unit = 'inches';
    if (merged.item_type === 'door_window') unit = order.door_unit;
    else if (merged.item_type === 'chaukhat') unit = order.chaukhat_unit;
    else if (merged.item_type === 'railing') unit = order.railing_unit;
    else if (merged.item_type === 'fix_gola') unit = order.fix_gola_unit;
    else if (merged.item_type === 'moulding') unit = order.moulding_unit;

    const calculatedValue = calculateItemValue({
      item_type: merged.item_type,
      height: merged.height,
      width: merged.width,
      quantity: merged.quantity,
      unit
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
      itemId
    );

    recalculateAndUpdateOrderTotals(db, item.order_id);
    return true;
  });

  // Delete a line item & recalculate totals
  ipcMain.handle('deleteOrderItem', (_event, itemId: number) => {
    const item = db.prepare('SELECT order_id FROM order_items WHERE id = ?').get(itemId) as { order_id: number } | undefined;
    if (!item) return false;

    db.prepare('DELETE FROM order_items WHERE id = ?').run(itemId);
    recalculateAndUpdateOrderTotals(db, item.order_id);
    return true;
  });

  // Delete an entire order
  ipcMain.handle('deleteOrder', (_event, orderId: number) => {
    db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
    return true;
  });
}
