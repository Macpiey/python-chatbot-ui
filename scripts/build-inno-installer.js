const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Define paths
const scriptPath = path.resolve(__dirname, 'inno-setup.iss');
const outputPath = path.resolve(__dirname, '../out/windows-installer');
const appPath = path.resolve(__dirname, '../out/Link Commodities AI-win32-x64');

// Make sure the output directory exists
if (!fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath, { recursive: true });
}

// Check if the app directory exists
if (!fs.existsSync(appPath)) {
  console.error(`App directory not found at ${appPath}. Please run 'npm run package' first.`);
  process.exit(1);
}

// Optimize the package by removing unnecessary files
console.log('Optimizing package for smaller installer...');
try {
  execSync('node scripts/optimize-package.js', { stdio: 'inherit' });
} catch (error) {
  console.warn('Warning: Package optimization failed, continuing with installer creation...');
}

// Check if Inno Setup is installed
console.log('Checking for Inno Setup...');
try {
  // Try to find ISCC.exe (Inno Setup Command Line Compiler)
  const isccPaths = [
    'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
    'C:\\Program Files\\Inno Setup 6\\ISCC.exe',
    'C:\\Program Files (x86)\\Inno Setup 5\\ISCC.exe',
    'C:\\Program Files\\Inno Setup 5\\ISCC.exe'
  ];

  let isccPath = null;
  for (const path of isccPaths) {
    if (fs.existsSync(path)) {
      isccPath = path;
      break;
    }
  }

  if (!isccPath) {
    console.error('Inno Setup is not installed or not found at the expected locations.');
    console.error('Please install Inno Setup from https://jrsoftware.org/isdl.php');
    process.exit(1);
  }

  // Read version from package.json (single source of truth)
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  const appVersion = packageJson.version;

  console.log(`Inno Setup found at ${isccPath}. Building installer for v${appVersion}...`);

  // Build the installer, passing version as a define
  execSync(`"${isccPath}" /DMyAppVersion="${appVersion}" "${scriptPath}"`, { stdio: 'inherit' });

  console.log(`Installer created successfully at ${outputPath}`);
} catch (error) {
  console.error('Error creating installer:', error);
  process.exit(1);
}
