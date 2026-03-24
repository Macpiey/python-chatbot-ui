import React, { useState } from 'react';
import { FiMaximize2, FiBarChart2 } from 'react-icons/fi';
import { Line as ChartJSLine } from 'react-chartjs-2';
import ChartModal from './ChartModal';
import DynamicBackendChartRenderer from './DynamicBackendChartRenderer';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartJSTooltip,
  Legend as ChartJSLegend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartJSTooltip,
  ChartJSLegend
);

const ChartRenderer = ({ chartString, rawData, message, formatTime, onFullscreen = null, darkMode = false }) => {
  const [useEnhancedChart, setUseEnhancedChart] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Backend Recharts renderer - renders exactly what backend sends using dynamic renderer
  const renderBackendChart = () => {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      return (
        <div className="chart-error">
          <p>📊 Chart available but no data to display</p>
          <details style={{ marginTop: '10px', fontSize: '12px' }}>
            <summary>🔍 Debug: Show backend chart code</summary>
            <pre style={{
              background: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '11px'
            }}>
              {chartString}
            </pre>
          </details>
        </div>
      );
    }

    try {
      console.log("Rendering backend chart with dynamic renderer");
      console.log("Chart string:", chartString);
      console.log("Raw data:", rawData);

      return (
        <div>
          <DynamicBackendChartRenderer
            chartString={chartString}
            rawData={rawData}
            darkMode={darkMode}
          />
        </div>
      );
    } catch (error) {
      console.error("Error rendering backend chart:", error);
      return (
        <div className="chart-error">
          <p>⚠️ Error rendering backend chart. Please try the enhanced view.</p>
          <details style={{ marginTop: '10px', fontSize: '12px' }}>
            <summary>🔍 Debug: Show backend code</summary>
            <pre style={{
              background: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '11px'
            }}>
              {chartString}
            </pre>
          </details>
        </div>
      );
    }
  };

  // Enhanced Chart.js renderer
  const renderEnhancedChart = () => {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      return <div>No data available for enhanced chart</div>;
    }

    try {
      // Check if this is rainfall comparison data
      const isRainfallComparison = rawData.some(item =>
        item.hasOwnProperty('month') && (
          item.hasOwnProperty('NRT') || item.hasOwnProperty('STANDARD') ||
          item.hasOwnProperty('nrt_rainfall') || item.hasOwnProperty('standard_rainfall')
        )
      );

      if (isRainfallComparison) {
        // Handle rainfall comparison data
        const sortedData = [...rawData].sort((a, b) => a.month - b.month);

        // Hide dots if there are more than 100 data points
        const shouldShowDots = sortedData.length <= 100;

        const chartData = {
          labels: sortedData.map(item => item.monthName || `Month ${item.month}`),
          datasets: [
            {
              label: 'NRT Rainfall (mm)',
              data: sortedData.map(item => item.NRT || item.nrt_rainfall || 0),
              borderColor: 'rgb(136, 132, 216)',
              backgroundColor: 'rgba(136, 132, 216, 0.2)',
              tension: 0.1,
              fill: false,
              pointBackgroundColor: 'rgb(136, 132, 216)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: shouldShowDots ? 5 : 0,
              pointHoverRadius: shouldShowDots ? 7 : 0,
            },
            {
              label: 'Standard Rainfall (mm)',
              data: sortedData.map(item => item.STANDARD || item.standard_rainfall || 0),
              borderColor: 'rgb(130, 202, 157)',
              backgroundColor: 'rgba(130, 202, 157, 0.2)',
              tension: 0.1,
              fill: false,
              pointBackgroundColor: 'rgb(130, 202, 157)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
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
              text: 'Rainfall Comparison: NRT vs Standard',
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Rainfall (mm)'
              },
              ticks: {
                maxTicksLimit: 8, // More frequent Y-axis ticks
                stepSize: undefined // Let Chart.js calculate optimal step size
              }
            },
            x: {
              title: {
                display: true,
                text: 'Month'
              },
              ticks: {
                maxTicksLimit: Math.min(sortedData.length, 15), // Better X-axis spacing
                maxRotation: 35,
                minRotation: 0,
                includeBounds: true // Ensure first and last labels are always shown
              }
            }
          }
        };

        return (
          <div>
            <div style={{ height: '400px', width: '100%' }}>
              <ChartJSLine data={chartData} options={options} />
            </div>
          </div>
        );
      } else {
        // Handle time-series data (original logic)
        const sortedData = [...rawData].sort((a, b) => {
          if (a.iso_date && b.iso_date) {
            return new Date(a.iso_date) - new Date(b.iso_date);
          }
          const dateA = new Date(a.year, a.month - 1, a.day);
          const dateB = new Date(b.year, b.month - 1, b.day);
          return dateA - dateB;
        });

        // Hide dots if there are more than 100 data points
        const shouldShowDots = sortedData.length <= 100;

        const chartData = {
          labels: sortedData.map(item => {
            if (item.iso_date) {
              return item.iso_date.split('T')[0]; // Extract date part from ISO string
            }
            return `${item.year}-${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
          }),
          datasets: [
            {
              label: 'Rainfall (mm)',
              data: sortedData.map(item => item.value || item.rainfall || 0),
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              tension: 0.1,
              fill: true,
              pointBackgroundColor: 'rgb(75, 192, 192)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: shouldShowDots ? 5 : 0,
              pointHoverRadius: shouldShowDots ? 7 : 0,
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
              text: `Daily Rainfall in ${sortedData[0]?.state || 'Unknown'} (${sortedData[0]?.year || 'Unknown'})`,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Rainfall (mm)'
              },
              ticks: {
                maxTicksLimit: 8, // More frequent Y-axis ticks
                stepSize: undefined // Let Chart.js calculate optimal step size
              }
            },
            x: {
              title: {
                display: true,
                text: 'Date'
              },
              ticks: {
                maxTicksLimit: Math.min(sortedData.length, 15), // Better X-axis spacing
                maxRotation: 35,
                minRotation: 0,
                includeBounds: true // Ensure first and last labels are always shown
              }
            }
          }
        };

        return (
          <div>
            <div style={{ height: '400px', width: '100%' }}>
              <ChartJSLine data={chartData} options={options} />
            </div>
          </div>
        );
      }
    } catch (error) {
      console.error("Error rendering enhanced chart:", error);
      return <div>Error rendering enhanced chart</div>;
    }
  };



  return (
    <div className="message-wrapper ai-message">
      {/* Text content - only show if there's actual text/summary */}
      {message.text && message.text.trim() && (
        <div className="message-bubble ai-bubble markdown">
          <div className="message-content">
            {message.text}
          </div>
          <div className="message-time">
            {formatTime(message.timestamp)}
          </div>
        </div>
      )}

      {/* Chart content */}
      <div className="message-chart">
        {!useEnhancedChart ? (
          /* Default: Backend Chart */
          <div>
            <div className="chart-header">
              <div className="chart-title">
                <FiBarChart2 className="chart-icon" />
                <h4>Data Visualization</h4>
              </div>
              {/* <div className="chart-actions">
                <button
                  className="chart-enhance-icon-btn"
                  onClick={() => setUseEnhancedChart(true)}
                  title="Enhanced"
                >
                  ✨
                </button>
              </div> */}
            </div>
            {renderBackendChart()}
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
                  onClick={() => onFullscreen ? onFullscreen(message) : setIsModalOpen(true)}
                  title="Full Screen"
                >
                  <FiMaximize2 />
                </button>
              </div>
            </div>
            {renderEnhancedChart()}
          </div>
        )}
      </div>

      {/* Chart Modal */}
      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        rawData={rawData}
        title="Enhanced Data Visualization"
        darkMode={darkMode}
      />
    </div>
  );
};

export default React.memo(ChartRenderer);
