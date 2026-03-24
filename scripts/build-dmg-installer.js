const createDMG = require('create-dmg');
const path = require('path');
const fs = require('fs');

// Define paths
const appPath = path.resolve(__dirname, '../out/AI Chat-darwin-x64/AI Chat.app');
const outputPath = path.resolve(__dirname, '../out/mac-installer/AI Chat.dmg');
const outputDir = path.dirname(outputPath);

// Make sure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Check if the app exists
if (!fs.existsSync(appPath)) {
  console.error(`App not found at ${appPath}. Please run 'npm run package' first.`);
  process.exit(1);
}

// Configuration for the DMG
const options = {
  appPath: appPath,
  name: 'AI Chat',
  title: 'AI Chat Installer',
  icon: path.resolve(__dirname, '../assets/icon.icns'),
  background: path.resolve(__dirname, '../assets/setup/dmg-background.png'),
  contents: [
    { x: 448, y: 344, type: 'link', path: '/Applications' },
    { x: 192, y: 344, type: 'file', path: appPath }
  ],
  format: 'UDZO',
  window: {
    size: { width: 640, height: 480 }
  },
  overwrite: true,
  out: outputDir
};

// Create the DMG
console.log('Creating DMG installer...');
createDMG(options)
  .then(() => {
    console.log(`DMG created successfully at ${outputPath}`);
  })
  .catch(err => {
    console.error('Error creating DMG:', err);
    process.exit(1);
  });
