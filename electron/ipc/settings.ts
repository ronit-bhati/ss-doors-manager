/* eslint-disable @typescript-eslint/no-explicit-any */
import { ipcMain, dialog, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { getDb } from '../db.ts';

export function registerSettingsHandlers() {
  const db = getDb();

  // Get a single setting value
  ipcMain.handle('getSetting', (_event, key: string) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? (row as { value: string }).value : null;
  });

  // Set a setting value
  ipcMain.handle('setSetting', (_event, key: string, value: string) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
    return true;
  });

  // Get all settings as a key-value object
  ipcMain.handle('getAllSettings', () => {
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    const settings: Record<string, string> = {};
    rows.forEach(r => {
      settings[r.key] = r.value;
    });
    return settings;
  });

  // Backup the SQLite database file
  ipcMain.handle('backupDatabase', async () => {
    const dbPath = path.join(app.getPath('userData'), 'ss-doors-manager.db');
    const { filePath } = await dialog.showSaveDialog({
      title: 'Backup Database',
      defaultPath: path.join(app.getPath('downloads'), `ss-doors-backup-${new Date().toISOString().slice(0, 10)}.db`),
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    });

    if (filePath) {
      try {
        // Use better-sqlite3's built-in backup feature which handles WAL and active locking correctly
        await db.backup(filePath);
        return { success: true, path: filePath };
      } catch (err: any) {
        console.error('Backup failed via API, trying direct copy:', err);
        try {
          fs.copyFileSync(dbPath, filePath);
          return { success: true, path: filePath };
        } catch (copyErr: any) {
          return { success: false, error: copyErr.message };
        }
      }
    }
    return { success: false, error: 'Cancelled' };
  });
}
