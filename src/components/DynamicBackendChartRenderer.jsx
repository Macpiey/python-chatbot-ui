import React, { useRef, useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const DynamicBackendChartRenderer = ({ chartString, rawData, darkMode = false }) => {
  const containerRef = useRef(null);
  const [isChartOnly, setIsChartOnly] = useState(false);

  console.log("Dynamic renderer - Chart string:", chartString);
  console.log("Dynamic renderer - Raw data:", rawData);

  // Detect if we're in chart-only mode by checking parent container classes
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      let parent = container.parentElement;

      // Traverse up the DOM to find chart-only indicators
      while (parent) {
        if (parent.classList.contains('split-view-chart-content') ||
            parent.classList.contains('fullscreen-chart-content') ||
            parent.classList.contains('chart-only-container')) {
          setIsChartOnly(true);
          break;
        }
        parent = parent.parentElement;
      }
    }
  }, []);

  if (!chartString || !rawData || !Array.isArray(rawData) || rawData.length === 0) {
    return <div>No data available</div>;
  }

  // Get responsive height based on context and screen size
  const getResponsiveHeight = () => {
    if (isChartOnly) {
      const screenHeight = window.innerHeight;
      if (screenHeight <= 600) {
        return 720;
      } else if (screenHeight <= 800) {
        return 1100;
      } else if (screenHeight >= 1400) {
        return 1500;
      } else if (screenHeight >= 1200) {
        return 1300;
      } else {
        return 720; // Default for chart-only mode
      }
    } else {
      // Normal view, use extracted height
      return getChartPropertyBraces('height', 300);
    }
  };

  // Clean the chart string by removing escape characters
  const cleanChartString = chartString.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  console.log("Cleaned chart string:", cleanChartString);

  // Extract chart properties from the backend string
  const getChartProperty = (property, defaultValue) => {
    const regex = new RegExp(`${property}="([^"]*)"`, 'i');
    const match = cleanChartString.match(regex);
    return match ? match[1] : defaultValue;
  };

  const getChartPropertyBraces = (property, defaultValue) => {
    const regex = new RegExp(`${property}=\\{([^}]*)\\}`, 'i');
    const match = cleanChartString.match(regex);
    return match ? parseInt(match[1]) || defaultValue : defaultValue;
  };

  // Extract properties
  const width = getChartProperty('width', '100%');
  const height = getResponsiveHeight();
  const xAxisDataKey = getChartProperty('dataKey', 'month');

  // Check if this is a multi-axis chart
  const isMultiAxis = cleanChartString.toLowerCase().includes('multiaxis') ||
                      cleanChartString.includes('yAxisId=');

  // Extract line properties
  const lineRegex = /<Line[^>]*dataKey="([^"]*)"[^>]*stroke="([^"]*)"[^>]*(?:yAxisId="([^"]*)")?/g;
  const lines = [];
  let lineMatch;
  while ((lineMatch = lineRegex.exec(cleanChartString)) !== null) {
    const [, dataKey, stroke, yAxisId] = lineMatch;
    // Only add lines for data that exists (allow both numeric and null values for forecasts)
    if (rawData[0] && (typeof rawData[0][dataKey] === 'number' || rawData[0][dataKey] === null || rawData[0].hasOwnProperty(dataKey))) {
      lines.push({
        dataKey,
        stroke,
        yAxisId: yAxisId || (isMultiAxis ? (lines.length % 2 === 0 ? 'left' : 'right') : undefined)
      });
    }
  }

  console.log("Extracted properties:", { width, height, xAxisDataKey, lines, isMultiAxis, isChartOnly });

  // Create the tooltip content function with dark mode support
  const tooltipContent = ({ payload, label }) => {
    if (!payload || !payload.length) return null;
    const data = payload[0].payload;

    const tooltipStyle = {
      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '8px',
      padding: '12px',
      boxShadow: darkMode
        ? '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
        : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      color: darkMode ? '#f9fafb' : '#111827',
      fontSize: '14px',
      lineHeight: '1.5',
      minWidth: '150px',
      maxWidth: '300px',
      zIndex: 1000,
      // Force styles to override any defaults
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif'
    };

    const labelStyle = {
      fontWeight: '600',
      color: darkMode ? '#e5e7eb' : '#374151',
      marginBottom: '8px',
      paddingBottom: '4px',
      borderBottom: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`
    };

    const keyStyle = {
      fontWeight: '600',
      color: darkMode ? '#d1d5db' : '#4b5563'
    };

    const valueStyle = {
      color: darkMode ? '#f3f4f6' : '#111827'
    };

    return (
      <div style={tooltipStyle}>
        {label && (
          <div style={labelStyle}>
            {label}
          </div>
        )}
        {Object.entries(data).map(([key, value]) => (
          <div key={key} style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span style={keyStyle}>{key}:</span>
            <span style={valueStyle}>
              {typeof value === 'object' ? JSON.stringify(value) : value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Calculate Y-axis range for decimal formatting
  const calculateYAxisRange = (data, lines, yAxisId = null) => {
    if (!data || data.length === 0 || lines.length === 0) return { min: 0, max: 0, range: 0 };

    // Get all values for the specified axis (or all values if no yAxisId specified)
    const values = [];
    lines.forEach(line => {
      if (!yAxisId || line.yAxisId === yAxisId) {
        data.forEach(item => {
          const value = item[line.dataKey];
          if (typeof value === 'number' && !isNaN(value)) {
            values.push(value);
          }
        });
      }
    });

    if (values.length === 0) return { min: 0, max: 0, range: 0 };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    return { min, max, range };
  };

  // Calculate ranges for both axes
  const leftAxisRange = isMultiAxis ? calculateYAxisRange(rawData, lines, 'left') : calculateYAxisRange(rawData, lines);
  const rightAxisRange = isMultiAxis ? calculateYAxisRange(rawData, lines, 'right') : { min: 0, max: 0, range: 0 };

  // Create formatter function that shows decimals when range is small
  const createYAxisFormatter = (axisRange) => {
    return (value) => {
      if (typeof value !== 'number') return value;

      // If range is less than 10, show 2 decimal places
      if (axisRange.range < 10 && axisRange.range > 0) {
        return value.toFixed(2);
      }

      // Otherwise use standard locale formatting
      return value.toLocaleString();
    };
  };

  const leftAxisFormatter = createYAxisFormatter(leftAxisRange);
  const rightAxisFormatter = createYAxisFormatter(rightAxisRange);
  const singleAxisFormatter = createYAxisFormatter(leftAxisRange);

  // Theme-aware axis colors
  const axisColor = darkMode ? '#9ca3af' : '#6b7280';
  const tickStyle = {
    fontSize: 12,
    fill: darkMode ? '#d1d5db' : '#374151'
  };

  const getXAxisInterval = (dataLength) => {
    if (dataLength <= 15) return 0; // Show all labels
    if (dataLength <= 30) return 0; // Show all labels (increased from 20)
    if (dataLength <= 60) return 1; // Show every 2nd label (increased from 30, reduced interval from 2 to 1)
    if (dataLength <= 100) return 2; // Show every 3rd label (increased from 40, reduced interval from 3 to 2)

    // For larger datasets, calculate interval to maintain reasonable label density
    const maxInterval = 2; // Reduced from 3 to show more labels
    const minLabels = Math.max(12, Math.ceil(dataLength / 10)); // Increased from 8 to show more labels
    const calculatedInterval = Math.max(1, Math.floor(dataLength / minLabels));

    return Math.min(maxInterval, calculatedInterval);
  };

  const xAxisInterval = getXAxisInterval(rawData.length);

  // Generate explicit ticks array to ensure first and last are always included
  const generateXAxisTicks = () => {
    const tickIndices = [0]; // Always include first index
    const interval = xAxisInterval + 1; // Convert interval to step size
    
    console.log('🔍 X-Axis Debug - Data Length:', rawData.length);
    console.log('🔍 X-Axis Debug - Calculated Interval:', xAxisInterval);
    console.log('🔍 X-Axis Debug - Step Size (interval + 1):', interval);
    
    for (let i = interval; i < rawData.length - 1; i += interval) {
      tickIndices.push(i);
    }
    
    // Always include last index if not already included
    const lastIndex = rawData.length - 1;
    if (tickIndices[tickIndices.length - 1] !== lastIndex) {
      tickIndices.push(lastIndex);
    }
    
    // Convert indices to actual data values (Recharts needs values, not indices)
    const ticks = tickIndices.map(index => rawData[index]?.[xAxisDataKey]);
    
    console.log('🔍 X-Axis Debug - Generated Tick Indices:', tickIndices);
    console.log('🔍 X-Axis Debug - Generated Tick Values:', ticks);
    console.log('🔍 X-Axis Debug - First Data Point:', rawData[0]);
    console.log('🔍 X-Axis Debug - Last Data Point:', rawData[lastIndex]);
    console.log('🔍 X-Axis Debug - X-Axis DataKey:', xAxisDataKey);
    console.log('🔍 X-Axis Debug - First Label:', rawData[0]?.[xAxisDataKey]);
    console.log('🔍 X-Axis Debug - Last Label:', rawData[lastIndex]?.[xAxisDataKey]);
    
    return ticks;
  };

  const xAxisTicks = generateXAxisTicks();

  // Calculate grid line spacing to avoid clutter
  const gridStrokeWidth = rawData.length > 200 ? 0.4 : 0.6;
  const gridOpacity = rawData.length > 200 ? 0.4 : 0.6;

  return (
    <div ref={containerRef} style={{ overflow: 'hidden', width: '100%', height: '100%' }}>
      <ResponsiveContainer width={width} height={height}>
        <LineChart data={rawData} margin={{ top: 60, right: 60, left: 20, bottom: 20 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={axisColor}
          strokeWidth={gridStrokeWidth}
          opacity={gridOpacity}
        />
        <XAxis
          dataKey={xAxisDataKey}
          stroke={axisColor}
          tick={tickStyle}
          ticks={xAxisTicks}
        />
        {isMultiAxis ? (
          // Multi-axis: render left and right Y-axes with different styling
          <>
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="#2563eb"
              tick={tickStyle}
              tickFormatter={leftAxisFormatter}
              width={60}
              tickCount={10}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#dc2626"
              tick={tickStyle}
              tickFormatter={rightAxisFormatter}
              width={60}
              tickCount={10}
            />
          </>
        ) : (
          // Single axis: render standard Y-axis
          <YAxis
            stroke={axisColor}
            tick={tickStyle}
            tickFormatter={singleAxisFormatter}
            tickCount={8}
          />
        )}
        <Tooltip
          content={tooltipContent}
          cursor={{ stroke: darkMode ? '#6b7280' : '#d1d5db', strokeWidth: 1 }}
          wrapperStyle={{ zIndex: 1000 }}
          contentStyle={{
            backgroundColor: darkMode ? '#1f2937' : '#ffffff',
            border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
            borderRadius: '8px',
            color: darkMode ? '#f9fafb' : '#111827'
          }}
        />

        {lines.map((line, index) => {
          // Check if this line should be dotted
          const isDotted = line.yAxisId && (line.yAxisId.includes('dotted') || line.yAxisId.endsWith('-dotted'));
          const actualYAxisId = isDotted ? line.yAxisId.replace('-dotted', '') : line.yAxisId;

          // Hide dots if there are more than 100 data points
          const shouldShowDots = rawData.length <= 100;

          return (
            <Line
              key={index}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.stroke}
              name={line.dataKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              yAxisId={actualYAxisId}
              strokeDasharray={isDotted ? "5 5" : "0"}
              strokeWidth={isDotted ? 2 : 2}
              dot={shouldShowDots ? { r: 3 } : false}
              activeDot={shouldShowDots ? { r: 5 } : false}
            />
          );
        })}
        <Legend
          verticalAlign="top"
          height={36}
          content={() => {
            // Build legend entries from parsed lines so dotted appears dashed
            return (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingBottom: 8, marginTop: -10, color: darkMode ? '#d1d5db' : '#374151', justifyContent: 'center' }}>
                {lines.map((ln) => {
                  const isDotted = ln.yAxisId && (ln.yAxisId.includes('dotted') || ln.yAxisId.endsWith('-dotted'));
                  const name = ln.dataKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                  return (
                    <div key={ln.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="28" height="10" viewBox="0 0 28 10">
                        <line x1="0" y1="5" x2="28" y2="5" stroke={ln.stroke} strokeWidth="3" strokeDasharray={isDotted ? '6 4' : '0'} />
                      </svg>
                      <span style={{ fontSize: 12 }}>{name}</span>
                    </div>
                  );
                })}
              </div>
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
};

export default DynamicBackendChartRenderer;
