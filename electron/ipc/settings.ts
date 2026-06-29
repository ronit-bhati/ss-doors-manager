import { ipcMain, dialog, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { getDb, closeDatabase, initDatabase } from '../db.ts';
import { SETTINGS_KEYS, sanitizeSettingValue } from '../validation.ts';
import { assertLicensed, invalidateLicenseCache } from '../license.ts';


function assertSettingKey(key: string): string {
  if (!SETTINGS_KEYS.includes(key as typeof SETTINGS_KEYS[number])) {
    throw new Error('Setting key is not allowed.');
  }
  return key;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown database error.';
}
// SQLite files always begin with these 16 magic bytes: "SQLite format 3\0"
const SQLITE_MAGIC = Buffer.from([0x53,0x51,0x4c,0x69,0x74,0x65,0x20,0x66,0x6f,0x72,0x6d,0x61,0x74,0x20,0x33,0x00]);

function verifyDatabaseFile(filePath: string): void {
  // ── Stage 1: Magic bytes via Node.js fs ─────────────────────────────────
  // This uses Node.js file I/O (not the SQLite DLL) so it works reliably on
  // every path, including Wine's Z:\ mapped Linux filesystem.
  if (!fs.existsSync(filePath)) {
    throw new Error('Selected file was not found. Please choose a valid backup file.');
  }

  const header = Buffer.alloc(16);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, header, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }

  if (!header.equals(SQLITE_MAGIC)) {
    throw new Error(
      'The selected file is not a SQLite database. ' +
      'Please select a backup file created by SS Doors Manager (.db).'
    );
  }

  // ── Stage 2: Full schema validation via better-sqlite3 ─────────────────
  // Copy to the system temp directory first. On Windows/Wine, the temp dir
  // is always on a native Windows drive (C:\), so the SQLite DLL can open
  // it even when the original path is on a Wine-mapped Linux drive (Z:\).
  const tempPath = path.join(app.getPath('temp'), `ss-verify-${Date.now()}.db`);
  let candidate: Database.Database | null = null;
  try {
    fs.copyFileSync(filePath, tempPath);
    candidate = new Database(tempPath, { readonly: true });

    const rows = candidate.pragma('quick_check') as Array<Record<string, string>>;
    if (rows.length === 0) throw new Error('Database integrity check returned no results.');
    const firstValue = Object.values(rows[0])[0];
    if (firstValue !== 'ok') throw new Error(`Database integrity check failed: ${firstValue}`);

    const tables = candidate.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name IN ('clients', 'orders', 'order_items', 'settings')
    `).all() as Array<{ name: string }>;
    const names = new Set(tables.map((t) => t.name));
    for (const required of ['clients', 'orders', 'order_items', 'settings']) {
      if (!names.has(required)) {
        throw new Error(`Not a valid SS Doors backup — missing table: ${required}.`);
      }
    }
  } finally {
    candidate?.close();
    // Clean up temp copy and any WAL/SHM sidecars SQLite may have created
    for (const p of [tempPath, tempPath + '-wal', tempPath + '-shm']) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  }
}


export function registerSettingsHandlers() {
  const db = getDb();

  // Get a single setting value
  ipcMain.handle('getSetting', (_event, key: string) => {
    if (key !== 'activation_code' && key !== 'zoom_factor') {
      assertLicensed();
    }
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(assertSettingKey(key));
    return row ? (row as { value: string }).value : null;
  });

  // Set a setting value
  ipcMain.handle('setSetting', (_event, key: string, value: string) => {
    const safeKey = assertSettingKey(key);
    if (safeKey !== 'activation_code' && safeKey !== 'zoom_factor') {
      assertLicensed();
    }
    const safeValue = sanitizeSettingValue(safeKey, value);
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(safeKey, safeValue);
    
    if (safeKey === 'activation_code') {
      invalidateLicenseCache();
    }
    return true;
  });

  // Get all settings as a key-value object
  ipcMain.handle('getAllSettings', () => {
    assertLicensed();
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    const settings: Record<string, string> = {};
    rows.forEach(r => {
      settings[r.key] = r.value;
    });
    return settings;
  });

  // Backup the SQLite database file
  ipcMain.handle('backupDatabase', async () => {
    assertLicensed();
    const dbPath = path.join(app.getPath('userData'), 'ss-doors-manager.db');

    const { filePath } = await dialog.showSaveDialog({
      title: 'Backup Database',
      defaultPath: path.join(app.getPath('downloads'), `ss-doors-backup-${new Date().toISOString().slice(0, 10)}.db`),
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    });

    if (!filePath) {
      return { success: false, error: 'Cancelled' };
    }

    try {
      // 1. Fully flush all WAL data into the main database file.
      //    After TRUNCATE checkpoint, the .db file is self-contained —
      //    no -wal or -shm sidecars are needed to read it.
      db.pragma('wal_checkpoint(TRUNCATE)');

      // 2. Copy the main database file using Node.js fs (pure JS, no native DLL).
      //    We deliberately avoid db.backup() here because it uses the
      //    better-sqlite3 native DLL internally, which has inconsistent path
      //    resolution on Wine (Windows DLL vs Node.js may resolve the same
      //    path string to different locations on the underlying Linux filesystem).
      fs.copyFileSync(dbPath, filePath);

      return { success: true, path: filePath };
    } catch (err: unknown) {
      return { success: false, error: errorMessage(err) };
    }
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

          invalidateLicenseCache();
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
