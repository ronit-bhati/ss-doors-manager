/**
 * scripts/native-binary-manager.cjs
 *
 * Unified cross-platform native binary manager for better-sqlite3.
 *
 * Problem: better-sqlite3 contains a native C++ addon (better_sqlite3.node).
 * When building on Linux for Windows, @electron/rebuild compiles the Linux ELF
 * binary — Windows then loads it and throws "Bad EXE format". The reverse also
 * applies: after a Windows build the Linux binary is gone, breaking AppImage.
 *
 * Solution: cache both binaries locally and swap the correct one in before
 * each platform build. After the Windows build, the Linux binary is restored
 * so the dev environment stays clean.
 *
 * Usage:
 *   node scripts/native-binary-manager.cjs linux   → ensures Linux ELF is in place
 *   node scripts/native-binary-manager.cjs win32   → ensures Windows PE32+ DLL is in place
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const { execSync } = require('child_process');

// ── Config ───────────────────────────────────────────────────────────────────
const SQLITE_VERSION   = '12.11.1';
const ELECTRON_VERSION = '42.5.0';
const ELECTRON_ABI     = '146';          // Electron 42.x modules ABI
const BINARY_NAME      = 'better_sqlite3.node';

const projectRoot = path.join(__dirname, '..');
const releaseDir  = path.join(projectRoot, 'node_modules', 'better-sqlite3', 'build', 'Release');
const binaryPath  = path.join(releaseDir, BINARY_NAME);

// Cache lives under scripts/ so it survives npm install
const cacheDir    = path.join(__dirname, '.native-cache');
const linuxCache  = path.join(cacheDir, 'linux-x64',  BINARY_NAME);
const winCache    = path.join(cacheDir, 'win32-x64',  BINARY_NAME);

// ── Helpers ──────────────────────────────────────────────────────────────────
function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Returns 'linux', 'win32', or 'unknown' based on ELF/PE magic bytes. */
function detectPlatform(filePath) {
  if (!fs.existsSync(filePath)) return 'missing';
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    
    // Check ELF magic bytes: 0x7F 0x45 0x4C 0x46 (Linux)
    if (buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
      return 'linux';
    }
    // Check PE magic bytes: MZ (0x4D 0x5A) (Windows)
    if (buffer[0] === 0x4D && buffer[1] === 0x5A) {
      return 'win32';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Downloads a URL to dest, following redirects. */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    function get(u) {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          get(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} from ${u}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error',  reject);
      }).on('error', reject);
    }
    get(url);
  });
}

/** Downloads and caches the Windows pre-built binary from GitHub releases. */
async function downloadWindowsBinary() {
  const url = [
    'https://github.com/WiseLibs/better-sqlite3/releases/download',
    `v${SQLITE_VERSION}`,
    `better-sqlite3-v${SQLITE_VERSION}-electron-v${ELECTRON_ABI}-win32-x64.tar.gz`
  ].join('/');

  const tarPath = path.join(cacheDir, '_win_prebuilt.tar.gz');
  mkdirp(path.dirname(winCache));

  console.log(`  Downloading Windows binary…`);
  console.log(`  ${url}`);
  await downloadFile(url, tarPath);
  console.log('  Download complete. Extracting…');

  // Tarball structure: build/Release/better_sqlite3.node
  execSync(
    `tar -xzf "${tarPath}" --strip-components=2 -C "${path.dirname(winCache)}" "build/Release/${BINARY_NAME}"`,
    { stdio: 'pipe' }
  );
  fs.unlinkSync(tarPath);

  const detected = detectPlatform(winCache);
  if (detected !== 'win32') {
    fs.rmSync(winCache, { force: true });
    throw new Error(`Extracted binary is not a Windows DLL (got: ${detected}). Cannot continue.`);
  }

  console.log('  ✓ Windows binary cached.');
}

/** Rebuilds the Linux binary using @electron/rebuild (uses installed Electron). */
function rebuildLinuxBinary() {
  console.log('  Rebuilding Linux binary from source (this may take a minute)…');
  // Use the locally installed @electron/rebuild (comes with electron-builder)
  execSync(
    `npx electron-rebuild --version ${ELECTRON_VERSION} --arch x64 --force --only better-sqlite3`,
    { cwd: projectRoot, stdio: 'inherit' }
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const targetPlatform = process.argv[2];
  if (targetPlatform !== 'linux' && targetPlatform !== 'win32') {
    console.error('Usage: node native-binary-manager.cjs [linux|win32]');
    process.exit(1);
  }

  mkdirp(cacheDir);
  mkdirp(releaseDir);

  const currentPlatform = detectPlatform(binaryPath);
  console.log(`\n  Native binary manager → target: ${targetPlatform} | current: ${currentPlatform}`);

  // ── Step 1: Opportunistically cache whatever is currently in node_modules ──
  if (currentPlatform === 'linux' && !fs.existsSync(linuxCache)) {
    mkdirp(path.dirname(linuxCache));
    fs.copyFileSync(binaryPath, linuxCache);
    console.log('  ✓ Linux binary cached from node_modules.');
  }
  if (currentPlatform === 'win32' && !fs.existsSync(winCache)) {
    mkdirp(path.dirname(winCache));
    fs.copyFileSync(binaryPath, winCache);
    console.log('  ✓ Windows binary cached from node_modules.');
  }

  // ── Step 2: Ensure the target binary is cached ────────────────────────────
  if (targetPlatform === 'win32' && !fs.existsSync(winCache)) {
    await downloadWindowsBinary();
  }

  if (targetPlatform === 'linux' && !fs.existsSync(linuxCache)) {
    // No Linux cache: rebuild from source
    rebuildLinuxBinary();
    mkdirp(path.dirname(linuxCache));
    fs.copyFileSync(binaryPath, linuxCache);
    console.log('  ✓ Rebuilt Linux binary cached.');
  }

  // ── Step 3: Install the target binary ────────────────────────────────────
  const sourceCache = targetPlatform === 'linux' ? linuxCache : winCache;

  if (detectPlatform(binaryPath) === targetPlatform) {
    console.log(`  ✓ Correct ${targetPlatform} binary already in place. Nothing to do.`);
    return;
  }

  fs.copyFileSync(sourceCache, binaryPath);
  const final = detectPlatform(binaryPath);
  if (final !== targetPlatform) {
    throw new Error(`Binary installation failed. Expected ${targetPlatform}, got ${final}.`);
  }
  console.log(`  ✓ ${targetPlatform} binary installed successfully.\n`);
}

main().catch((err) => {
  console.error('\n  FATAL (native-binary-manager):', err.message);
  process.exit(1);
});
