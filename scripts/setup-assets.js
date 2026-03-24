const fs = require('fs');
const path = require('path');

// Define the directory structure
const directories = [
  'assets',
  'assets/setup',
  'out',
  'out/windows-installer',
  'out/mac-installer',
  'src/setup'
];

// Create directories if they don't exist
directories.forEach(dir => {
  const dirPath = path.resolve(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dirPath, { recursive: true });
  } else {
    console.log(`Directory already exists: ${dir}`);
  }
});

// Create placeholder files for assets that need to be replaced
const placeholderFiles = [
  {
    path: 'assets/icon.ico',
    content: '# Placeholder for Windows icon file\n# Replace with a real .ico file before building'
  },
  {
    path: 'assets/icon.icns',
    content: '# Placeholder for macOS icon file\n# Replace with a real .icns file before building'
  },
  {
    path: 'assets/icon.png',
    content: '# Placeholder for application icon\n# Replace with a real .png file before building'
  },
  {
    path: 'assets/setup/dmg-background.png',
    content: '# Placeholder for macOS DMG background\n# Replace with a real .png file before building'
  },
  {
    path: 'assets/setup/background.png',
    content: '# Placeholder for Windows installer background\n# Replace with a real .png file before building (493x312 pixels)'
  },
  {
    path: 'assets/setup/banner.png',
    content: '# Placeholder for Windows installer banner\n# Replace with a real .png file before building (493x58 pixels)'
  },
  {
    path: 'assets/setup/info.png',
    content: '# Placeholder for Windows installer info icon\n# Replace with a real .png file before building'
  },
  {
    path: 'assets/setup/warning.png',
    content: '# Placeholder for Windows installer warning icon\n# Replace with a real .png file before building'
  },
  {
    path: 'assets/setup/new.png',
    content: '# Placeholder for Windows installer new icon\n# Replace with a real .png file before building'
  },
  {
    path: 'assets/setup/up.png',
    content: '# Placeholder for Windows installer up icon\n# Replace with a real .png file before building'
  }
];

// Create placeholder files if they don't exist
placeholderFiles.forEach(file => {
  const filePath = path.resolve(__dirname, '..', file.path);
  if (!fs.existsSync(filePath)) {
    console.log(`Creating placeholder file: ${file.path}`);
    fs.writeFileSync(filePath, file.content);
  } else {
    console.log(`File already exists: ${file.path}`);
  }
});

console.log('\nSetup complete!');
console.log('\nIMPORTANT: Before building installers, replace the placeholder files in the assets directory with real image files.');
console.log('See README.md for more information on required asset files.');
