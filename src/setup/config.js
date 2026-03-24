// Setup configuration
module.exports = {
  // Application information
  appInfo: {
    name: 'Commodities AI',
    version: '1.0.0',
    description: 'Commodities AI Application by Kalya Labs',
    publisher: 'Kalya Labs',
    website: 'https://kalyalabs.com',
    copyright: `© ${new Date().getFullYear()} Kalya Labs. All rights reserved.`,
    supportEmail: 'support@kalyalabs.com',
  },

  // Setup screens configuration
  screens: {
    welcome: {
      title: 'Welcome to Commodities AI by Kalya Labs',
      subtitle: 'Your personal AI assistant',
      description: 'Commodities AI connects you to quickly generate charts related to your favourite commodities.',
    },

    license: {
      title: 'License Agreement',
      subtitle: 'Please review and accept the terms',
      // The actual license text is in a separate file
    },

    privacy: {
      title: 'Privacy Policy',
      subtitle: 'How we handle your data',
      // The actual privacy policy text is in a separate file
    },

    destination: {
      title: 'Choose Installation Location',
      subtitle: 'Select where you want to install Commodities AI',
      defaultLocation: {
        windows: 'C:\\Program Files\\Commodities AI',
        mac: '/Applications/Commodities AI.app',
      },
    },

    components: {
      title: 'Choose Components',
      subtitle: 'Select which features you want to install',
      options: [
        {
          id: 'core',
          name: 'Core Application',
          description: 'The main Commodities AI application',
          required: true,
          selected: true,
        },
        {
          id: 'desktop-shortcut',
          name: 'Desktop Shortcut',
          description: 'Create a shortcut on your desktop',
          required: false,
          selected: true,
        },
        {
          id: 'start-menu',
          name: 'Start Menu Shortcut',
          description: 'Add to Start Menu (Windows only)',
          required: false,
          selected: true,
          windowsOnly: true,
        },
        {
          id: 'launch-at-startup',
          name: 'Launch at Startup',
          description: 'Automatically start Commodities AI when you log in',
          required: false,
          selected: false,
        },
      ],
    },

    installing: {
      title: 'Installing Commodities AI by Kalya Labs',
      subtitle: 'Please wait while the application is being installed',
      steps: [
        'Preparing installation...',
        'Copying files...',
        'Creating shortcuts...',
        'Registering application...',
        'Finalizing installation...',
      ],
    },

    finish: {
      title: 'Installation Complete',
      subtitle: 'Commodities AI has been successfully installed',
      launchOption: 'Launch Commodities AI now',
    },
  },
};
