const { spawn } = require('child_process');
const path = require('path');
const electronPath = require('electron');

console.log('Starting setup in development mode...');

// Set NODE_ENV to development
process.env.NODE_ENV = 'development';

// Run the setup application
const setupProcess = spawn(electronPath, [path.join(__dirname, '../src/setup/index.js')], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

setupProcess.on('close', (code) => {
  console.log(`Setup process exited with code ${code}`);
});

setupProcess.on('error', (err) => {
  console.error('Failed to start setup process:', err);
});
