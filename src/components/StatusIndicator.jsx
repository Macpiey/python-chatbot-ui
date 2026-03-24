import React from 'react';

/**
 * StatusIndicator - DeepSeek-style status message display
 * Shows dynamic status messages from the API during AI response generation
 * Features: Plain white background, italic text, minimal design
 */
const StatusIndicator = ({ statusMessage = "", isActive = false, className = "" }) => {
  // Don't render if not active
  if (!isActive) {
    return null;
  }

  // Show default loading message if no status message yet
  const displayMessage = statusMessage || "Thinking...";

  return (
    <div className={`status-indicator ${className}`}>
      <div className="status-content">
        <span className="status-text">{displayMessage}</span>
      </div>
    </div>
  );
};

export default StatusIndicator;

