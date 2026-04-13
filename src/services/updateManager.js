/**
 * Update Manager - Electron Main Process
 * 
 * Handles checking for updates via GitHub Releases API,
 * downloading the installer with progress, and launching it.
 */
const { app, ipcMain, BrowserWindow } = require('electron');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const GITHUB_OWNER = 'Macpiey';
const GITHUB_REPO = 'python-chatbot-ui';
const RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // Check every 1 hour

class UpdateManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.downloadPath = null;
    this.isDownloading = false;
    this.currentVersion = app.getVersion();
    this.checkIntervalId = null;
    this.lastUpdateResult = null; // Cache last result for late subscribers

    console.log('[UpdateManager] Initialized');
    console.log('[UpdateManager] Current app version:', this.currentVersion);

    this._registerIpcHandlers();
  }

  /**
   * Register IPC handlers for renderer communication
   */
  _registerIpcHandlers() {
    ipcMain.handle('update:check', () => {
      console.log('[UpdateManager] IPC: update:check called by renderer');
      return this.checkForUpdate();
    });
    ipcMain.handle('update:download', () => {
      console.log('[UpdateManager] IPC: update:download called by renderer');
      return this.downloadUpdate();
    });
    ipcMain.handle('update:install', () => {
      console.log('[UpdateManager] IPC: update:install called by renderer');
      return this.installUpdate();
    });
    ipcMain.handle('update:dismiss', () => {
      console.log('[UpdateManager] IPC: update:dismiss called by renderer');
      return this.dismissUpdate();
    });
    ipcMain.handle('update:get-current-version', () => {
      console.log('[UpdateManager] IPC: get-current-version → ', this.currentVersion);
      return this.currentVersion;
    });
    // Allow renderer to get the last cached update result (for late subscribers)
    ipcMain.handle('update:get-last-result', () => {
      console.log('[UpdateManager] IPC: get-last-result →', this.lastUpdateResult ? `v${this.lastUpdateResult.latestVersion}, updateAvailable=${this.lastUpdateResult.updateAvailable}` : 'null');
      return this.lastUpdateResult;
    });
  }

  /**
   * Start periodic update checks
   */
  startPeriodicChecks() {
    console.log('[UpdateManager] Starting periodic update checks (interval: 1h, first check in 5s)');
    // Check on launch (after a short delay to let the app load)
    setTimeout(() => this.checkForUpdate(), 5000);

    // Then check periodically
    this.checkIntervalId = setInterval(() => {
      console.log('[UpdateManager] Periodic update check triggered');
      this.checkForUpdate();
    }, UPDATE_CHECK_INTERVAL);
  }

  /**
   * Stop periodic update checks
   */
  stopPeriodicChecks() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /**
   * Check GitHub Releases API for updates
   */
  async checkForUpdate() {
    console.log('[UpdateManager] Checking for updates...');
    console.log('[UpdateManager] Current version:', this.currentVersion);

    try {
      const releaseData = await this._fetchLatestRelease();

      if (!releaseData || !releaseData.tag_name) {
        console.log('[UpdateManager] No release data found (null or no tag_name)');
        this._sendToRenderer('update:status', {
          status: 'no-update',
          currentVersion: this.currentVersion,
        });
        return { updateAvailable: false };
      }

      // Parse version from tag (remove leading 'v' if present)
      const latestVersion = releaseData.tag_name.replace(/^v/, '');

      console.log('[UpdateManager] Latest release version:', latestVersion);
      console.log('[UpdateManager] Current app version:', this.currentVersion);

      const updateAvailable = this._compareVersions(latestVersion, this.currentVersion) > 0;

      console.log('[UpdateManager] Update available:', updateAvailable);

      // Find the .exe asset
      const exeAsset = releaseData.assets
        ? releaseData.assets.find(
            (a) => a.name.endsWith('.exe') && a.name.includes('Setup')
          )
        : null;

      console.log('[UpdateManager] Installer asset found:', exeAsset ? `${exeAsset.name} (${(exeAsset.size / 1024 / 1024).toFixed(1)} MB)` : 'NONE');

      const result = {
        updateAvailable,
        currentVersion: this.currentVersion,
        latestVersion,
        releaseNotes: releaseData.body || '',
        releaseDate: releaseData.published_at || '',
        downloadUrl: exeAsset ? exeAsset.browser_download_url : null,
        fileSize: exeAsset ? exeAsset.size : 0,
        fileName: exeAsset ? exeAsset.name : '',
      };

      // Cache the result so late-mounting UI can pick it up
      this.lastUpdateResult = result;

      if (updateAvailable) {
        console.log('[UpdateManager] Sending update:available to renderer');
        this._sendToRenderer('update:available', result);
      } else {
        console.log('[UpdateManager] No update needed, sending update:status no-update');
        this._sendToRenderer('update:status', {
          status: 'no-update',
          currentVersion: this.currentVersion,
        });
      }

      return result;
    } catch (error) {
      console.error('[UpdateManager] Update check FAILED:', error.message);
      console.error('[UpdateManager] Full error:', error);
      this._sendToRenderer('update:error', {
        message: 'Failed to check for updates',
        detail: error.message,
      });
      return { updateAvailable: false, error: error.message };
    }
  }

  /**
   * Download the update installer with progress reporting
   */
  async downloadUpdate() {
    if (this.isDownloading) {
      return { success: false, error: 'Download already in progress' };
    }

    try {
      this.isDownloading = true;

      // Get the latest release info
      const releaseData = await this._fetchLatestRelease();
      const exeAsset = releaseData.assets
        ? releaseData.assets.find(
            (a) => a.name.endsWith('.exe') && a.name.includes('Setup')
          )
        : null;

      if (!exeAsset) {
        throw new Error('No installer found in the latest release');
      }

      // Download to temp directory
      const tempDir = app.getPath('temp');
      this.downloadPath = path.join(tempDir, exeAsset.name);

      this._sendToRenderer('update:download-start', {
        fileName: exeAsset.name,
        fileSize: exeAsset.size,
      });

      await this._downloadFile(
        exeAsset.browser_download_url,
        this.downloadPath,
        exeAsset.size
      );

      this.isDownloading = false;

      this._sendToRenderer('update:download-complete', {
        filePath: this.downloadPath,
        fileName: exeAsset.name,
      });

      return { success: true, filePath: this.downloadPath };
    } catch (error) {
      this.isDownloading = false;
      console.error('Download failed:', error.message);
      this._sendToRenderer('update:error', {
        message: 'Download failed',
        detail: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Launch the downloaded installer and quit the app
   */
  async installUpdate() {
    if (!this.downloadPath || !fs.existsSync(this.downloadPath)) {
      this._sendToRenderer('update:error', {
        message: 'No downloaded update found',
        detail: 'Please download the update first',
      });
      return { success: false };
    }

    try {
      this._sendToRenderer('update:installing', {
        message: 'Launching installer...',
      });

      // Launch the Inno Setup installer fully silently (Discord-style)
      // /VERYSILENT = zero UI from Inno Setup
      // /SUPPRESSMSGBOXES = suppress any message boxes
      // /FORCECLOSEAPPLICATIONS = force close our running app without asking
      // /NORESTART = don't let Inno reboot the system
      // /SP- = suppress the initial "This will install..." prompt
      //
      // The installer will:
      //   1. Force-close this running app (via AppMutex + /FORCECLOSEAPPLICATIONS)
      //   2. Overwrite the files in LOCALAPPDATA
      //   3. Relaunch the app (via [Run] section with IsSilentInstall check)
      //
      // We do NOT call app.quit() ourselves - Inno handles killing the process.
      // This keeps our "Installing..." UI visible until the very last moment.
      console.log('[UpdateManager] Launching silent installer:', this.downloadPath);
      const installer = spawn(this.downloadPath, [
        '/VERYSILENT',
        '/SUPPRESSMSGBOXES',
        '/FORCECLOSEAPPLICATIONS',
        '/NORESTART',
        '/SP-',
      ], {
        detached: true,
        stdio: 'ignore',
      });

      installer.unref();

      // Don't quit - the installer will close us via /FORCECLOSEAPPLICATIONS
      // and relaunch the app via the [Run] section in inno-setup.iss.
      // Keep the "Installing..." overlay visible until Inno terminates our process.

      return { success: true };
    } catch (error) {
      console.error('Install failed:', error.message);
      this._sendToRenderer('update:error', {
        message: 'Failed to launch installer',
        detail: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Dismiss the update notification
   */
  dismissUpdate() {
    this._sendToRenderer('update:dismissed');
    return { success: true };
  }

  /**
   * Fetch the latest release from GitHub API
   */
  _fetchLatestRelease() {
    return new Promise((resolve, reject) => {
      const apiPath = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
      console.log(`[UpdateManager] Fetching: https://api.github.com${apiPath}`);

      const options = {
        hostname: 'api.github.com',
        path: apiPath,
        method: 'GET',
        headers: {
          'User-Agent': 'CommoditiesAI-UpdateChecker',
          Accept: 'application/vnd.github.v3+json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        console.log(`[UpdateManager] GitHub API response status: ${res.statusCode}`);

        if (res.statusCode === 404) {
          console.log('[UpdateManager] No releases found (404)');
          resolve(null);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`GitHub API returned status ${res.statusCode}`));
          return;
        }

        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            console.log(`[UpdateManager] GitHub API response: tag=${parsed.tag_name}, assets=${parsed.assets ? parsed.assets.length : 0}`);
            resolve(parsed);
          } catch (e) {
            console.error('[UpdateManager] Failed to parse response:', data.substring(0, 200));
            reject(new Error('Failed to parse release data'));
          }
        });
      });

      req.on('error', (err) => {
        console.error('[UpdateManager] Request error:', err.message);
        reject(err);
      });
      req.setTimeout(15000, () => {
        console.error('[UpdateManager] Request timed out after 15s');
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.end();
    });
  }

  /**
   * Download a file with progress tracking, following redirects
   */
  _downloadFile(url, destPath, totalSize) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      let receivedBytes = 0;
      let lastProgressUpdate = 0;

      const makeRequest = (requestUrl) => {
        const parsedUrl = new URL(requestUrl);
        const client = parsedUrl.protocol === 'https:' ? https : http;

        const req = client.get(
          requestUrl,
          {
            headers: {
              'User-Agent': 'CommoditiesAI-UpdateChecker',
            },
          },
          (res) => {
            // Handle redirects (GitHub redirects to CDN)
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              makeRequest(res.headers.location);
              return;
            }

            if (res.statusCode !== 200) {
              file.close();
              fs.unlinkSync(destPath);
              reject(new Error(`Download failed with status ${res.statusCode}`));
              return;
            }

            // Use content-length from response if available (more accurate after redirect)
            const actualSize = parseInt(res.headers['content-length'], 10) || totalSize;

            res.on('data', (chunk) => {
              receivedBytes += chunk.length;

              // Throttle progress updates to every 100ms
              const now = Date.now();
              if (now - lastProgressUpdate > 100) {
                lastProgressUpdate = now;
                const progress = actualSize > 0
                  ? Math.round((receivedBytes / actualSize) * 100)
                  : 0;

                this._sendToRenderer('update:download-progress', {
                  receivedBytes,
                  totalBytes: actualSize,
                  progress,
                });
              }
            });

            res.pipe(file);

            file.on('finish', () => {
              file.close();
              // Send final 100% progress
              this._sendToRenderer('update:download-progress', {
                receivedBytes: actualSize,
                totalBytes: actualSize,
                progress: 100,
              });
              resolve();
            });
          }
        );

        req.on('error', (error) => {
          file.close();
          if (fs.existsSync(destPath)) {
            fs.unlinkSync(destPath);
          }
          reject(error);
        });

        req.setTimeout(300000, () => {
          // 5 minute timeout for large downloads
          req.destroy();
          reject(new Error('Download timed out'));
        });
      };

      makeRequest(url);
    });
  }

  /**
   * Send a message to the renderer process
   */
  _sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      console.log(`[UpdateManager] Sending to renderer: ${channel}`);
      this.mainWindow.webContents.send(channel, data);
    } else {
      console.warn(`[UpdateManager] Cannot send ${channel} - window is ${!this.mainWindow ? 'null' : 'destroyed'}`);
    }
  }

  /**
   * Compare two semver strings.
   * Returns > 0 if a > b, 0 if equal, < 0 if a < b
   */
  _compareVersions(a, b) {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA !== numB) return numA - numB;
    }
    return 0;
  }

  /**
   * Clean up resources
   */
  destroy() {
    console.log('[UpdateManager] Destroying...');
    this.stopPeriodicChecks();
    ipcMain.removeHandler('update:check');
    ipcMain.removeHandler('update:download');
    ipcMain.removeHandler('update:install');
    ipcMain.removeHandler('update:dismiss');
    ipcMain.removeHandler('update:get-current-version');
    ipcMain.removeHandler('update:get-last-result');
  }
}

module.exports = UpdateManager;
