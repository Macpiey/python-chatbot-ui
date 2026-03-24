import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Line } from 'react-chartjs-2';
import { FiMaximize2, FiBarChart2, FiCopy } from 'react-icons/fi';
import ChartModal from './ChartModal';
import DynamicChartRenderer from './DynamicChartRenderer';
import { copyManager } from './GlobalCopyOverlay';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const EnhancedMessage = ({ message, formatTime }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [useEnhancedChart, setUseEnhancedChart] = useState(false);
  const messageRef = useRef(null); // Default to backend charts
  const [showCopyButton, setShowCopyButton] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [buttonPosition, setButtonPosition] = useState({ top: 10, right: 10 });
  const componentId = useMemo(() => `enhanced-message-${message.id}`, [message.id]);

  // Function to calculate optimal button position based on selection
  const calculateButtonPosition = (selection) => {
    if (!selection.rangeCount || !messageRef.current) {
      return { top: 10, right: 10 };
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const messageRect = messageRef.current.getBoundingClientRect();

      // Calculate position relative to the message container
      const relativeTop = rect.top - messageRect.top;
      const relativeRight = messageRect.right - rect.right;

      // Ensure button doesn't go outside message bounds
      const minTop = 10;
      const minRight = 10;
      const maxTop = messageRect.height - 40; // Account for button height
      const maxRight = messageRect.width - 80; // Account for button width

      let finalTop = Math.max(minTop, Math.min(maxTop, relativeTop - 5)); // 5px above selection
      let finalRight = Math.max(minRight, Math.min(maxRight, relativeRight + 10)); // 10px from selection end

      // If selection is near the top, position button below it
      if (relativeTop < 50) {
        finalTop = Math.min(maxTop, relativeTop + rect.height + 5);
      }

      // If selection is near the right edge, position button to the left
      if (relativeRight < 100) {
        finalRight = Math.min(maxRight, messageRect.width - rect.left + messageRect.left - 90);
      }

      return {
        top: finalTop,
        right: finalRight
      };
    } catch (error) {
      console.error('Error calculating button position:', error);
      return { top: 10, right: 10 };
    }
  };

  // Text selection with inline copy button
  useEffect(() => {
    let selectionTimeout;

    const handleSelectionChange = () => {
      // Clear any existing timeout
      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }

      // Add a small delay to avoid hiding the button during selection
      selectionTimeout = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (!text || selection.rangeCount === 0 || !messageRef.current) {
          // Only hide if we're not currently showing a button for this component
          if (copyManager.isActive(componentId)) {
            setShowCopyButton(false);
            setSelectedText('');
            copyManager.hide();
          }
          return;
        }

        const range = selection.getRangeAt(0);

        // Check if selection is within our message
        const isWithinMessage = messageRef.current.contains(range.commonAncestorContainer) ||
                               messageRef.current.contains(range.startContainer) ||
                               messageRef.current.contains(range.endContainer);

        if (!isWithinMessage) {
          // Only hide if we're currently showing a button for this component
          if (copyManager.isActive(componentId)) {
            setShowCopyButton(false);
            setSelectedText('');
            copyManager.hide();
          }
          return;
        }

        // Calculate optimal button position
        const position = calculateButtonPosition(selection);

        // Show copy button for this component
        setSelectedText(text);
        setButtonPosition(position);
        setShowCopyButton(true);
        copyManager.show(componentId, text);
      }, 100); // Small delay to avoid flickering during selection
    };

    const handleMouseUp = () => {
      // Check selection immediately on mouse up (when user finishes selecting)
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (text && selection.rangeCount > 0 && messageRef.current) {
          const range = selection.getRangeAt(0);
          const isWithinMessage = messageRef.current.contains(range.commonAncestorContainer) ||
                                 messageRef.current.contains(range.startContainer) ||
                                 messageRef.current.contains(range.endContainer);

          if (isWithinMessage) {
            // Calculate optimal button position
            const position = calculateButtonPosition(selection);

            setSelectedText(text);
            setButtonPosition(position);
            setShowCopyButton(true);
            copyManager.show(componentId, text);
          }
        }
      }, 50);
    };

    const handleClickOutside = (event) => {
      // Hide copy button if clicking outside the message (but not on the copy button itself)
      if (!messageRef.current?.contains(event.target) && !event.target.closest('.inline-copy-button')) {
        setShowCopyButton(false);
        setSelectedText('');
        copyManager.hide();
      }
    };

    // Subscribe to copy manager state changes
    const unsubscribe = copyManager.subscribe((state) => {
      const isActiveForThisComponent = state.activeComponentId === componentId;
      setShowCopyButton(isActiveForThisComponent);
      if (isActiveForThisComponent) {
        setSelectedText(state.selectedText);
      } else {
        setSelectedText('');
      }
    });

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleClickOutside);

    return () => {
      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClickOutside);
      unsubscribe();
    };
  }, [componentId]);

  const handleCopy = async () => {
    if (!selectedText) return;

    try {
      await navigator.clipboard.writeText(selectedText);
      setShowCopyButton(false);
      setSelectedText('');
      copyManager.hide();
      window.getSelection().removeAllRanges();
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };



  // We can choose to use backend chart code OR our custom charts
  // Currently defaulting to backend charts with fallback to custom

  // Render data table
  const renderDataTable = (rawData) => {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      return null;
    }

    const headers = Object.keys(rawData[0]);

    return (
      <div className="data-table-container">
        <h4>Data Summary</h4>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {headers.map(header => (
                  <th key={header}>{header.replace(/_/g, ' ').toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rawData.slice(0, 10).map((row, index) => (
                <tr key={index}>
                  {headers.map(header => (
                    <td key={header}>
                      {row[header]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rawData.length > 10 && (
            <div className="data-table-footer">
              Showing 10 of {rawData.length} records
            </div>
          )}
        </div>
      </div>
    );
  };

  // Simple fallback chart renderer using the raw data
  const renderFallbackChart = (rawData) => {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      return null;
    }

    // Sort data by month
    const sortedData = [...rawData].sort((a, b) => a.month - b.month);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Hide dots if there are more than 100 data points
    const shouldShowDots = sortedData.length <= 100;

    // Calculate X-axis label interval for better spacing
    const getXAxisMaxTicks = (dataLength) => {
      if (dataLength <= 15) return dataLength; // Show all labels
      if (dataLength <= 30) return 15; // Show ~15 labels
      if (dataLength <= 60) return 20; // Show ~20 labels
      if (dataLength <= 120) return 20; // Show ~20 labels
      if (dataLength <= 200) return 15; // Show ~15 labels
      return 12; // Show ~12 labels for very large datasets
    };

    const maxXAxisTicks = getXAxisMaxTicks(sortedData.length);

    const chartData = {
      labels: sortedData.map(item => months[item.month - 1]),
      datasets: [
        {
          label: 'Rainfall (mm)',
          data: sortedData.map(item => item.rainfall),
          borderColor: 'rgb(139, 69, 19)',
          backgroundColor: 'rgba(139, 69, 19, 0.1)',
          tension: 0.1,
          fill: true,
          pointRadius: shouldShowDots ? 3 : 0,
          pointHoverRadius: shouldShowDots ? 5 : 0
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: `Monthly Rainfall in ${sortedData[0]?.state || 'Unknown'} (${sortedData[0]?.year || 'Unknown'})`,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Rainfall (mm)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Month'
          },
          ticks: {
            maxTicksLimit: maxXAxisTicks,
            maxRotation: 35,
            minRotation: 0
          }
        }
      }
    };

    return (
      <div className="chart-container">
        <div style={{ height: '400px', width: '100%' }}>
          <Line data={chartData} options={options} />
        </div>
      </div>
    );
  };

  return (
    <div
      ref={messageRef}
      className={`message-bubble ${
        message.sender === 'user'
          ? 'user-bubble'
          : message.sender === 'system'
            ? 'system-bubble'
            : 'ai-bubble'
      } ${message.type === 'structured' ? 'structured-message' : 'markdown'} ${
        message.type === 'stop' ? 'stop-message' : ''
      }`}
      style={{ position: 'relative' }}
    >
      {/* Text content */}
      {message.text && (
        <div className="message-text">
          <ReactMarkdown>{message.text}</ReactMarkdown>
        </div>
      )}



      {/* Chart content - Backend by default with Enhanced option */}
      {(message.chart || message.rawData) && (
        <div className="message-chart">
          {!useEnhancedChart ? (
            /* Default: Backend Chart */
            <div>
              <div className="chart-header">
                <div className="chart-title">
                  <FiBarChart2 className="chart-icon" />
                  <h4>Data Visualization</h4>
                </div>
                <div className="chart-actions">
                  <button
                    className="chart-enhance-icon-btn"
                    onClick={() => setUseEnhancedChart(true)}
                    title="Enhanced"
                  >
                    ✨
                  </button>
                </div>
              </div>
              {message.chart ? (
                <DynamicChartRenderer
                  chartCode={message.chart}
                  rawData={message.rawData}
                />
              ) : (
                message.rawData && renderFallbackChart(message.rawData)
              )}
            </div>
          ) : (
            /* Enhanced: Our Custom Chart with Advanced Features */
            <div>
              <div className="chart-header">
                <div className="chart-title">
                  <FiBarChart2 className="chart-icon" />
                  <h4>Enhanced Data Visualization</h4>
                </div>
                <div className="chart-actions">
                  <button
                    className="chart-standard-icon-btn"
                    onClick={() => setUseEnhancedChart(false)}
                    title="Standard"
                  >
                    📊
                  </button>
                  <button
                    className="chart-expand-icon-btn"
                    onClick={() => setIsModalOpen(true)}
                    title="Full Screen"
                  >
                    <FiMaximize2 />
                  </button>
                </div>
              </div>
              {message.rawData && renderFallbackChart(message.rawData)}
            </div>
          )}
        </div>
      )}

      {/* Raw data table */}
      {message.rawData && renderDataTable(message.rawData)}

      {/* Inline Copy Button */}
      {showCopyButton && (
        <button
          className="inline-copy-button"
          onClick={handleCopy}
          title="Copy selected text"
          style={{
            top: `${buttonPosition.top}px`,
            right: `${buttonPosition.right}px`
          }}
        >
          <FiCopy className="copy-icon" />
          Copy
        </button>
      )}

      {/* Timestamp */}
      <div className="message-timestamp">{formatTime(message.timestamp)}</div>

      {/* Chart Modal */}
      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        rawData={message.rawData}
        title="Monthly Rainfall Analysis"
      />
    </div>
  );
};

export default React.memo(EnhancedMessage);
