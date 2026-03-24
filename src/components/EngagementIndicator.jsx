import React, { useState, useEffect } from 'react';

const EngagementIndicator = ({ isActive = false, className = "" }) => {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);

  // ChatGPT-style engagement messages
  const engagementMessages = [
    "Thinking...",
    "Analyzing your request...",
    "Processing information...",
    "Exploring possibilities...",
    "Gathering insights...",
    "Finalizing thoughts...",
    "Kicking off.."
  ];

  useEffect(() => {
    if (!isActive) {
      setCurrentMessage("");
      setMessageIndex(0);
      return;
    }

    // Start with the first message immediately
    setCurrentMessage(engagementMessages[0]);
    setMessageIndex(0);

    // Set up interval to cycle through messages
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        // If we've reached the last message, stay on it
        if (nextIndex >= engagementMessages.length) {
          setCurrentMessage(engagementMessages[engagementMessages.length - 1]);
          return engagementMessages.length - 1;
        }
        // Otherwise, move to the next message
        setCurrentMessage(engagementMessages[nextIndex]);
        return nextIndex;
      });
    }, 15000); // Change message every 15 seconds

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive || !currentMessage) {
    return null;
  }

  return (
    <div className={`engagement-indicator ${className}`}>
      <div className="engagement-content">
        <div className="engagement-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span className="engagement-text">{currentMessage}</span>
      </div>
    </div>
  );
};

export default EngagementIndicator;
