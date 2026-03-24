import React from 'react';
import MarkdownStructuredMessage from './MarkdownStructuredMessage';
import { testData1, testData2, testData3, testData4, testData5, testDataMultipleCharts, formatAsAPIResponse } from '../test-chart-data';

const ChartTestComponent = () => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const testMessage1 = {
    text: formatAsAPIResponse(testData1),
    timestamp: Date.now(),
    sender: 'ai'
  };

  const testMessage2 = {
    text: formatAsAPIResponse(testData2),
    timestamp: Date.now(),
    sender: 'ai'
  };

  const testMessage3 = {
    text: formatAsAPIResponse(testData3),
    timestamp: Date.now(),
    sender: 'ai'
  };

  const testMessage4 = {
    text: formatAsAPIResponse(testData4),
    timestamp: Date.now(),
    sender: 'ai'
  };

  const testMessage5 = {
    text: formatAsAPIResponse(testData5),
    timestamp: Date.now(),
    sender: 'ai'
  };

  const testMessageMultiple = {
    text: testDataMultipleCharts,
    timestamp: Date.now(),
    sender: 'ai'
  };

  // Test with new API format (chart only, no table)
  const newAPIFormatTest = {
    text: JSON.stringify({
      "chart": {
        "chartType": "line",
        "xKey": "date",
        "yKeys": ["Arabica Soil Moisture", "Robusta Soil Moisture"],
        "data": [
          {"date": "2025-01-01", "Arabica Soil Moisture": 0.21, "Robusta Soil Moisture": 0.21},
          {"date": "2025-01-02", "Arabica Soil Moisture": 0.21, "Robusta Soil Moisture": 0.21},
          {"date": "2025-01-03", "Arabica Soil Moisture": 0.21, "Robusta Soil Moisture": 0.2},
          {"date": "2025-01-04", "Arabica Soil Moisture": 0.2, "Robusta Soil Moisture": 0.2},
          {"date": "2025-01-05", "Arabica Soil Moisture": 0.2, "Robusta Soil Moisture": 0.21},
          {"date": "2025-01-10", "Arabica Soil Moisture": 0.22, "Robusta Soil Moisture": 0.25},
          {"date": "2025-01-15", "Arabica Soil Moisture": 0.27, "Robusta Soil Moisture": 0.24},
          {"date": "2025-01-20", "Arabica Soil Moisture": 0.25, "Robusta Soil Moisture": 0.24},
          {"date": "2025-01-25", "Arabica Soil Moisture": 0.24, "Robusta Soil Moisture": 0.22},
          {"date": "2025-01-30", "Arabica Soil Moisture": 0.23, "Robusta Soil Moisture": 0.22}
        ]
      },
      "summary": "**Data-Driven Findings**\n\n- The dataset contains 10 daily soil moisture measurements for both Arabica and Robusta coffee varieties in January 2025.\n- Arabica soil moisture ranges from 0.20 to 0.27, with a mean of 0.225.\n- Robusta soil moisture ranges from 0.20 to 0.25, with a mean of 0.218."
    }),
    timestamp: Date.now(),
    sender: 'ai'
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Chart Rendering Test - New Implementation</h1>
      <p>Testing the improved chart rendering logic that handles different variable names dynamically.</p>

      <div style={{ marginBottom: '40px' }}>
        <h2>Test 1: BAR Chart (Single Data Point)</h2>
        <p>This should render a bar chart with one data point showing total rainfall for GIA LAI state.</p>
        <MarkdownStructuredMessage
          message={testMessage1}
          formatTime={formatTime}
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Test 2: LINE Chart (Multiple Data Points)</h2>
        <p>This should render a line chart comparing robusta vs arabica rainfall over years 2000-2009.</p>
        <MarkdownStructuredMessage
          message={testMessage2}
          formatTime={formatTime}
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Test 3: LINE Chart (Trading Date X-axis)</h2>
        <p>This should render a line chart with trading_date as X-axis and price_difference as Y-axis.</p>
        <MarkdownStructuredMessage
          message={testMessage3}
          formatTime={formatTime}
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Test 4: BAR Chart (State as Categorical X-axis)</h2>
        <p>This should render a bar chart with state names as X-axis and avg_smap as Y-axis.</p>
        <MarkdownStructuredMessage
          message={testMessage4}
          formatTime={formatTime}
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Test 5: LINE Chart (Multiple Y-axis Values)</h2>
        <p>This should render a line chart with month as X-axis and multiple metrics (rainfall, temperature, humidity) as Y-axis values. State should appear in tooltip.</p>
        <MarkdownStructuredMessage
          message={testMessage5}
          formatTime={formatTime}
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Test 6: Multiple Charts in One Response</h2>
        <p>This should render TWO separate charts from a single API response - one BAR chart for rainfall by state and one LINE chart for temperature trends.</p>
        <MarkdownStructuredMessage
          message={testMessageMultiple}
          formatTime={formatTime}
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Test 7: New API Format (Chart Only, No Table)</h2>
        <p>This should render a line chart with the new API format that only includes chart data (no table data). Shows Arabica vs Robusta soil moisture over time.</p>
        <MarkdownStructuredMessage
          message={newAPIFormatTest}
          formatTime={formatTime}
        />
      </div>
    </div>
  );
};

export default ChartTestComponent;
