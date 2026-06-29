import { execSync } from 'child_process';
import * as crypto from 'crypto';
import { getDb } from './db.ts';

let cachedLicenseStatus: boolean | null = null;


function activationSalt(): string {
  return String.fromCharCode(108, 111, 99, 107, 64, 48, 55, 56, 54);
}

// Helper to run command-line tools cleanly
function runCommand(cmd: string): string {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 4000,
      windowsHide: true,
      maxBuffer: 1024 * 64
    }).trim();
  } catch (e) {
    return '';
  }
}

function cleanHardwareId(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function isUsableHardwareId(value: string): boolean {
  const cleaned = cleanHardwareId(value);
  if (cleaned.length < 8) return false;

  const lowered = value.toLowerCase();
  const placeholderWords = [
    'default',
    'none',
    'unknown',
    'notapplicable',
    'notspecified',
    'tobefilled',
    'systemserial',
    'oem'
  ];

  if (placeholderWords.some((word) => lowered.replace(/[^a-z]/g, '').includes(word))) {
    return false;
  }

  if (/^0+$/.test(cleaned) || /^F+$/.test(cleaned)) {
    return false;
  }

  return true;
}

function firstUsableHardwareId(values: string[]): string | null {
  for (const value of values) {
    if (isUsableHardwareId(value)) {
      return value;
    }
  }
  return null;
}

function parseWmicValue(output: string, header: string): string {
  const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
  const value = lines.find((line) => line.toLowerCase() !== header.toLowerCase());
  return value || '';
}

// 1. Get raw platform-specific Hardware ID
export function getRawMachineId(): string {
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      // 1. Windows Motherboard UUID (wmic)
      const ids: string[] = [];
      ids.push(parseWmicValue(runCommand('wmic csproduct get uuid'), 'uuid'));

      // 2. Windows Motherboard UUID (PowerShell - fallback for newer Win11)
      ids.push(runCommand('powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_ComputerSystemProduct | Select-Object -ExpandProperty UUID"'));

      // 3. BIOS Serial Number (wmic)
      ids.push(parseWmicValue(runCommand('wmic bios get serialnumber'), 'serialnumber'));

      // 4. BIOS Serial Number (PowerShell)
      ids.push(runCommand('powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Bios | Select-Object -ExpandProperty SerialNumber"'));

      // 5. CPU Processor ID (wmic)
      ids.push(parseWmicValue(runCommand('wmic cpu get processorid'), 'processorid'));

      // 6. CPU Processor ID (PowerShell)
      ids.push(runCommand('powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Processor | Select-Object -ExpandProperty ProcessorId"'));

      const id = firstUsableHardwareId(ids);
      if (id) return id;
    } 
    
    if (platform === 'darwin') {
      // macOS: IOPlatformUUID
      const output = runCommand(
        `ioreg -rd1 -c IOPlatformExpertDevice | awk -F'"' '/IOPlatformUUID/ {print $4}'`
      );
      if (isUsableHardwareId(output)) {
        return output;
      }
      // Fallback
      const macSerial = runCommand("system_profiler SPHardwareDataType | awk '/Serial Number/ {print $4}'");
      if (isUsableHardwareId(macSerial)) return macSerial;
    } 
    
    if (platform === 'linux') {
      // Linux machine ID
      const dBusId = runCommand('cat /var/lib/dbus/machine-id');
      if (isUsableHardwareId(dBusId)) return dBusId;

      const etcId = runCommand('cat /etc/machine-id');
      if (isUsableHardwareId(etcId)) return etcId;

      const productUuid = runCommand('cat /sys/class/dmi/id/product_uuid');
      if (isUsableHardwareId(productUuid)) return productUuid;
    }
  } catch (err) {
    console.error('Error reading machine ID:', err);
  }

  throw new Error('Unable to read a stable hardware identifier on this computer.');
}

// 2. Generate a clean, short, human-friendly Machine ID for display
// Example: "ABCD-EFGH-IJKL"
export function getDisplayMachineId(): string {
  const rawId = getRawMachineId();
  // Clean up whitespace to ensure stability
  const cleaned = cleanHardwareId(rawId);
  
  const hash = crypto
    .createHash('sha256')
    .update(cleaned)
    .digest('hex')
    .substring(0, 12)
    .toUpperCase();
    
  return `${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`;
}

// 3. Calculate the correct Activation Code for a given Display Machine ID
// Example: "WXYZ-1234"
export function calculateActivationCodeFor(displayId: string): string {
  // Clean up input
  const cleaned = displayId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  const hash = crypto
    .createHash('sha256')
    .update(cleaned + activationSalt())
    .digest('hex');
    
  const key = hash.substring(0, 8).toUpperCase();
  return `${key.substring(0, 4)}-${key.substring(4, 8)}`;
}

// 4. Verify whether the entered code matches the local machine's fingerprint
export function verifyCode(enteredCode: string): boolean {
  if (!enteredCode) return false;
  
  const currentDisplayId = getDisplayMachineId();
  const correctCode = calculateActivationCodeFor(currentDisplayId);
  
  const cleanEntered = enteredCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const cleanCorrect = correctCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  const enteredBuffer = Buffer.from(cleanEntered);
  const correctBuffer = Buffer.from(cleanCorrect);
  return enteredBuffer.length === correctBuffer.length && crypto.timingSafeEqual(enteredBuffer, correctBuffer);
}

// 5. Invalidate the licensing cache (called on new activation or database import)
export function invalidateLicenseCache(): void {
  cachedLicenseStatus = null;
}

// 6. Check if the application is currently activated (cached)
export function isLicensed(): boolean {
  if (cachedLicenseStatus !== null) {
    return cachedLicenseStatus;
  }

  try {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('activation_code') as { value: string } | undefined;
    
    if (!row || !row.value) {
      cachedLicenseStatus = false;
      return false;
    }

    const isValid = verifyCode(row.value);
    cachedLicenseStatus = isValid;
    return isValid;
  } catch (err) {
    console.error('Error during license status caching check:', err);
    return false;
  }
}

// 7. Assert that the application is activated, throw error if not
export function assertLicensed(): void {
  if (!isLicensed()) {
    throw new Error('Application is not activated. Please complete the activation process.');
  }
}

