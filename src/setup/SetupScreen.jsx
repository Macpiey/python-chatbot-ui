import React, { useState, useEffect } from 'react';
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Setup screen component
const SetupScreen = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [licenseText, setLicenseText] = useState('');
  const [privacyText, setPrivacyText] = useState('');
  const [licenseAccepted, setLicenseAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [installPath, setInstallPath] = useState('');
  const [components, setComponents] = useState(config.screens.components.options);
  const [installProgress, setInstallProgress] = useState(0);
  const [currentInstallStep, setCurrentInstallStep] = useState('');
  const [launchAfterInstall, setLaunchAfterInstall] = useState(true);
  const [error, setError] = useState(null);

  // Load license and privacy text
  useEffect(() => {
    try {
      // In a real installer, these would be loaded from the actual files
      // For this example, we'll simulate loading them
      const licenseFilePath = path.join(__dirname, 'license.txt');
      const privacyFilePath = path.join(__dirname, 'privacy.txt');

      if (fs.existsSync(licenseFilePath)) {
        setLicenseText(fs.readFileSync(licenseFilePath, 'utf8'));
      } else {
        setLicenseText('License agreement text would be loaded here.');
      }

      if (fs.existsSync(privacyFilePath)) {
        setPrivacyText(fs.readFileSync(privacyFilePath, 'utf8'));
      } else {
        setPrivacyText('Privacy policy text would be loaded here.');
      }

      // Set default install path based on platform
      const platform = process.platform;
      if (platform === 'win32') {
        setInstallPath(config.screens.destination.defaultLocation.windows);
      } else if (platform === 'darwin') {
        setInstallPath(config.screens.destination.defaultLocation.mac);
      } else {
        setInstallPath('/opt/aichat');
      }
    } catch (err) {
      console.error('Error loading setup files:', err);
      setError('Failed to load setup files. Please try again.');
    }
  }, []);

  // Handle component selection
  const toggleComponent = (id) => {
    setComponents(components.map(comp => {
      if (comp.id === id && !comp.required) {
        return { ...comp, selected: !comp.selected };
      }
      return comp;
    }));
  };

  // Simulate installation process
  const simulateInstallation = () => {
    const steps = config.screens.installing.steps;
    let currentStepIndex = 0;

    const installInterval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        setCurrentInstallStep(steps[currentStepIndex]);
        setInstallProgress(Math.floor((currentStepIndex / steps.length) * 100));
        currentStepIndex++;
      } else {
        clearInterval(installInterval);
        setInstallProgress(100);
        setCurrentInstallStep('Installation complete!');
        setTimeout(() => {
          setCurrentStep(currentStep + 1);
        }, 1000);
      }
    }, 1500);
  };

  // Handle next button click
  const handleNext = () => {
    if (currentStep === 1 && !licenseAccepted) {
      setError('You must accept the license agreement to continue.');
      return;
    }

    if (currentStep === 2 && !privacyAccepted) {
      setError('You must accept the privacy policy to continue.');
      return;
    }

    if (currentStep === 4) {
      // Start installation
      simulateInstallation();
    }

    if (currentStep === 6) {
      // Complete setup
      if (onComplete) {
        onComplete(launchAfterInstall);
      }
      return;
    }

    setCurrentStep(currentStep + 1);
    setError(null);
  };

  // Handle back button click
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  // Handle browse button click for install path
  const handleBrowse = () => {
    // In a real installer, this would open a directory picker
    alert('In a real installer, this would open a directory picker dialog.');
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <div className="setup-screen welcome">
            <h1>{config.screens.welcome.title}</h1>
            <h2>{config.screens.welcome.subtitle}</h2>
            <p>{config.screens.welcome.description}</p>
            <div className="app-info">
              <p><strong>Version:</strong> {config.appInfo.version}</p>
              <p><strong>Publisher:</strong> {config.appInfo.publisher}</p>
              <p>{config.appInfo.copyright}</p>
            </div>
          </div>
        );

      case 1: // License Agreement
        return (
          <div className="setup-screen license">
            <h1>{config.screens.license.title}</h1>
            <h2>{config.screens.license.subtitle}</h2>
            <div className="text-container">
              <pre>{licenseText}</pre>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={licenseAccepted}
                onChange={() => setLicenseAccepted(!licenseAccepted)}
              />
              I accept the terms of the License Agreement
            </label>
          </div>
        );

      case 2: // Privacy Policy
        return (
          <div className="setup-screen privacy">
            <h1>{config.screens.privacy.title}</h1>
            <h2>{config.screens.privacy.subtitle}</h2>
            <div className="text-container">
              <pre>{privacyText}</pre>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={() => setPrivacyAccepted(!privacyAccepted)}
              />
              I accept the Privacy Policy
            </label>
          </div>
        );

      case 3: // Destination Folder
        return (
          <div className="setup-screen destination">
            <h1>{config.screens.destination.title}</h1>
            <h2>{config.screens.destination.subtitle}</h2>
            <div className="path-selector">
              <input
                type="text"
                value={installPath}
                onChange={(e) => setInstallPath(e.target.value)}
              />
              <button onClick={handleBrowse}>Browse...</button>
            </div>
          </div>
        );

      case 4: // Components
        return (
          <div className="setup-screen components">
            <h1>{config.screens.components.title}</h1>
            <h2>{config.screens.components.subtitle}</h2>
            <div className="components-list">
              {components.map(comp => (
                <div key={comp.id} className="component-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={comp.selected}
                      onChange={() => toggleComponent(comp.id)}
                      disabled={comp.required}
                    />
                    <div>
                      <strong>{comp.name}</strong>
                      {comp.required && <span className="required-badge">Required</span>}
                      <p>{comp.description}</p>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      case 5: // Installing
        return (
          <div className="setup-screen installing">
            <h1>{config.screens.installing.title}</h1>
            <h2>{config.screens.installing.subtitle}</h2>
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${installProgress}%` }}
                ></div>
              </div>
              <p className="progress-text">{currentInstallStep}</p>
            </div>
          </div>
        );

      case 6: // Finish
        return (
          <div className="setup-screen finish">
            <h1>{config.screens.finish.title}</h1>
            <h2>{config.screens.finish.subtitle}</h2>
            <p>Thank you for installing Commodities AI by Kalya Labs!</p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={launchAfterInstall}
                onChange={() => setLaunchAfterInstall(!launchAfterInstall)}
              />
              {config.screens.finish.launchOption}
            </label>
          </div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-content">
        {renderStep()}

        {error && <div className="error-message">{error}</div>}

        <div className="setup-buttons">
          {currentStep > 0 && currentStep !== 5 && (
            <button onClick={handleBack} className="back-button">Back</button>
          )}

          {currentStep < 6 && currentStep !== 5 && (
            <button onClick={handleNext} className="next-button">
              {currentStep === 4 ? 'Install' : 'Next'}
            </button>
          )}

          {currentStep === 6 && (
            <button onClick={handleNext} className="finish-button">Finish</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
