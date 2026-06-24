/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrowserWindow, dialog, ipcMain, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getDb } from './db.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function registerPdfHandlers() {
  ipcMain.handle('exportOrderPDF', async (_event, orderId: number) => {
    const db = getDb();
    
    // Retrieve client and order details for naming the file
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!order) throw new Error('Order not found');
    
    const client = db.prepare('SELECT name FROM clients WHERE id = ?').get(order.client_id) as any;
    const clientName = client ? client.name.replace(/[^a-z0-9]/gi, '_') : 'Unknown';

    // 1. Create a hidden window
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, 'preload.mjs'), // preload.mjs is the bundled name produced by vite-plugin-electron
      }
    });

    const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
    const appRoot = process.env.APP_ROOT || path.join(__dirname, '..');
    const RENDERER_DIST = path.join(appRoot, 'dist');

    // 2. Load the print route in the hidden window
    if (VITE_DEV_SERVER_URL) {
      await printWindow.loadURL(`${VITE_DEV_SERVER_URL}#/print/order/${orderId}`);
    } else {
      const indexPath = path.join(RENDERER_DIST, 'index.html');
      await printWindow.loadFile(indexPath, { hash: `print/order/${orderId}` });
    }

    // 3. Give React time to fetch order details via IPC and render the table
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 4. Generate the PDF buffer
    try {
      const pdfBuffer = await printWindow.webContents.printToPDF({
        printBackground: true,
        margins: {
          top: 0.4,
          bottom: 0.4,
          left: 0.4,
          right: 0.4
        },
        pageSize: 'A4'
      });

      // 5. Open native file-save dialog
      const defaultFilename = `SS-Doors-${clientName}-Order${orderId}.pdf`;
      const { filePath } = await dialog.showSaveDialog({
        title: 'Export PDF',
        defaultPath: path.join(app.getPath('downloads'), defaultFilename),
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
      });

      if (filePath) {
        fs.writeFileSync(filePath, pdfBuffer);
        printWindow.destroy();
        return { success: true, path: filePath };
      } else {
        printWindow.destroy();
        return { success: false, error: 'Cancelled' };
      }
    } catch (error: any) {
      console.error('PDF Generation failed:', error);
      printWindow.destroy();
      return { success: false, error: error.message };
    }
  });
}
