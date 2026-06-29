import { ipcMain } from 'electron';
import { getDb } from '../db.ts';
import { getDisplayMachineId, verifyCode, invalidateLicenseCache } from '../license.ts';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown licensing error.';
}

export function registerLicenseHandlers() {
  // Check if the application is currently activated
  ipcMain.handle('checkLicense', () => {
    try {
      const db = getDb();
      const machineId = getDisplayMachineId();
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('activation_code') as { value: string } | undefined;
      
      if (!row || !row.value) {
        return { success: false, machineId };
      }

      const isValid = verifyCode(row.value);
      return { success: isValid, machineId };
    } catch (err: unknown) {
      console.error('Error during license check:', err);
      return { success: false, machineId: 'ERROR-FETCHING-ID', error: errorMessage(err) };
    }
  });

  // Activate the application with an input code
  ipcMain.handle('activateApp', (_event, code: string) => {
    try {
      const db = getDb();
      const isValid = verifyCode(code);
      if (isValid) {
        // Save to database
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
          .run('activation_code', code.trim().toUpperCase());
        
        // Invalidate license cache so subsequent calls reflect active status
        invalidateLicenseCache();
        
        return { success: true };
      }
      return { success: false, error: 'Invalid activation code. Please double-check it or contact developer.' };
    } catch (err: unknown) {
      console.error('Error during activation:', err);
      return { success: false, error: errorMessage(err) };
    }
  });
}
