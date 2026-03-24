const { MSICreator } = require('electron-wix-msi');
const path = require('path');
const fs = require('fs');

// Define input and output directories
const APP_DIR = path.resolve(__dirname, '../out/AI Chat-win32-x64');
const OUT_DIR = path.resolve(__dirname, '../out/windows-installer');

// Make sure the output directory exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Check if the app directory exists
if (!fs.existsSync(APP_DIR)) {
  console.error(`App directory not found at ${APP_DIR}. Please run 'npm run package' first.`);
  process.exit(1);
}

// Configure MSI creator
const msiCreator = new MSICreator({
  appDirectory: APP_DIR,
  outputDirectory: OUT_DIR,

  // Configure metadata
  description: 'AI Chat Application',
  exe: 'AI Chat',
  name: 'AI Chat',
  manufacturer: 'Your Company',
  version: '1.0.0',

  // Configure installer UI
  ui: {
    chooseDirectory: true,
    images: {
      background: path.resolve(__dirname, '../assets/setup/background.png'),
      banner: path.resolve(__dirname, '../assets/setup/banner.png'),
      exclamationIcon: path.resolve(__dirname, '../assets/setup/warning.png'),
      infoIcon: path.resolve(__dirname, '../assets/setup/info.png'),
      newIcon: path.resolve(__dirname, '../assets/setup/new.png'),
      upIcon: path.resolve(__dirname, '../assets/setup/up.png')
    }
  },

  // Configure features
  features: {
    autoUpdate: false,
    autoLaunch: true,
  },

  // Configure installation
  programFilesFolderName: 'AI Chat',
  shortcutFolderName: 'AI Chat',
  shortcutName: 'AI Chat',

  // Add license file
  licenseFile: path.resolve(__dirname, '../src/setup/license.txt'),
});

// Create the MSI installer
async function createInstaller() {
  try {
    // Create .wxs template file
    await msiCreator.create();

    // Compile the installer
    const msiPath = await msiCreator.compile();

    console.log(`MSI installer created at: ${msiPath}`);
  } catch (error) {
    console.error('Error creating MSI installer:', error);
    process.exit(1);
  }
}

// Run the installer creation
createInstaller();
