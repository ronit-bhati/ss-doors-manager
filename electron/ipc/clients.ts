import { ipcMain } from 'electron';
import { getDb } from '../db.ts';

export function registerClientsHandlers() {
  const db = getDb();

  ipcMain.handle('addClient', (_event, client: { name: string; phone?: string; address?: string }) => {
    const stmt = db.prepare(`
      INSERT INTO clients (name, phone, address)
      VALUES (?, ?, ?)
    `);
    const info = stmt.run(client.name, client.phone || '', client.address || '');
    return { id: info.lastInsertRowid };
  });

  ipcMain.handle('getClients', () => {
    return db.prepare(`
      SELECT c.*, 
             GROUP_CONCAT(o.order_status) as order_statuses, 
             GROUP_CONCAT(o.payment_status) as payment_statuses 
      FROM clients c 
      LEFT JOIN orders o ON c.id = o.client_id 
      GROUP BY c.id 
      ORDER BY c.name ASC
    `).all();
  });

  ipcMain.handle('getClient', (_event, id: number) => {
    return db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  });

  ipcMain.handle('updateClient', (_event, id: number, fields: { name: string; phone?: string; address?: string }) => {
    const stmt = db.prepare(`
      UPDATE clients
      SET name = ?, phone = ?, address = ?
      WHERE id = ?
    `);
    stmt.run(fields.name, fields.phone || '', fields.address || '', id);
    return true;
  });

  ipcMain.handle('deleteClient', (_event, id: number) => {
    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    return true;
  });
}
