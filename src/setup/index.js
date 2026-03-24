const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Create the setup window
const createSetupWindow = () => {
  // Create a window with a professional installer look
  const setupWindow = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    show: false,
    frame: true, // Keep the frame for window controls
    autoHideMenuBar: true, // Hide the menu bar
    titleBarStyle: 'hidden', // Hide the title bar on macOS
    titleBarOverlay: {
      color: '#f5f5f5',
      symbolColor: '#333333',
      height: 0
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: process.env.NODE_ENV === 'development', // Only enable DevTools in development
    },
    icon: path.join(__dirname, '../../assets/icon.ico'),
    backgroundColor: '#f5f5f5', // Set a background color to avoid white flash
  });

  // Hide the menu bar completely
  Menu.setApplicationMenu(null);

  // Load the simple setup HTML file
  setupWindow.loadFile(path.join(__dirname, 'setup-simple.html'));

  // Show window when ready
  setupWindow.once('ready-to-show', () => {
    setupWindow.show();

    // Open DevTools in development mode
    if (process.env.NODE_ENV === 'development') {
      setupWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Prevent closing the setup window
  setupWindow.on('close', (e) => {
    const choice = require('electron').dialog.showMessageBoxSync(setupWindow, {
      type: 'question',
      buttons: ['Yes', 'No'],
      title: 'Confirm',
      message: 'Are you sure you want to cancel the installation?'
    });

    if (choice === 1) {
      e.preventDefault();
    }
  });

  return setupWindow;
};

// Handle IPC messages from the setup window
const setupHandlers = (setupWindow) => {
  // Handle installation completion
  ipcMain.on('installation-complete', (event, launchApp) => {
    if (launchApp) {
      // Launch the main application
      const appPath = process.platform === 'win32'
        ? path.join(process.env.PROGRAMFILES, 'AI Chat', 'AI Chat.exe')
        : '/Applications/AI Chat.app';

      if (fs.existsSync(appPath)) {
        spawn(appPath, [], { detached: true });
      }
    }

    // Close the setup window
    setupWindow.close();
    app.quit();
  });

  // Handle installation cancellation
  ipcMain.on('cancel-installation', () => {
    setupWindow.close();
    app.quit();
  });
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  const setupWindow = createSetupWindow();
  setupHandlers(setupWindow);
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  app.quit();
});
