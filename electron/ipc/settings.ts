import { ipcMain, dialog, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { getDb, closeDatabase, initDatabase } from '../db.ts';
import { SETTINGS_KEYS, sanitizeSettingValue } from '../validation.ts';

function assertSettingKey(key: string): string {
  if (!SETTINGS_KEYS.includes(key as typeof SETTINGS_KEYS[number])) {
    throw new Error('Setting key is not allowed.');
  }
  return key;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown database error.';
}

function verifyDatabaseFile(filePath: string): void {
  let candidate: Database.Database | null = null;
  try {
    candidate = new Database(filePath, { readonly: true, fileMustExist: true });
    const quickCheck = candidate.pragma('quick_check') as Array<{ quick_check: string }>;
    if (!quickCheck.some((row) => row.quick_check === 'ok')) {
      throw new Error('SQLite quick_check failed.');
    }
    const tables = candidate.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name IN ('clients', 'orders', 'order_items', 'settings')
    `).all() as Array<{ name: string }>;
    const names = new Set(tables.map((table) => table.name));
    for (const required of ['clients', 'orders', 'order_items', 'settings']) {
      if (!names.has(required)) {
        throw new Error(`Missing ${required} table.`);
      }
    }
  } finally {
    candidate?.close();
  }
}


export function registerSettingsHandlers() {
  const db = getDb();

  // Get a single setting value
  ipcMain.handle('getSetting', (_event, key: string) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(assertSettingKey(key));
    return row ? (row as { value: string }).value : null;
  });

  // Set a setting value
  ipcMain.handle('setSetting', (_event, key: string, value: string) => {
    const safeKey = assertSettingKey(key);
    const safeValue = sanitizeSettingValue(safeKey, value);
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(safeKey, safeValue);
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
        db.pragma('wal_checkpoint(TRUNCATE)');
        // Use better-sqlite3's built-in backup feature which handles WAL and active locking correctly
        await db.backup(filePath);
        return { success: true, path: filePath };
      } catch (err: unknown) {
        console.error('Backup failed via API, trying direct copy:', err);
        try {
          fs.copyFileSync(dbPath, filePath);
          return { success: true, path: filePath };
        } catch (copyErr: unknown) {
          return { success: false, error: errorMessage(copyErr) };
        }
      }
    }
    return { success: false, error: 'Cancelled' };
  });

  // Import a backed-up database
  ipcMain.handle('importDatabase', async () => {
    const dbPath = path.join(app.getPath('userData'), 'ss-doors-manager.db');
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import Database Backup',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    });

    if (filePaths && filePaths.length > 0) {
      const selectedPath = filePaths[0];
      const backupTempPath = dbPath + '.bak';

      try {
        // 1. Verify selected file before touching the live database.
        verifyDatabaseFile(selectedPath);

        // 2. Flush WAL and close current connection.
        db.pragma('wal_checkpoint(TRUNCATE)');
        closeDatabase();

        // 3. Create a temporary backup of the active database for rollback safety.
        if (fs.existsSync(dbPath)) {
          fs.copyFileSync(dbPath, backupTempPath);
        }

        // 4. Copy the imported file over the active database.
        fs.copyFileSync(selectedPath, dbPath);

        // 5. Re-open connection and verify schema after migrations have run.
        const testDb = initDatabase();
        try {
          // Verify that tables exist and it is a valid database
          testDb.prepare('SELECT count(*) FROM clients').get();
          testDb.prepare('SELECT count(*) FROM orders').get();
          testDb.prepare('SELECT count(*) FROM order_items').get();
          testDb.prepare('SELECT count(*) FROM settings').get();
          
          // Delete temporary safety backup
          if (fs.existsSync(backupTempPath)) {
            fs.unlinkSync(backupTempPath);
          }

          return { success: true };
        } catch (verifyErr: unknown) {
          console.error('Imported database failed validation query. Rolling back.', verifyErr);
          
          // Close connection, restore original database, and re-initialize
          closeDatabase();
          if (fs.existsSync(backupTempPath)) {
            fs.copyFileSync(backupTempPath, dbPath);
            fs.unlinkSync(backupTempPath);
          }
          initDatabase();
          return { success: false, error: 'The selected file is not a valid SS Doors database backup.' };
        }
      } catch (err: unknown) {
        console.error('Import failed:', err);
        // Clean up and restore if needed
        closeDatabase();
        if (fs.existsSync(backupTempPath)) {
          fs.copyFileSync(backupTempPath, dbPath);
          fs.unlinkSync(backupTempPath);
        }
        initDatabase();
        return { success: false, error: `Import failed: ${errorMessage(err)}` };
      }
    }
    return { success: false, error: 'Cancelled' };
  });
}
