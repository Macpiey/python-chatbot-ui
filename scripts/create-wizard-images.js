const fs = require('fs');
const path = require('path');

// Define the directory for the wizard images
const setupDir = path.resolve(__dirname, '../assets/setup');

// Make sure the setup directory exists
if (!fs.existsSync(setupDir)) {
  fs.mkdirSync(setupDir, { recursive: true });
}

// Create placeholder files for the wizard images
const placeholderFiles = [
  {
    path: path.join(setupDir, 'wizard-image.bmp'),
    content: '# Placeholder for Inno Setup wizard image\n# Replace with a real .bmp file before building (164x314 pixels)'
  },
  {
    path: path.join(setupDir, 'wizard-small-image.bmp'),
    content: '# Placeholder for Inno Setup small wizard image\n# Replace with a real .bmp file before building (55x58 pixels)'
  }
];

// Create placeholder files if they don't exist
placeholderFiles.forEach(file => {
  if (!fs.existsSync(file.path)) {
    console.log(`Creating placeholder file: ${file.path}`);
    fs.writeFileSync(file.path, file.content);
  } else {
    console.log(`File already exists: ${file.path}`);
  }
});

console.log('\nWizard image placeholders created!');
console.log('\nIMPORTANT: Before building the Inno Setup installer, replace these placeholder files with real BMP images:');
console.log('- wizard-image.bmp (164x314 pixels)');
console.log('- wizard-small-image.bmp (55x58 pixels)');
