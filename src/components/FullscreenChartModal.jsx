import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiMaximize2 } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import MarkdownStructuredMessage from './MarkdownStructuredMessage';
import ChartRenderer from './ChartRenderer';

const FullscreenChartModal = ({
  isOpen,
  onClose,
  splitViewData,
  formatTime,
  darkMode = false
}) => {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !splitViewData) {
    return null;
  }

  // Extract text content for sidebar
  const getTextContent = () => {
    if (splitViewData.textContent) {
      return splitViewData.textContent;
    }

    if (splitViewData.fullMessage && splitViewData.fullMessage.text) {
      const messageText = splitViewData.fullMessage.text;

      try {
        // Enhanced parsing to extract summaries from JSON
        const extractSummariesFromText = (text) => {
          const summaries = [];

          // Method 1: Advanced regex to handle complex nested JSON with summary field
          const advancedSummaryRegex = /"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
          let match;

          while ((match = advancedSummaryRegex.exec(text)) !== null) {
            if (match[1]) {
              // Properly unescape the JSON string
              const summary = match[1]
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
                .replace(/\\t/g, '\t')
                .replace(/\\r/g, '\r');
              summaries.push(summary);
            }
          }

          // Method 2: Try to find and parse complete JSON objects with balanced braces
          if (summaries.length === 0) {
            const findBalancedJson = (str) => {
              const results = [];
              let start = -1;
              let braceCount = 0;

              for (let i = 0; i < str.length; i++) {
                if (str[i] === '{') {
                  if (braceCount === 0) start = i;
                  braceCount++;
                } else if (str[i] === '}') {
                  braceCount--;
                  if (braceCount === 0 && start !== -1) {
                    const jsonStr = str.substring(start, i + 1);
                    try {
                      const parsed = JSON.parse(jsonStr);
                      if (parsed.summary && typeof parsed.summary === 'string') {
                        results.push(parsed.summary);
                      }
                    } catch (e) {
                      // Skip invalid JSON
                    }
                    start = -1;
                  }
                }
              }
              return results;
            };

            summaries.push(...findBalancedJson(text));
          }

          return summaries;
        };

        const summaries = extractSummariesFromText(messageText);

        if (summaries.length > 0) {
          return summaries.join('\n\n---\n\n');
        }

        // Fallback: try to extract text that's not JSON
        const textParts = messageText.split(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g)
          .filter(part => part.trim().length > 0)
          .map(part => part.trim());

        if (textParts.length > 0) {
          return textParts.join('\n\n').trim();
        }

        // Last resort: return the original text but try to clean it up
        return messageText.replace(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '').trim() || "No readable analysis text found.";

      } catch (error) {
        console.error('Error parsing message text:', error);
        return "Error parsing analysis text.";
      }
    }

    return "No analysis text available.";
  };

  // Render the modal using a portal to escape the chat container
  return createPortal(
    <div className={`fullscreen-chart-overlay ${darkMode ? 'dark' : ''}`} onClick={onClose}>
      <div className="fullscreen-chart-container" onClick={(e) => e.stopPropagation()}>
        {/* Main chart area */}
        <div className="fullscreen-chart-main">
          <div className="fullscreen-chart-header">
            <div className="fullscreen-chart-title">
              <FiMaximize2 />
              Full Screen Chart View
            </div>
            <button
              className="fullscreen-chart-close"
              onClick={onClose}
              title="Close Full Screen View (ESC)"
            >
              <FiX />
              Close
            </button>
          </div>
          
          <div className="fullscreen-chart-content">
            {splitViewData && splitViewData.messageType === "markdown_structured" ? (
              <MarkdownStructuredMessage
                message={splitViewData.fullMessage}
                formatTime={formatTime}
                chartOnly={true}
                darkMode={darkMode}
              />
            ) : splitViewData && (splitViewData.chartData || splitViewData.rawData) ? (
              <ChartRenderer
                chartString={splitViewData.chartData}
                rawData={splitViewData.rawData}
                message={splitViewData}
                formatTime={formatTime}
                darkMode={darkMode}
              />
            ) : (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}>
                <p>No chart data available</p>
              </div>
            )}
          </div>
        </div>


      </div>
    </div>,
    document.body
  );
};

export default FullscreenChartModal;
