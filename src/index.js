const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const UpdateManager = require('./services/updateManager');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Create a named mutex so Inno Setup can detect the running app
// and close it during silent updates (matches AppMutex in inno-setup.iss)
if (process.platform === 'win32') {
  app.setAppUserModelId('com.kalyalabs.commoditiesai');
}
// The app name used as the window title is how Inno's CloseApplications finds us.
// The AppMutex 'CommoditiesAI_SingleInstance' is checked by Inno Setup.

let mainWindow = null;
let updateManager = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Only open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Initialize the auto-update manager
  updateManager = new UpdateManager(mainWindow);
  updateManager.startPeriodicChecks();

  mainWindow.on('closed', () => {
    if (updateManager) {
      updateManager.destroy();
      updateManager = null;
    }
    mainWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
