import React from 'react';
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

const RainfallChart = ({ data }) => {
  const sortedData = [...data].sort((a, b) => a.month - b.month);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Hide dots if there are more than 100 data points
  const shouldShowDots = sortedData.length <= 100;

  const chartData = {
    labels: sortedData.map(item => months[item.month - 1]),
    datasets: [
      {
        label: 'Rainfall (mm)',
        data: sortedData.map(item => item.rainfall),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
        pointRadius: shouldShowDots ? 3 : 0,
        pointHoverRadius: shouldShowDots ? 5 : 0
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Monthly Rainfall in ${sortedData[0].state} (${sortedData[0].year})`,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const item = sortedData[context.dataIndex];
            return [
              `Rainfall: ${item.rainfall} mm`,
              `State: ${item.state}`,
              `Year: ${item.year}`,
              `Month: ${months[item.month - 1]}`
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
          maxTicksLimit: Math.min(sortedData.length, 12), // Better X-axis spacing
          maxRotation: 35,
          minRotation: 0,
          includeBounds: true // Ensure first and last labels are always shown
        }
      }
    }
  };

  return <Line data={chartData} options={options} />;
};

export default RainfallChart;
