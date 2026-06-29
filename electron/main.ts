import { app, BrowserWindow, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// ─── Production safety: suppress console output ──────────────────────────────
// In a packaged Windows GUI app there is no terminal attached, so any attempt
// to write to stdout/stderr throws EBADF and crashes the process immediately.
// We silence all console.* calls in production to prevent this.
if (app.isPackaged) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.debug = noop;
  console.error = noop;
}

// ─── Global crash guard ───────────────────────────────────────────────────────
// Show a friendly dialog instead of the raw JS error box for any unhandled
// exception or rejected promise that bubbles up to the main process.
function showFatalError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  dialog.showErrorBox(
    'SS Doors Manager — Unexpected Error',
    `The application encountered an unexpected error and needs to close.\n\n${message}\n\nPlease restart the application. If this keeps happening, contact support.`
  );
  app.quit();
}

process.on('uncaughtException', showFatalError);
process.on('unhandledRejection', showFatalError);

// Suppress Chromium hardware driver warnings, VSync failures, and autofill logs
app.commandLine.appendSwitch('log-level', '3');

import { initDatabase } from './db.ts';
import { registerClientsHandlers } from './ipc/clients.ts';
import { registerOrdersHandlers } from './ipc/orders.ts';
import { registerSettingsHandlers } from './ipc/settings.ts';
import { registerPdfHandlers } from './pdf.ts';
import { registerLicenseHandlers } from './ipc/license.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'), // We will fall back gracefully if missing
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    const isAllowed =
      (VITE_DEV_SERVER_URL && url.startsWith(VITE_DEV_SERVER_URL)) ||
      (!VITE_DEV_SERVER_URL && url.startsWith('file://'));

    if (!isAllowed) {
      event.preventDefault();
    }
  });

  // Remove menu bar for a cleaner, app-like look
  win.removeMenu();

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    // Open devtools in development mode
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }

  win.on('closed', () => {
    win = null;
  });
}

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  // Initialize Database on startup
  initDatabase();

  // Register IPC Handlers
  registerClientsHandlers();
  registerOrdersHandlers();
  registerSettingsHandlers();
  registerPdfHandlers();
  registerLicenseHandlers();

  createWindow();
});
