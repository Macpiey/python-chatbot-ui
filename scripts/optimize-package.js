const fs = require('fs');
const path = require('path');

// Define paths
const appPath = path.resolve(__dirname, '../out/Link Commodities AI-win32-x64');
const localesPath = path.join(appPath, 'locales');

console.log('Optimizing packaged application for smaller installer...');

// Function to delete a file or directory
function deleteFileOrDir(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`Deleted directory: ${path.basename(filePath)}`);
      } else {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${path.basename(filePath)}`);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not delete ${filePath}:`, error.message);
  }
}

// Check if app directory exists
if (!fs.existsSync(appPath)) {
  console.error(`App directory not found at ${appPath}. Please run 'npm run package' first.`);
  process.exit(1);
}

// Keep only essential locale files (English variants)
const keepLocales = ['en-US.pak', 'en-GB.pak'];
let deletedLocales = 0;
let savedSpace = 0;

if (fs.existsSync(localesPath)) {
  const localeFiles = fs.readdirSync(localesPath);
  
  localeFiles.forEach(file => {
    if (!keepLocales.includes(file)) {
      const filePath = path.join(localesPath, file);
      try {
        const stats = fs.statSync(filePath);
        savedSpace += stats.size;
        deleteFileOrDir(filePath);
        deletedLocales++;
      } catch (error) {
        console.warn(`Warning: Could not process locale file ${file}:`, error.message);
      }
    }
  });
}

// Delete other unnecessary files that might be included
const unnecessaryFiles = [
  'LICENSES.chromium.html', // Large license file
  'd3dcompiler_47.dll', // DirectX compiler (often not needed)
  'vk_swiftshader.dll', // Vulkan software renderer (fallback)
  'vk_swiftshader_icd.json',
];

unnecessaryFiles.forEach(file => {
  const filePath = path.join(appPath, file);
  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.statSync(filePath);
      savedSpace += stats.size;
      deleteFileOrDir(filePath);
    } catch (error) {
      console.warn(`Warning: Could not delete ${file}:`, error.message);
    }
  }
});

// Clean up any .map files that might have been included
function cleanupMapFiles(dir) {
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        cleanupMapFiles(itemPath);
      } else if (item.endsWith('.map')) {
        savedSpace += stats.size;
        deleteFileOrDir(itemPath);
      }
    });
  } catch (error) {
    // Ignore errors for directories we can't read
  }
}

cleanupMapFiles(appPath);

console.log(`\nOptimization complete!`);
console.log(`- Removed ${deletedLocales} unnecessary locale files`);
console.log(`- Estimated space saved: ${(savedSpace / 1024 / 1024).toFixed(2)} MB`);
console.log(`- Kept locales: ${keepLocales.join(', ')}`);
console.log('\nThe installer should now be significantly smaller.');
