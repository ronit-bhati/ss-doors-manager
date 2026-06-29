const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

console.log('\nStarting obfuscation hardening pipeline...');

const projectRoot = path.join(__dirname, '..');
const distPath = path.join(projectRoot, 'dist');
const distElectronPath = path.join(projectRoot, 'dist-electron');

if (fs.existsSync(distElectronPath)) {
  for (const file of fs.readdirSync(distElectronPath)) {
    if (!['main.js', 'preload.mjs'].includes(file)) {
      fs.rmSync(path.join(distElectronPath, file), { recursive: true, force: true });
      console.log(`   Removed stale build artifact: dist-electron/${file}`);
    }
  }
}

// ==========================================
// Level 1: Frontend JavaScript Obfuscation
// ==========================================
try {
    console.log('Level 1: Obfuscating React frontend assets...');
  const assetsPath = path.join(distPath, 'assets');
  
  if (fs.existsSync(assetsPath)) {
    const files = fs.readdirSync(assetsPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));

    for (const file of jsFiles) {
      const filePath = path.join(assetsPath, file);
      console.log(`   Scrambling: assets/${file}`);
      
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      
      const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        numbersToExpressions: true,
        simplify: true,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayThreshold: 0.75,
        splitStrings: true,
        splitStringsChunkLength: 5,
        disableConsoleOutput: false,
        selfDefending: false
      });

      fs.writeFileSync(filePath, obfuscationResult.getObfuscatedCode(), 'utf8');
    }
    console.log('Level 1: Frontend obfuscated successfully.');
  }
} catch (err) {
  console.error('Level 1: Obfuscation failed:', err);
  process.exit(1);
}

// ==========================================
// Level 2: Backend JavaScript Obfuscation
// ==========================================
try {
  console.log('Level 2: Obfuscating Electron main process...');
  const mainJsPath = path.join(distElectronPath, 'main.js');

  if (fs.existsSync(mainJsPath)) {
    console.log('   Scrambling: dist-electron/main.js');
    const sourceCode = fs.readFileSync(mainJsPath, 'utf8');
    
    // Scrambles backend licensing checks before packaging.
    const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      numbersToExpressions: true,
      simplify: true,
      stringArray: true,
      stringArrayCallsTransform: true,
      stringArrayThreshold: 0.85, // Higher threshold for key variables like the salt
      splitStrings: true,
      splitStringsChunkLength: 4,  // Splits secret strings into 4-char chunks
      disableConsoleOutput: false,
      selfDefending: false
    });

    fs.writeFileSync(mainJsPath, obfuscationResult.getObfuscatedCode(), 'utf8');
    console.log('Level 2: Electron backend obfuscated successfully.');
  } else {
    console.error('Error: dist-electron/main.js not found. Make sure build:vite or vite build ran first.');
    process.exit(1);
  }
} catch (err) {
  console.error('Level 2: Backend obfuscation failed:', err);
  process.exit(1);
}

console.log('Obfuscation hardening completed successfully.\n');
