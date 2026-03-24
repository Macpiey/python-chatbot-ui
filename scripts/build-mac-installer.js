const createDMG = require('electron-installer-dmg');
const path = require('path');
const fs = require('fs');

// Define input and output directories
const APP_DIR = path.resolve(__dirname, '../out/AI Chat-darwin-x64/AI Chat.app');
const OUT_DIR = path.resolve(__dirname, '../out/mac-installer');

// Make sure the output directory exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Check if the app exists
if (!fs.existsSync(APP_DIR)) {
  console.error(`App not found at ${APP_DIR}. Please run 'npm run package' first.`);
  process.exit(1);
}

// Configure DMG creator
const options = {
  appPath: APP_DIR,
  name: 'AI Chat',
  title: 'AI Chat Installer',
  icon: path.resolve(__dirname, '../assets/icon.icns'),
  background: path.resolve(__dirname, '../assets/setup/dmg-background.png'),
  contents: [
    { x: 448, y: 344, type: 'link', path: '/Applications' },
    { x: 192, y: 344, type: 'file', path: APP_DIR }
  ],
  format: 'ULFO',
  window: {
    size: { width: 640, height: 480 }
  },
  overwrite: true,
  out: OUT_DIR
};

// Create the DMG installer
async function createInstaller() {
  try {
    const dmgPath = await createDMG(options);
    console.log(`DMG installer created at: ${dmgPath}`);
  } catch (error) {
    console.error('Error creating DMG installer:', error);
    process.exit(1);
  }
}

// Run the installer creation
createInstaller();
