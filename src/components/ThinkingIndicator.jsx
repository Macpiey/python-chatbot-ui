import React, { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { RiSparkling2Fill } from 'react-icons/ri';

/**
 * ThinkingIndicator - DeepThink/ChatGPT-style thinking display
 * Shows status messages (replacing each other with gradient flash) and thinking content (accumulated)
 * Features: Collapsible, gradient loading animation, time tracking
 */
const ThinkingIndicator = ({
  statusMessage = "",
  thinkingContent = [],
  isActive = false,
  isComplete = false,
  thinkingDuration = 0,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayedStatus, setDisplayedStatus] = useState("");

  // Update displayed status with animation trigger
  useEffect(() => {
    if (statusMessage && statusMessage !== displayedStatus) {
      setDisplayedStatus(statusMessage);
    }
  }, [statusMessage]);

  // Auto-expand when thinking content first appears
  useEffect(() => {
    if (thinkingContent && thinkingContent.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [thinkingContent.length]);

  // Don't render if not active and not complete
  if (!isActive && !isComplete) {
    return null;
  }

  // Format duration for display
  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  // Determine header text
  const getHeaderText = () => {
    if (isComplete && thinkingDuration > 0) {
      return `Thought for ${formatDuration(thinkingDuration)}`;
    }
    if (displayedStatus) {
      return displayedStatus;
    }
    return "Thinking...";
  };

  // Check if we have thinking content to show
  const hasThinkingContent = thinkingContent && thinkingContent.length > 0;

  return (
    <div className={`thinking-indicator ${className} ${isComplete ? 'complete' : 'active'}`}>
      <div
        className={`thinking-header ${hasThinkingContent ? 'clickable' : ''}`}
        onClick={() => hasThinkingContent && setIsExpanded(!isExpanded)}
      >
        <div className="thinking-header-content">
          <RiSparkling2Fill className="thinking-icon" />
          <span className={`thinking-header-text ${!isComplete && displayedStatus ? 'animating' : ''}`}>
            {getHeaderText()}
          </span>
        </div>
        {hasThinkingContent && (
          <button className="thinking-toggle-btn" aria-label={isExpanded ? "Collapse" : "Expand"}>
            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </button>
        )}
      </div>

      {/* Thinking content - only show when expanded and has content */}
      {isExpanded && hasThinkingContent && (
        <div className="thinking-content">
          {thinkingContent.map((item, index) => (
            <div key={index} className="thinking-paragraph">
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThinkingIndicator;

