// Preload script
const { contextBridge, ipcRenderer } = require('electron');

// Whitelisted channels for general app communication
const validSendChannels = ['toMain'];
const validReceiveChannels = ['fromMain'];

// Whitelisted channels for auto-update system
const updateReceiveChannels = [
  'update:available',
  'update:status',
  'update:download-start',
  'update:download-progress',
  'update:download-complete',
  'update:installing',
  'update:error',
  'update:dismissed',
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    send: (channel, data) => {
      if (validSendChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    receive: (channel, func) => {
      if (validReceiveChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    }
  }
);

// Expose auto-update API separately for clean separation
contextBridge.exposeInMainWorld(
  'updater', {
    // Invoke actions (renderer → main, with response)
    checkForUpdate: () => ipcRenderer.invoke('update:check'),
    downloadUpdate: () => ipcRenderer.invoke('update:download'),
    installUpdate: () => ipcRenderer.invoke('update:install'),
    dismissUpdate: () => ipcRenderer.invoke('update:dismiss'),
    getCurrentVersion: () => ipcRenderer.invoke('update:get-current-version'),
    getLastResult: () => ipcRenderer.invoke('update:get-last-result'),

    // Listen for events (main → renderer)
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update:available', (event, data) => callback(data));
    },
    onDownloadStart: (callback) => {
      ipcRenderer.on('update:download-start', (event, data) => callback(data));
    },
    onDownloadProgress: (callback) => {
      ipcRenderer.on('update:download-progress', (event, data) => callback(data));
    },
    onDownloadComplete: (callback) => {
      ipcRenderer.on('update:download-complete', (event, data) => callback(data));
    },
    onInstalling: (callback) => {
      ipcRenderer.on('update:installing', (event, data) => callback(data));
    },
    onError: (callback) => {
      ipcRenderer.on('update:error', (event, data) => callback(data));
    },
    onStatus: (callback) => {
      ipcRenderer.on('update:status', (event, data) => callback(data));
    },

    // Remove all update listeners (for cleanup)
    removeAllListeners: () => {
      updateReceiveChannels.forEach((channel) => {
        ipcRenderer.removeAllListeners(channel);
      });
    },
  }
);

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
});
