import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Global tracker for animated messages
const animatedMessages = new Set();

const TypewriterText = ({ text, speed = 50, maxDuration = 10000, className = "", enableAnimation = true, animationKey = null }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsComplete(true);
      return;
    }

    // Check if this message has already been animated globally
    const hasBeenAnimated = animationKey && animatedMessages.has(animationKey);

    // If animation is disabled or this content has already been animated, show immediately
    if (!enableAnimation || hasBeenAnimated) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    // Mark this message as animated
    if (animationKey) {
      animatedMessages.add(animationKey);
    }

    setDisplayedText('');
    setIsComplete(false);

    // Calculate speed based on text length and max duration
    const textLength = text.length;
    const calculatedSpeed = Math.max(10, Math.min(speed, maxDuration / textLength));

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < textLength) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, calculatedSpeed);

    return () => clearInterval(interval);
  }, [text, speed, maxDuration, enableAnimation, animationKey]);

  return (
    <div className={`typewriter-container ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedText}</ReactMarkdown>
      {!isComplete && (
        <span className="typewriter-cursor">|</span>
      )}
    </div>
  );
};

export default TypewriterText;
