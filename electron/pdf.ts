import { BrowserWindow, dialog, ipcMain, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getDb } from './db.ts';
import { assertPositiveInt } from './validation.ts';
import { assertLicensed } from './license.ts';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pendingPrintRoutes = new Map<string, () => void>();

type PdfOrderRow = {
  id: number;
  client_id: number;
};

type ClientNameRow = {
  name: string;
};

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'PDF generation failed.';
}

function printReadyKey(webContentsId: number, orderId: number): string {
  return `${webContentsId}:${orderId}`;
}

function waitForPrintReady(printWindow: BrowserWindow, orderId: number, timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const key = printReadyKey(printWindow.webContents.id, orderId);
    const timeout = setTimeout(() => {
      pendingPrintRoutes.delete(key);
      reject(new Error('Print view did not finish loading in time.'));
    }, timeoutMs);

    pendingPrintRoutes.set(key, () => {
      clearTimeout(timeout);
      pendingPrintRoutes.delete(key);
      resolve();
    });
  });
}

export function registerPdfHandlers() {
  ipcMain.handle('printRouteReady', (event, orderId: number) => {
    const cleanOrderId = assertPositiveInt(orderId, 'Order ID');
    const resolve = pendingPrintRoutes.get(printReadyKey(event.sender.id, cleanOrderId));
    if (resolve) {
      resolve();
    }
    return true;
  });

  ipcMain.handle('exportOrderPDF', async (_event, orderId: number) => {
    assertLicensed();
    const db = getDb();
    const cleanOrderId = assertPositiveInt(orderId, 'Order ID');
    
    // Retrieve client and order details for naming the file
    const order = db.prepare('SELECT id, client_id FROM orders WHERE id = ?').get(cleanOrderId) as PdfOrderRow | undefined;
    if (!order) throw new Error('Order not found');
    
    const client = db.prepare('SELECT name FROM clients WHERE id = ?').get(order.client_id) as ClientNameRow | undefined;
    const clientName = client ? client.name.replace(/[^a-z0-9]/gi, '_') : 'Unknown';

    // 1. Create a hidden window
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, 'preload.mjs'),
      }
    });
    printWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
    const appRoot = process.env.APP_ROOT || path.join(__dirname, '..');
    const RENDERER_DIST = path.join(appRoot, 'dist');

    // 2. Load the print route in the hidden window
    try {
      const readyPromise = waitForPrintReady(printWindow, cleanOrderId);

      if (VITE_DEV_SERVER_URL) {
        await printWindow.loadURL(`${VITE_DEV_SERVER_URL}#/print/order/${cleanOrderId}`);
      } else {
        const indexPath = path.join(RENDERER_DIST, 'index.html');
        await printWindow.loadFile(indexPath, { hash: `print/order/${cleanOrderId}` });
      }

      // 3. Wait until the React print route has fetched IPC data and rendered the invoice.
      await readyPromise;

      // 4. Generate the PDF buffer
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
      const defaultFilename = `SS-Doors-${clientName}-Order${cleanOrderId}.pdf`;
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
    } catch (error: unknown) {
      console.error('PDF Generation failed:', error);
      printWindow.destroy();
      return { success: false, error: errorMessage(error) };
    }
  });

  ipcMain.handle('printOrder', async (_event, orderId: number) => {
    assertLicensed();
    const cleanOrderId = assertPositiveInt(orderId, 'Order ID');

    // 1. Create a hidden window
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, 'preload.mjs'),
      }
    });
    printWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
    const appRoot = process.env.APP_ROOT || path.join(__dirname, '..');
    const RENDERER_DIST = path.join(appRoot, 'dist');

    // 2. Load the print route in the hidden window
    try {
      const readyPromise = waitForPrintReady(printWindow, cleanOrderId);

      if (VITE_DEV_SERVER_URL) {
        await printWindow.loadURL(`${VITE_DEV_SERVER_URL}#/print/order/${cleanOrderId}`);
      } else {
        const indexPath = path.join(RENDERER_DIST, 'index.html');
        await printWindow.loadFile(indexPath, { hash: `print/order/${cleanOrderId}` });
      }

      // 3. Wait until the React print route has fetched IPC data and rendered the invoice.
      await readyPromise;

      // 4. Print directly
      return new Promise((resolve) => {
        printWindow.webContents.print(
          {
            silent: false,
            printBackground: true,
            pageSize: 'A4',
            margins: {
              marginType: 'custom',
              top: 0.4,
              bottom: 0.4,
              left: 0.4,
              right: 0.4
            }
          },
          (success, failureReason) => {
            printWindow.destroy();
            if (success) {
              resolve({ success: true });
            } else {
              resolve({ success: false, error: failureReason || 'Cancelled or failed' });
            }
          }
        );
      });
    } catch (error: unknown) {
      console.error('Direct print failed:', error);
      printWindow.destroy();
      return { success: false, error: errorMessage(error) };
    }
  });
}
