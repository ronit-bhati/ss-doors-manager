/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain } from 'electron';
import { getDb } from '../db.ts';
import { calculateItemValue, calculateOrderTotals } from '../../src/lib/calculations.ts';

// Helper to recalculate and persist totals for an order
export function recalculateAndUpdateOrderTotals(db: any, orderId: number) {
  // 1. Fetch order details (rates)
  const order = db.prepare('SELECT door_rate, chaukhat_rate FROM orders WHERE id = ?').get(orderId);
  if (!order) return;

  // 2. Fetch all items for this order
  const items = db.prepare('SELECT item_type, calculated_value FROM order_items WHERE order_id = ?').all(orderId);

  // 3. Compute totals
  const totals = calculateOrderTotals(items, order.door_rate, order.chaukhat_rate);

  // 4. Update the order row in the database
  db.prepare(`
    UPDATE orders 
    SET doors_subtotal = ?, chaukhat_subtotal = ?, total_value = ? 
    WHERE id = ?
  `).run(totals.doorsSubtotal, totals.chaukhatSubtotal, totals.totalAmount, orderId);
}

export function registerOrdersHandlers() {
  const db = getDb();

  // Create new order
  ipcMain.handle('createOrder', (_event, { clientId, notes, doorUnit, chaukhatUnit }: { clientId: number; notes?: string; doorUnit: string; chaukhatUnit: string }) => {
    // Retrieve default rates from settings
    const defaultDoorRateRow = db.prepare("SELECT value FROM settings WHERE key = 'default_door_rate'").get() as { value: string } | undefined;
    const defaultChaukhatRateRow = db.prepare("SELECT value FROM settings WHERE key = 'default_chaukhat_rate'").get() as { value: string } | undefined;
    
    const doorRate = defaultDoorRateRow ? parseFloat(defaultDoorRateRow.value) || 0 : 0;
    const chaukhatRate = defaultChaukhatRateRow ? parseFloat(defaultChaukhatRateRow.value) || 0 : 0;

    const stmt = db.prepare(`
      INSERT INTO orders (client_id, notes, door_unit, chaukhat_unit, door_rate, chaukhat_rate, doors_subtotal, chaukhat_subtotal, total_value)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)
    `);
    const info = stmt.run(clientId, notes || '', doorUnit, chaukhatUnit, doorRate, chaukhatRate);
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

  // Update order status
  ipcMain.handle('updateOrderStatus', (_event, orderId: number, status: string) => {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, orderId);
    return true;
  });

  // Update order rates & recalculate totals
  ipcMain.handle('updateOrderRates', (_event, orderId: number, { doorRate, chaukhatRate }: { doorRate: number; chaukhatRate: number }) => {
    db.prepare('UPDATE orders SET door_rate = ?, chaukhat_rate = ? WHERE id = ?').run(doorRate, chaukhatRate, orderId);
    recalculateAndUpdateOrderTotals(db, orderId);
    return true;
  });

  // Add a line item to an order
  ipcMain.handle('addOrderItem', (_event, orderId: number, item: { item_type: string; label?: string; height: number; width: number; quantity: number }) => {
    if (item.height < 0 || item.width < 0 || isNaN(item.height) || isNaN(item.width)) {
      throw new Error('Measurements cannot be negative');
    }
    if (item.quantity < 1 || isNaN(item.quantity)) {
      throw new Error('Quantity must be at least 1');
    }

    const order = db.prepare('SELECT door_unit, chaukhat_unit FROM orders WHERE id = ?').get(orderId) as { door_unit: string; chaukhat_unit: string } | undefined;
    if (!order) throw new Error('Order not found');

    const unit = item.item_type === 'door_window' ? order.door_unit : order.chaukhat_unit;
    const calculatedValue = calculateItemValue({
      item_type: item.item_type,
      height: item.height,
      width: item.width,
      quantity: item.quantity,
      unit
    });

    const stmt = db.prepare(`
      INSERT INTO order_items (order_id, item_type, label, height, width, quantity, calculated_value)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      orderId,
      item.item_type,
      item.label || '',
      item.height,
      item.width,
      item.quantity,
      calculatedValue
    );

    recalculateAndUpdateOrderTotals(db, orderId);
    return { id: info.lastInsertRowid };
  });

  // Update a line item & recalculate totals
  ipcMain.handle('updateOrderItem', (_event, itemId: number, fields: { label?: string; height?: number; width?: number; quantity?: number }) => {
    if (fields.height !== undefined && (typeof fields.height !== 'number' || fields.height < 0 || isNaN(fields.height))) {
      throw new Error('Height cannot be negative');
    }
    if (fields.width !== undefined && (typeof fields.width !== 'number' || fields.width < 0 || isNaN(fields.width))) {
      throw new Error('Width cannot be negative');
    }
    if (fields.quantity !== undefined && (typeof fields.quantity !== 'number' || fields.quantity < 1 || isNaN(fields.quantity))) {
      throw new Error('Quantity must be at least 1');
    }

    const item = db.prepare('SELECT * FROM order_items WHERE id = ?').get(itemId) as any;
    if (!item) throw new Error('Item not found');

    const order = db.prepare('SELECT door_unit, chaukhat_unit FROM orders WHERE id = ?').get(item.order_id) as { door_unit: string; chaukhat_unit: string } | undefined;
    if (!order) throw new Error('Order not found');

    const merged = { ...item, ...fields };
    const unit = merged.item_type === 'door_window' ? order.door_unit : order.chaukhat_unit;
    const calculatedValue = calculateItemValue({
      item_type: merged.item_type,
      height: merged.height,
      width: merged.width,
      quantity: merged.quantity,
      unit
    });

    const stmt = db.prepare(`
      UPDATE order_items
      SET label = ?, height = ?, width = ?, quantity = ?, calculated_value = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.label || '',
      merged.height,
      merged.width,
      merged.quantity,
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
