import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
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

const DynamicChartRenderer = ({ chartCode, rawData }) => {
  const [ChartComponent, setChartComponent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chartCode) return;

    try {
      console.log('Processing backend chart code...');

      // Extract the data array from the backend code
      const dataMatch = chartCode.match(/const data = (\[.*?\]);/s);
      if (!dataMatch) {
        throw new Error('Could not extract data from backend chart code');
      }

      const dataArray = JSON.parse(dataMatch[1]);
      console.log('Extracted data:', dataArray);

      // We'll create our own chart configuration using the extracted data

      // Create a simple React component that uses the extracted data
      const BackendChart = () => {
        const sortedData = [...dataArray].sort((a, b) => a.month - b.month);

        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Hide dots if there are more than 100 data points
        const shouldShowDots = sortedData.length <= 100;

        // Calculate X-axis label interval for better spacing
        // Ensures first and last labels are always shown, with max gap of 3 labels between shown labels
        const getXAxisMaxTicks = (dataLength) => {
          if (dataLength <= 15) return dataLength; // Show all labels
          if (dataLength <= 20) return Math.ceil(dataLength / 2); // Show every 2nd label (gap of 1)
          if (dataLength <= 30) return Math.ceil(dataLength / 3); // Show every 3rd label (gap of 2)
          if (dataLength <= 40) return Math.ceil(dataLength / 4); // Show every 4th label (gap of 3)

          // For larger datasets, calculate to maintain max gap of 3
          // but ensure we don't show too few labels
          const minTicks = Math.max(8, Math.ceil(dataLength / 15)); // At least 8 ticks, or 1 per 15 data points
          const maxTicks = Math.ceil(dataLength / 4); // Max gap of 3 means show every 4th

          return Math.max(minTicks, Math.min(maxTicks, 20)); // Cap at 20 for readability
        };

        const maxXAxisTicks = getXAxisMaxTicks(sortedData.length);

        const chartData = {
          labels: sortedData.map(item => monthNames[item.month - 1]),
          datasets: [
            {
              label: 'China Rainfall (mm)',
              data: sortedData.map(item => item.rainfall),
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
              tension: 0.1,
              pointRadius: shouldShowDots ? 3 : 0,
              pointHoverRadius: shouldShowDots ? 5 : 0
            }
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
              text: 'Monthly Rainfall in China (2024)',
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const dataPoint = sortedData[context.dataIndex];
                  return [
                    `State: ${dataPoint.state}`,
                    `Year: ${dataPoint.year}`,
                    `Rainfall: ${dataPoint.rainfall} mm`,
                    `Rainy Days: ${dataPoint.rainy_days}`,
                  ];
                }
              }
            }
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
                maxTicksLimit: maxXAxisTicks,
                maxRotation: 35,
                minRotation: 0,
                includeBounds: true // Ensure first and last labels are always shown
              }
            }
          }
        };

        return React.createElement('div',
          { style: { height: '400px', width: '100%' } },
          React.createElement(Line, { data: chartData, options: options })
        );
      };

      console.log('Backend chart component created successfully using extracted data!');
      setChartComponent(() => BackendChart);
      setError(null);

    } catch (err) {
      console.error('Error processing backend chart code:', err);
      console.log('Chart code that failed:', chartCode);
      setError(`Backend chart failed: ${err.message}`);
      setChartComponent(null);
    }
  }, [chartCode]);

  if (error) {
    return (
      <div className="chart-error">
        <p>⚠️ Backend chart failed to render: {error}</p>
        <p>Falling back to our custom chart...</p>
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
            {chartCode}
          </pre>
        </details>
      </div>
    );
  }

  if (!ChartComponent) {
    return <div>Loading chart...</div>;
  }

  // Render the backend-generated component
  return (
    <div className="dynamic-chart-container">
      <div style={{ height: '400px', width: '100%' }}>
        <ChartComponent />
      </div>
    </div>
  );
};

export default DynamicChartRenderer;
