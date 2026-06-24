/* eslint-disable @typescript-eslint/no-explicit-any */
import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  // Store db file in the standard OS-specific appData directory
  const dbPath = path.join(app.getPath('userData'), 'ss-doors-manager.db');
  console.log('Database path:', dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Schema verification: if old schema is present, recreate tables for a clean restart
  try {
    const tableInfo = db.prepare("PRAGMA table_info(orders)").all() as any[];
    const hasDoorUnit = tableInfo.some(col => col.name === 'door_unit');
    if (tableInfo.length > 0 && !hasDoorUnit) {
      console.log('Detected older schema. Recreating tables for a clean startup...');
      db.exec(`
        DROP TABLE IF EXISTS order_items;
        DROP TABLE IF EXISTS orders;
        DROP TABLE IF EXISTS clients;
        DROP TABLE IF EXISTS settings;
      `);
    }
  } catch (e) {
    // Orders table might not exist yet, which is fine
  }

  // Create tables in order of dependencies
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      phone       TEXT,
      address     TEXT,
      created_at  TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id              INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      order_date             TEXT DEFAULT CURRENT_TIMESTAMP,
      status                 TEXT DEFAULT 'pending',
      notes                  TEXT,
      door_unit              TEXT NOT NULL DEFAULT 'inches',
      chaukhat_unit          TEXT NOT NULL DEFAULT 'inches',
      door_rate              REAL DEFAULT 0,
      chaukhat_rate          REAL DEFAULT 0,
      doors_subtotal         REAL DEFAULT 0,
      chaukhat_subtotal      REAL DEFAULT 0,
      total_value            REAL DEFAULT 0,
      created_at             TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id           INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      item_type          TEXT NOT NULL,
      label              TEXT,
      height             REAL NOT NULL,
      width              REAL NOT NULL,
      quantity           INTEGER NOT NULL DEFAULT 1,
      calculated_value   REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key    TEXT PRIMARY KEY,
      value  TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
    CREATE INDEX IF NOT EXISTS idx_orders_client_date ON orders(client_id, order_date DESC);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  `);

  // Insert default settings if missing
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  
  insertSetting.run('shop_name', 'SS Doors');
  insertSetting.run('shop_address', '');
  insertSetting.run('shop_phone', '');
  insertSetting.run('default_unit', 'inches');
  insertSetting.run('default_door_rate', '0');
  insertSetting.run('default_chaukhat_rate', '0');

  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}
