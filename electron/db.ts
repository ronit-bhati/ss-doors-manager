import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';

let dbConnection: Database.Database | null = null;

function ensureColumn(db: Database.Database, table: string, column: string, definition: string): void {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!info.some((col) => col.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function runMigrations(db: Database.Database): void {
  db.pragma('user_version = 1');

  const tableRows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('orders', 'order_items')")
    .all() as Array<{ name: string }>;
  const tableNames = new Set(tableRows.map((row) => row.name));

  if (tableNames.has('orders')) {
    ensureColumn(db, 'orders', 'order_status', "TEXT DEFAULT 'pending'");
    ensureColumn(db, 'orders', 'payment_status', "TEXT DEFAULT 'pending'");
    ensureColumn(db, 'orders', 'advance_paid', 'REAL DEFAULT 0');
    ensureColumn(db, 'orders', 'railing_unit', "TEXT NOT NULL DEFAULT 'inches'");
    ensureColumn(db, 'orders', 'fix_gola_unit', "TEXT NOT NULL DEFAULT 'inches'");
    ensureColumn(db, 'orders', 'moulding_unit', "TEXT NOT NULL DEFAULT 'inches'");
    ensureColumn(db, 'orders', 'wood_type', "TEXT DEFAULT ''");
    ensureColumn(db, 'orders', 'railings_subtotal', 'REAL DEFAULT 0');
    ensureColumn(db, 'orders', 'fix_gola_subtotal', 'REAL DEFAULT 0');
    ensureColumn(db, 'orders', 'moulding_subtotal', 'REAL DEFAULT 0');
    ensureColumn(db, 'orders', 'railings_amount', 'REAL DEFAULT 0');
    ensureColumn(db, 'orders', 'fix_gola_amount', 'REAL DEFAULT 0');
    ensureColumn(db, 'orders', 'moulding_amount', 'REAL DEFAULT 0');
  }
}

export function initDatabase(): Database.Database {
  if (dbConnection) {
    return dbConnection;
  }

  // Store db file in the standard OS-specific appData directory
  const dbPath = path.join(app.getPath('userData'), 'ss-doors-manager.db');

  dbConnection = new Database(dbPath);

  // Performance & reliability pragmas
  dbConnection.pragma('journal_mode = WAL');       // WAL for concurrent read performance
  dbConnection.pragma('synchronous = NORMAL');     // Best balance of speed/safety for WAL
  dbConnection.pragma('foreign_keys = ON');        // Enforce referential integrity
  dbConnection.pragma('busy_timeout = 5000');      // Wait up to 5s instead of failing immediately

  // Create tables in order of dependencies
  dbConnection.exec(`
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
      order_status           TEXT DEFAULT 'pending',
      payment_status         TEXT DEFAULT 'pending',
      advance_paid           REAL DEFAULT 0,
      notes                  TEXT,
      door_unit              TEXT NOT NULL DEFAULT 'inches',
      chaukhat_unit          TEXT NOT NULL DEFAULT 'inches',
      railing_unit           TEXT NOT NULL DEFAULT 'inches',
      fix_gola_unit          TEXT NOT NULL DEFAULT 'inches',
      moulding_unit          TEXT NOT NULL DEFAULT 'inches',
      wood_type              TEXT DEFAULT '',
      doors_subtotal         REAL DEFAULT 0,
      chaukhat_subtotal      REAL DEFAULT 0,
      railings_subtotal      REAL DEFAULT 0,
      fix_gola_subtotal      REAL DEFAULT 0,
      moulding_subtotal      REAL DEFAULT 0,
      doors_amount           REAL DEFAULT 0,
      chaukhat_amount        REAL DEFAULT 0,
      railings_amount        REAL DEFAULT 0,
      fix_gola_amount        REAL DEFAULT 0,
      moulding_amount        REAL DEFAULT 0,
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
      rate               REAL NOT NULL,
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

  // Run migrations to add any columns introduced in newer versions
  runMigrations(dbConnection);

  // Insert default settings if missing
  const insertSetting = dbConnection.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  
  insertSetting.run('default_door_unit', 'inches');
  insertSetting.run('default_chaukhat_unit', 'inches');
  insertSetting.run('default_railing_unit', 'inches');
  insertSetting.run('default_fix_gola_unit', 'inches');
  insertSetting.run('default_moulding_unit', 'inches');

  insertSetting.run('default_door_rate', '0');
  insertSetting.run('default_chaukhat_rate', '0');
  insertSetting.run('default_railing_rate', '0');
  insertSetting.run('default_fix_gola_rate', '0');
  insertSetting.run('default_moulding_rate', '0');
  insertSetting.run('zoom_factor', '1.0');

  return dbConnection;
}

// Internal helper to get the active physical database connection (resolves lazily)
export function getActiveConnection(): Database.Database {
  if (!dbConnection) {
    return initDatabase();
  }
  return dbConnection;
}

// Dynamic Proxy that behaves exactly like a Database.Database instance.
// It intercepts all property reads/function calls and redirects them to the active connection.
const dbProxy = new Proxy({} as Database.Database, {
  get(_target, prop, receiver) {
    const conn = getActiveConnection();
    const value = Reflect.get(conn, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(conn);
    }
    return value;
  }
});

// Export getDb which returns the Proxy (caches reference correctly across closures)
export function getDb(): Database.Database {
  return dbProxy;
}

// Closes connection and clears cached reference to allow file overwrite
export function closeDatabase(): void {
  if (dbConnection) {
    try {
      dbConnection.close();
    } catch (e) {
      console.error('Error closing database:', e);
    }
    dbConnection = null;
  }
}
