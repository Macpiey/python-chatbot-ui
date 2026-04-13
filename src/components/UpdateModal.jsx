import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiRefreshCw, FiAlertCircle } from 'react-icons/fi';

/**
 * Discord-style auto-update overlay.
 * 
 * Flow is fully automatic - no user interaction needed:
 *   update detected → download starts → progress bar → install → app restarts
 * 
 * The only user action is "Retry" on error.
 */

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const UpdateModal = ({ darkMode }) => {
  const [updateState, setUpdateState] = useState('idle');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({ progress: 0, receivedBytes: 0, totalBytes: 0 });
  const [errorInfo, setErrorInfo] = useState(null);
  const [currentVersion, setCurrentVersion] = useState('');
  const hasTriggeredDownload = useRef(false);
  const hasTriggeredInstall = useRef(false);

  // Auto-trigger download when update is available
  const triggerDownload = useCallback(() => {
    if (hasTriggeredDownload.current) return;
    hasTriggeredDownload.current = true;
    console.log('[UpdateModal] Auto-triggering download');
    if (window.updater) {
      window.updater.downloadUpdate();
    }
  }, []);

  // Auto-trigger install when download is complete
  const triggerInstall = useCallback(() => {
    if (hasTriggeredInstall.current) return;
    hasTriggeredInstall.current = true;
    console.log('[UpdateModal] Auto-triggering install');
    if (window.updater) {
      window.updater.installUpdate();
    }
  }, []);

  useEffect(() => {
    if (!window.updater) {
      console.log('[UpdateModal] window.updater not available');
      return;
    }

    console.log('[UpdateModal] Component mounted, setting up auto-update listeners');

    window.updater.getCurrentVersion().then((version) => {
      console.log('[UpdateModal] Current version:', version);
      setCurrentVersion(version);
    });

    // Handle update found - either from cache or live event
    const handleUpdateAvailable = (data) => {
      console.log('[UpdateModal] Update available:', data.latestVersion);
      setUpdateInfo(data);
      setUpdateState('available');
    };

    // Check cached result first (fixes race condition with login screen)
    window.updater.getLastResult().then((cachedResult) => {
      if (cachedResult && cachedResult.updateAvailable) {
        console.log('[UpdateModal] Cached update found: v' + cachedResult.latestVersion);
        handleUpdateAvailable(cachedResult);
      }
    });

    // Listen for live events
    window.updater.onUpdateAvailable(handleUpdateAvailable);

    window.updater.onStatus((data) => {
      console.log('[UpdateModal] Status:', data.status);
      if (data.status === 'no-update') {
        setUpdateState('no-update');
      }
    });

    window.updater.onDownloadStart((data) => {
      console.log('[UpdateModal] Download started:', data.fileName);
      setUpdateState('downloading');
      setDownloadProgress({ progress: 0, receivedBytes: 0, totalBytes: data.fileSize });
    });

    window.updater.onDownloadProgress((data) => {
      setDownloadProgress({
        progress: data.progress,
        receivedBytes: data.receivedBytes,
        totalBytes: data.totalBytes,
      });
    });

    window.updater.onDownloadComplete(() => {
      console.log('[UpdateModal] Download complete - auto-installing');
      setUpdateState('downloaded');
      setDownloadProgress((prev) => ({ ...prev, progress: 100 }));
    });

    window.updater.onInstalling(() => {
      console.log('[UpdateModal] Installing - app will restart');
      setUpdateState('installing');
    });

    window.updater.onError((data) => {
      console.error('[UpdateModal] Error:', data);
      setErrorInfo(data);
      setUpdateState('error');
      // Reset triggers so retry can work
      hasTriggeredDownload.current = false;
      hasTriggeredInstall.current = false;
    });

    return () => {
      if (window.updater) {
        window.updater.removeAllListeners();
      }
    };
  }, []);

  // Auto-trigger download when state becomes 'available'
  useEffect(() => {
    if (updateState === 'available') {
      // Small delay so the UI renders before download starts
      const timer = setTimeout(() => triggerDownload(), 800);
      return () => clearTimeout(timer);
    }
  }, [updateState, triggerDownload]);

  // Auto-trigger install when state becomes 'downloaded'
  useEffect(() => {
    if (updateState === 'downloaded') {
      // Small delay to show 100% completion before installing
      const timer = setTimeout(() => triggerInstall(), 1200);
      return () => clearTimeout(timer);
    }
  }, [updateState, triggerInstall]);

  const handleRetry = useCallback(() => {
    console.log('[UpdateModal] Retry clicked');
    setErrorInfo(null);
    setUpdateState('idle');
    if (window.updater) {
      window.updater.checkForUpdate();
    }
  }, []);

  // Don't render if no update needed
  if (updateState === 'idle' || updateState === 'no-update') {
    return null;
  }

  // Compute display values
  const isDownloading = updateState === 'downloading';
  const isDownloaded = updateState === 'downloaded';
  const isInstalling = updateState === 'installing';
  const isError = updateState === 'error';
  const isAvailable = updateState === 'available';
  const showProgress = isDownloading || isDownloaded || isInstalling;

  const statusText = isAvailable
    ? 'Update found - starting download...'
    : isDownloading
      ? `Downloading update... ${downloadProgress.progress}%`
      : isDownloaded
        ? 'Download complete - installing...'
        : isInstalling
          ? 'Installing update - restarting...'
          : '';

  return (
    <div style={styles.overlay(darkMode)}>
      <div style={styles.card(darkMode)}>

        {/* Error state */}
        {isError ? (
          <>
            <div style={styles.errorIcon}>
              <FiAlertCircle size={24} color="#fff" />
            </div>
            <div style={styles.statusText(darkMode)}>Update failed</div>
            <div style={styles.errorDetail(darkMode)}>
              {errorInfo?.message || 'Something went wrong'}
              {errorInfo?.detail && (
                <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', opacity: 0.7 }}>
                  {errorInfo.detail}
                </span>
              )}
            </div>
            <button style={styles.retryButton} onClick={handleRetry}>
              Try Again
            </button>
          </>
        ) : (
          <>
            {/* Spinner / App icon */}
            <div style={styles.spinnerContainer}>
              <svg style={styles.spinnerTrack(darkMode)} viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
              </svg>
              {(isAvailable || isDownloading) && (
                <svg style={styles.spinnerProgress} viewBox="0 0 48 48">
                  <circle
                    cx="24" cy="24" r="20"
                    fill="none"
                    strokeWidth="3"
                    stroke="url(#progressGrad)"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - (isDownloading ? downloadProgress.progress / 100 : 0))}`}
                    style={{ transition: 'stroke-dashoffset 0.3s ease', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                  />
                  <defs>
                    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
              )}
              {(isDownloaded || isInstalling) && (
                <svg style={styles.spinnerProgress} viewBox="0 0 48 48">
                  <circle
                    cx="24" cy="24" r="20"
                    fill="none"
                    strokeWidth="3"
                    stroke="#10b981"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset="0"
                  />
                </svg>
              )}
              <div style={styles.spinnerInner}>
                <FiRefreshCw
                  size={20}
                  color={darkMode ? '#a78bfa' : '#8b5cf6'}
                  style={{ animation: isInstalling || isAvailable ? 'spin 1s linear infinite' : isDownloading ? 'spin 2s linear infinite' : 'none' }}
                />
              </div>
            </div>

            {/* Version info */}
            {updateInfo && (
              <div style={styles.versionLine(darkMode)}>
                <span style={{ opacity: 0.5 }}>v{currentVersion}</span>
                <span style={{ margin: '0 8px', opacity: 0.3 }}>&rarr;</span>
                <span style={{ color: '#8b5cf6', fontWeight: '600' }}>v{updateInfo.latestVersion}</span>
              </div>
            )}

            {/* Status text */}
            <div style={styles.statusText(darkMode)}>{statusText}</div>

            {/* Progress bar */}
            {showProgress && (
              <div style={styles.progressContainer}>
                <div style={styles.progressBarBg(darkMode)}>
                  <div style={styles.progressBarFill(downloadProgress.progress, isDownloaded || isInstalling)} />
                </div>
                {isDownloading && downloadProgress.totalBytes > 0 && (
                  <div style={styles.progressDetail(darkMode)}>
                    {formatBytes(downloadProgress.receivedBytes)} / {formatBytes(downloadProgress.totalBytes)}
                  </div>
                )}
              </div>
            )}

            {/* Subtle installing message */}
            {isInstalling && (
              <div style={styles.subText(darkMode)}>Please don't close the app</div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

const styles = {
  overlay: (dark) => ({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: dark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    animation: 'fadeIn 0.3s ease-out',
  }),

  card: (dark) => ({
    background: dark ? '#1f2937' : '#ffffff',
    borderRadius: '20px',
    padding: '40px 48px',
    width: '380px',
    maxWidth: '90vw',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxShadow: dark
      ? '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(139, 92, 246, 0.15)'
      : '0 25px 60px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(139, 92, 246, 0.08)',
    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  }),

  spinnerContainer: {
    position: 'relative',
    width: '56px',
    height: '56px',
    marginBottom: '20px',
  },

  spinnerTrack: (dark) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  }),

  spinnerProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },

  spinnerInner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  versionLine: (dark) => ({
    fontSize: '13px',
    color: dark ? '#9ca3af' : '#6b7280',
    marginBottom: '8px',
    fontVariantNumeric: 'tabular-nums',
  }),

  statusText: (dark) => ({
    fontSize: '15px',
    fontWeight: '600',
    color: dark ? '#f3f4f6' : '#111827',
    marginBottom: '16px',
    letterSpacing: '-0.01em',
    animation: 'pulse 2s ease-in-out infinite',
  }),

  progressContainer: {
    width: '100%',
    marginBottom: '8px',
  },

  progressBarBg: (dark) => ({
    width: '100%',
    height: '6px',
    background: dark ? '#374151' : '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
  }),

  progressBarFill: (progress, complete) => ({
    height: '100%',
    width: `${Math.max(progress, complete ? 100 : 0)}%`,
    background: complete
      ? 'linear-gradient(90deg, #059669, #10b981)'
      : 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
    backgroundSize: complete ? '100%' : '200% 100%',
    animation: complete ? 'none' : 'shimmer 1.5s linear infinite',
  }),

  progressDetail: (dark) => ({
    fontSize: '12px',
    color: dark ? '#6b7280' : '#9ca3af',
    marginTop: '6px',
    fontVariantNumeric: 'tabular-nums',
  }),

  subText: (dark) => ({
    fontSize: '12px',
    color: dark ? '#6b7280' : '#9ca3af',
    marginTop: '4px',
    opacity: 0.8,
  }),

  // Error state styles
  errorIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },

  errorDetail: (dark) => ({
    fontSize: '13px',
    color: dark ? '#9ca3af' : '#6b7280',
    marginBottom: '20px',
    lineHeight: '1.5',
  }),

  retryButton: {
    padding: '10px 28px',
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
  },
};

export default UpdateModal;
