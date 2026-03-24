import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Line } from 'react-chartjs-2';
import { FiX, FiMaximize2, FiDownload, FiZoomIn, FiZoomOut } from 'react-icons/fi';
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

const ChartModal = ({ isOpen, onClose, rawData, title = "Data Visualization", darkMode = false }) => {
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

  if (!isOpen || !rawData || !Array.isArray(rawData) || rawData.length === 0) {
    return null;
  }

  // Sort data by month
  const sortedData = [...rawData].sort((a, b) => a.month - b.month);

  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

  // Hide dots if there are more than 100 data points
  const shouldShowDots = sortedData.length <= 100;

  const chartData = {
    labels: sortedData.map(item => months[item.month - 1]),
    datasets: [
      {
        label: 'Rainfall (mm)',
        data: sortedData.map(item => item.rainfall),
        borderColor: 'rgb(139, 69, 19)',
        backgroundColor: 'rgba(139, 69, 19, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: 'rgb(139, 69, 19)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: shouldShowDots ? 6 : 0,
        pointHoverRadius: shouldShowDots ? 8 : 0,
      },
      {
        label: 'Rainy Days',
        data: sortedData.map(item => item.rainy_days * 20), // Scale for visibility
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: false,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: shouldShowDots ? 4 : 0,
        pointHoverRadius: shouldShowDots ? 6 : 0,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 14,
            weight: '500',
          },
        },
      },
      title: {
        display: true,
        text: `${title} - ${sortedData[0]?.state || 'Unknown'} (${sortedData[0]?.year || 'Unknown'})`,
        font: {
          size: 20,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 30,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const item = sortedData[context.dataIndex];
            if (context.datasetIndex === 0) {
              return `Rainfall: ${item.rainfall} mm`;
            } else {
              return `Rainy Days: ${item.rainy_days} days`;
            }
          },
          afterLabel: function(context) {
            const item = sortedData[context.dataIndex];
            return [
              `Country: ${item.country}`,
              `State: ${item.state}`,
              `Year: ${item.year}`,
              `Month: ${months[item.month - 1]}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Month',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Rainfall (mm)',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        beginAtZero: true,
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Rainy Days (×20 scale)',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        beginAtZero: true,
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart',
    },
  };

  const handleDownload = () => {
    const canvas = document.querySelector('.chart-modal canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `rainfall-chart-${sortedData[0]?.state}-${sortedData[0]?.year}.png`;
      link.href = url;
      link.click();
    }
  };

  // Render the modal using a portal to escape the chat container
  return createPortal(
    <div className={`chart-modal-overlay ${darkMode ? 'dark' : ''}`} onClick={onClose}>
      <div className="chart-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="chart-modal-header">
          <div className="chart-modal-title">
            <FiMaximize2 className="chart-modal-icon" />
            <h2>Full Screen Chart View</h2>
            <span className="chart-modal-subtitle">Click anywhere outside or press ESC to close</span>
          </div>
          <div className="chart-modal-actions">
            <button
              className="chart-modal-action-btn"
              onClick={handleDownload}
              title="Download Chart as PNG"
            >
              <FiDownload />
              <span>Download</span>
            </button>
            <button
              className="chart-modal-close-btn"
              onClick={onClose}
              title="Close Full Screen View (ESC)"
            >
              <FiX />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Chart Container */}
        <div className="chart-modal-content">
          <div className="chart-modal-chart-container">
            <Line data={chartData} options={options} />
          </div>
        </div>

        {/* Modal Footer with Stats */}
        <div className="chart-modal-footer">
          <div className="chart-stats">
            <div className="stat-item">
              <span className="stat-label">Total Rainfall:</span>
              <span className="stat-value">
                {sortedData.reduce((sum, item) => sum + item.rainfall, 0).toFixed(1)} mm
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Average Monthly:</span>
              <span className="stat-value">
                {(sortedData.reduce((sum, item) => sum + item.rainfall, 0) / sortedData.length).toFixed(1)} mm
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Peak Month:</span>
              <span className="stat-value">
                {months[sortedData.reduce((max, item) => item.rainfall > max.rainfall ? item : max).month - 1]}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Rainy Days:</span>
              <span className="stat-value">
                {sortedData.reduce((sum, item) => sum + item.rainy_days, 0)} days
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body // Render directly to document.body to escape all containers
  );
};

export default ChartModal;
