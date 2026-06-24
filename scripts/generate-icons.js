import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const buildDir = path.join(rootDir, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir);
}

const assetsDir = path.join(rootDir, 'src', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const publicDir = path.join(rootDir, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Source image provided by user
const srcPath = path.join(rootDir, 'logo.png');

// Helper to convert PNG buffer to Windows ICO format (256x256 single image)
function convertPngToIco(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Image type (1 = ICO)
  header.writeUInt16LE(1, 4); // Number of images (1)

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // Width (0 means 256)
  entry.writeUInt8(0, 1); // Height (0 means 256)
  entry.writeUInt8(0, 2); // Palette colors (0)
  entry.writeUInt8(0, 3); // Reserved
  entry.writeUInt16LE(1, 4); // Color planes (1)
  entry.writeUInt16LE(32, 6); // Bits per pixel (32)
  entry.writeUInt32LE(pngBuffer.length, 8); // Size of PNG data in bytes
  entry.writeUInt32LE(22, 12); // Offset of PNG data (6 header + 16 entry = 22)

  return Buffer.concat([header, entry, pngBuffer]);
}

app.whenReady().then(() => {
  if (!fs.existsSync(srcPath)) {
    console.error(`Source logo.png not found at: ${srcPath}`);
    app.quit();
    return;
  }

  // Create a headless window with disabled webSecurity to allow file:// loading
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // Load a simple blank page
  win.loadURL('data:text/html,<html><body></body></html>');

  win.webContents.on('did-finish-load', async () => {
    try {
      // Run the image processing inside the renderer process where Canvas is available
      const results = await win.webContents.executeJavaScript(`
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            try {
              const srcWidth = img.width;
              const srcHeight = img.height;
              const aspect = srcWidth / srcHeight;

              // Helper function to render image with "contain" fit on a square canvas
              function makeSquare(targetSize) {
                const canvas = document.createElement('canvas');
                canvas.width = targetSize;
                canvas.height = targetSize;
                const ctx = canvas.getContext('2d');
                
                // Clear to transparent
                ctx.clearRect(0, 0, targetSize, targetSize);

                // Calculate contain scale
                const scale = Math.min(targetSize / srcWidth, targetSize / srcHeight);
                const w = srcWidth * scale;
                const h = srcHeight * scale;
                const x = (targetSize - w) / 2;
                const y = (targetSize - h) / 2;

                // Draw with high quality image scaling
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, x, y, w, h);

                return canvas.toDataURL('image/png').split(',')[1];
              }

              // Helper function to render image maintaining aspect ratio (e.g. 128px height for toolbar)
              function makeAspect(targetHeight) {
                const targetWidth = Math.round(targetHeight * aspect);
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');

                ctx.clearRect(0, 0, targetWidth, targetHeight);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                return {
                  base64: canvas.toDataURL('image/png').split(',')[1],
                  width: targetWidth,
                  height: targetHeight
                };
              }

              resolve({
                logoAspect: makeAspect(128), // 128px height for toolbar
                logo512: makeSquare(512),
                logo256: makeSquare(256)
              });
            } catch (err) {
              reject(err.message);
            }
          };
          img.onerror = () => reject('Failed to load image from local file');
          img.src = 'file://' + ${JSON.stringify(srcPath)};
        });
      `);

      // Write results to files
      // 1. Toolbar logo (maintaining aspect ratio)
      const logoAspectBuf = Buffer.from(results.logoAspect.base64, 'base64');
      fs.writeFileSync(path.join(assetsDir, 'logo.png'), logoAspectBuf);
      console.log(`Generated src/assets/logo.png (${results.logoAspect.width}x${results.logoAspect.height}) with aspect ratio maintained.`);

      // 2. 512x512 app icons
      const logo512Buf = Buffer.from(results.logo512, 'base64');
      fs.writeFileSync(path.join(buildDir, 'icon.png'), logo512Buf);
      fs.writeFileSync(path.join(publicDir, 'icon.png'), logo512Buf);
      console.log('Generated build/icon.png and public/icon.png (512x512 square, centered without squeezing).');

      // 3. 256x256 app icons & Windows ICO
      const logo256Buf = Buffer.from(results.logo256, 'base64');
      const icoBuf = convertPngToIco(logo256Buf);
      fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuf);
      fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);
      console.log('Generated build/icon.ico and public/favicon.ico (256x256 Windows ICO, centered without squeezing).');

      console.log('Successfully completed high-quality icon generation!');
    } catch (err) {
      console.error('Error in canvas processing:', err);
    } finally {
      app.quit();
    }
  });
});
