import { ipcMain } from 'electron';
import { getDb } from '../db.ts';
import { assertPositiveInt, sanitizeText } from '../validation.ts';

export function registerClientsHandlers() {
  ipcMain.handle('addClient', (_event, client: { name: string; phone?: string; address?: string }) => {
    const db = getDb();
    const name = sanitizeText(client?.name, 'Client name', 100, true);
    const phone = sanitizeText(client?.phone, 'Phone number', 30);
    const address = sanitizeText(client?.address, 'Address', 500);
    const stmt = db.prepare(`
      INSERT INTO clients (name, phone, address)
      VALUES (?, ?, ?)
    `);
    const info = stmt.run(name, phone, address);
    return { id: info.lastInsertRowid };
  });

  ipcMain.handle('getClients', () => {
    const db = getDb();
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
    const db = getDb();
    return db.prepare('SELECT * FROM clients WHERE id = ?').get(assertPositiveInt(id, 'Client ID'));
  });

  ipcMain.handle('updateClient', (_event, id: number, fields: { name: string; phone?: string; address?: string }) => {
    const db = getDb();
    const clientId = assertPositiveInt(id, 'Client ID');
    const name = sanitizeText(fields?.name, 'Client name', 100, true);
    const phone = sanitizeText(fields?.phone, 'Phone number', 30);
    const address = sanitizeText(fields?.address, 'Address', 500);
    const stmt = db.prepare(`
      UPDATE clients
      SET name = ?, phone = ?, address = ?
      WHERE id = ?
    `);
    const info = stmt.run(name, phone, address, clientId);
    if (info.changes === 0) {
      throw new Error('Client not found.');
    }
    return true;
  });

  ipcMain.handle('deleteClient', (_event, id: number) => {
    const db = getDb();
    db.prepare('DELETE FROM clients WHERE id = ?').run(assertPositiveInt(id, 'Client ID'));
    return true;
  });
}
