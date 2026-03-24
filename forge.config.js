const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');

// For macOS notarization
const notarize = async (params) => {
  // Only notarize on Mac OS
  if (process.platform !== 'darwin') {
    return;
  }
  console.log('Notarizing macOS application...');

  // If you have Apple Developer credentials, uncomment and fill these
  // const { appId, appPath } = params;
  // try {
  //   await require('electron-notarize').notarize({
  //     appBundleId: 'com.yourcompany.aichat',
  //     appPath: appPath,
  //     appleId: process.env.APPLE_ID,
  //     appleIdPassword: process.env.APPLE_ID_PASSWORD,
  //     teamId: process.env.APPLE_TEAM_ID
  //   });
  // } catch (error) {
  //   console.error('Error notarizing app:', error);
  // }
};

module.exports = {
  packagerConfig: {
    asar: {
      // Improved ASAR configuration for better protection and compression
      unpack: '*.{node,dll,exe}',
      unpackDir: '{node_modules/sharp,node_modules/better-sqlite3}' // Example for native modules
    },
    icon: './assets/icon', // You'll need to create these icon files
    appBundleId: 'com.yourcompany.commoditiesai',
    appCategoryType: 'public.app-category.productivity',
    // Exclude unnecessary files to reduce size
    ignore: [
      /^\/\.git/,
      /^\/\.vscode/,
      /^\/\.idea/,
      /^\/node_modules\/\.cache/,
      /^\/src\/.*\.map$/,
      /^\/dist/,
      /^\/coverage/,
      /^\/\.nyc_output/,
      /^\/\.eslintrc/,
      /^\/\.prettierrc/,
      /^\/jest\.config/,
      /^\/webpack\.config\.js$/,
      /^\/babel\.config/,
      /^\/tsconfig/,
      /^\/README\.md$/,
      /^\/\.gitignore$/,
      /^\/\.env/,
      /^\/scripts/,
      /^\/assets\/setup/,
      /^\/src\/setup/,
      // Exclude development dependencies
      /node_modules\/@babel/,
      /node_modules\/webpack/,
      /node_modules\/babel-loader/,
      /node_modules\/css-loader/,
      /node_modules\/style-loader/,
      /node_modules\/cross-env/,
      /node_modules\/@electron-forge/,
      /node_modules\/electron-installer-dmg/,
      /node_modules\/electron-notarize/,
    ],
    // Only include English locale to reduce size significantly
    extraResource: [],
    // Prune node_modules to remove dev dependencies
    prune: true,
    osxSign: {
      identity: 'Developer ID Application: Your Company', // Replace with your identity
      hardenedRuntime: true,
      entitlements: 'entitlements.plist',
      'entitlements-inherit': 'entitlements.plist',
      'signature-flags': 'library'
    },
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    },
    // For Windows code signing
    win32metadata: {
      CompanyName: 'Kalyalabs',
      FileDescription: 'Commodities AI Application by Kalya Labs',
      OriginalFilename: 'Commodities AI.exe',
      ProductName: 'Commodities AI',
      InternalName: 'Commodities AI'
    },
    // Hooks for additional processing
    afterSign: notarize
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'AI_Chat',
        authors: 'Your Company',
        description: 'Commodities AI Application by Kalya Labs',
        iconUrl: 'https://yourwebsite.com/icon.ico', // URL to your icon (for installer)
        setupIcon: path.resolve(__dirname, 'assets', 'icon.ico'), // Local path to icon
        // loadingGif is optional and we're removing it to avoid the error
        certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
        certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-dmg', // For macOS DMG installer
      config: {
        icon: path.resolve(__dirname, 'assets', 'icon.icns'),
        background: path.resolve(__dirname, 'assets', 'dmg-background.png'),
        format: 'ULFO'
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Your Company',
          homepage: 'https://yourwebsite.com'
        }
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          maintainer: 'Your Company',
          homepage: 'https://yourwebsite.com'
        }
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
