import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FiMaximize2, FiBarChart2, FiColumns, FiEye, FiCopy } from 'react-icons/fi';
import FullscreenChartModal from './FullscreenChartModal';
import TypewriterText from './TypewriterText';
import { copyManager } from './GlobalCopyOverlay';
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";



const MarkdownStructuredMessage = ({
  message,
  formatTime,
  splitView = false,
  chartOnly = false,
  onSplitViewToggle = null,
  isSplitViewActive = false,
  canToggleSplitView = true,
  onFullscreen = null,
  darkMode = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const messageRef = useRef(null);
  const [showCopyButton, setShowCopyButton] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [buttonPosition, setButtonPosition] = useState({ top: 10, right: 10 });
  const componentId = useMemo(() => `message-${message.id}`, [message.id]);

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



  // Parse streaming response content to extract valid JSON formats
  const parseStreamingResponse = (text) => {
    const result = {
      beforeText: '',
      jsonDataArray: [],
      afterText: '',
      textSegments: []
    };

    // Function to find balanced JSON objects
    const findBalancedJSON = (text, startPattern) => {
      const matches = [];
      let index = 0;

      while (index < text.length) {
        const match = text.substring(index).match(startPattern);
        if (!match) break;

        const startIndex = index + match.index;
        let braceCount = 0;
        let inString = false;
        let escaped = false;
        let jsonEnd = -1;

        for (let i = startIndex; i < text.length; i++) {
          const char = text[i];

          if (escaped) {
            escaped = false;
            continue;
          }

          if (char === '\\' && inString) {
            escaped = true;
            continue;
          }

          if (char === '"') {
            inString = !inString;
            continue;
          }

          if (!inString) {
            if (char === '{') {
              braceCount++;
            } else if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                jsonEnd = i;
                break;
              }
            }
          }
        }

        if (jsonEnd !== -1) {
          matches.push({
            content: text.substring(startIndex, jsonEnd + 1),
            start: startIndex,
            end: jsonEnd + 1
          });
        }

        index = startIndex + 1;
      }

      return matches;
    };

    // Look for chart/table format (starts with {"chart":)
    const chartTableMatches = findBalancedJSON(text, /\{\s*"chart":/);
    const reportMatches = findBalancedJSON(text, /\{\s*"report":/);

    let matches = [];

    // Add chart/table matches
    chartTableMatches.forEach(match => {
      try {
        const parsed = JSON.parse(match.content);
        if (parsed.chart || parsed.table) {
          matches.push({
            ...match,
            type: 'chart_table'
          });
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    });

    // Add report matches (only if not overlapping with chart/table)
    reportMatches.forEach(match => {
      const isOverlapping = matches.some(m =>
        (match.start >= m.start && match.start < m.end) ||
        (match.end > m.start && match.end <= m.end)
      );

      if (!isOverlapping) {
        try {
          const parsed = JSON.parse(match.content);
          if (parsed.report) {
            matches.push({
              ...match,
              type: 'report'
            });
          }
        } catch (e) {
          // Invalid JSON, skip
        }
      }
    });

    if (matches.length > 0) {
      // Sort matches by position
      matches.sort((a, b) => a.start - b.start);

      let currentPos = 0;

      matches.forEach((match, index) => {
        // Add text before this JSON
        if (match.start > currentPos) {
          const textSegment = text.substring(currentPos, match.start).trim();
          if (textSegment) {
            result.textSegments.push({
              text: textSegment,
              position: index,
              type: 'text'
            });
          }
        }

        // Parse the JSON
        try {
          const jsonData = JSON.parse(match.content);

          // Database_response processing removed - only handle chart/summary JSON now

          result.jsonDataArray.push({
            ...jsonData,
            position: index,
            type: match.type
          });
        } catch (error) {
          console.error('Error parsing JSON:', error);
          console.log('Failed JSON string:', match.content);
          // Add as text segment if JSON parsing fails
          result.textSegments.push({
            text: match.content,
            position: index,
            type: 'text'
          });
        }

        currentPos = match.end;
      });

      // Add remaining text after last JSON
      if (currentPos < text.length) {
        const remainingText = text.substring(currentPos).trim();
        if (remainingText) {
          result.textSegments.push({
            text: remainingText,
            position: matches.length,
            type: 'text'
          });
        }
      }
    } else {
      // No JSON found, treat as regular text
      result.beforeText = text;
      result.textSegments.push({
        text: text,
        position: 0,
        type: 'text'
      });
    }

    return result;
  };





  // Dynamic Chart Component using Recharts (memoized to prevent re-renders)
  const DynamicChart = React.memo(({ chartData, messageType }) => {
    const [isFullscreenMode, setIsFullscreenMode] = useState(false);
    const chartContainerRef = useRef(null);
    
    // Callback ref to detect fullscreen mode immediately when container is attached
    const setChartContainerRef = (node) => {
      chartContainerRef.current = node;
      if (node && chartOnly) {
        let parent = node.parentElement;
        let isFullscreen = false;
        while (parent) {
          if (parent.classList?.contains('fullscreen-chart-content')) {
            isFullscreen = true;
            break;
          } else if (parent.classList?.contains('split-view-chart-content')) {
            isFullscreen = false;
            break;
          }
          parent = parent.parentElement;
        }
        setIsFullscreenMode(isFullscreen);
      }
    };
    
    console.log("DynamicChart called with:", { chartData, messageType, chartOnly, isFullscreenMode });

    // Handle new backend format with chart object
    if (!chartData || !chartData.data || !Array.isArray(chartData.data) || chartData.data.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          <p>No chart data available</p>
          <small>Chart Data: {JSON.stringify(chartData)}</small>
        </div>
      );
    }

    // Check if all data values are null
    const hasValidData = chartData.data.some(item =>
      Object.values(item).some(value => value !== null && value !== undefined && value !== "")
    );

    if (!hasValidData) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          <p>📊 Chart structure available but no data to display</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>
            All data points contain null values. The chart will display once data becomes available.
          </p>
          <details style={{ marginTop: '10px', fontSize: '12px' }}>
            <summary>🔍 Chart Configuration</summary>
            <pre style={{
              background: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '11px',
              textAlign: 'left'
            }}>
              Chart Type: {chartData.chartType || 'Unknown'}
              {messageType && `\nMessage Type: ${messageType}`}
              {'\n'}X-Axis: {chartData.xKey}
              {'\n'}Y-Axes: {chartData.yKeys?.map(k => typeof k === 'object' ? k.key : k).join(', ')}
              {'\n'}Data Points: {chartData.data.length}
            </pre>
          </details>
        </div>
      );
    }

    let { chartType, xKey, yKeys, yKey, data } = chartData;

    // Handle both yKey (singular) and yKeys (plural) from API
    if (!yKeys && yKey) {
      yKeys = [yKey]; // Convert single yKey to array
      console.log("Converted yKey to yKeys:", yKeys);
    }

    // Check if yKeys contains objects (new multiaxis format) or strings (old format)
    const isNewMultiAxisFormat = yKeys && yKeys.length > 0 && typeof yKeys[0] === 'object' && yKeys[0].key;
    console.log("🔍 New multiaxis format detected:", isNewMultiAxisFormat);

    // If yKeys is still empty, detect them automatically
    if (!yKeys || yKeys.length === 0) {
      console.log("Detecting yKeys for old format data");
      const sample = data[0];
      yKeys = Object.keys(sample).filter(key => {
        const value = sample[key];
        return typeof value === 'number' && !isNaN(value) &&
               key !== xKey &&
               !['year', 'month', 'day', '_id', 'state', 'country', 'district'].includes(key.toLowerCase());
      });
      console.log("Auto-detected yKeys:", yKeys);
    }

    console.log("Chart configuration:", { chartType, xKey, yKeys, dataLength: data.length });
    console.log("📊 Chart data sample:", data.slice(0, 3));

    // Helper function to get the actual key name from yKeys (handles both old and new formats)
    const getKeyName = (keyItem) => {
      return isNewMultiAxisFormat ? keyItem.key : keyItem;
    };

    // Helper function to get the axis assignment from yKeys (for new format)
    const getKeyAxis = (keyItem) => {
      if (!isNewMultiAxisFormat) return undefined;

      // Handle dotted axes - remove the "-dotted" suffix for axis assignment
      const axis = keyItem.axis;
      if (axis && axis.includes('-dotted')) {
        return axis.replace('-dotted', '');
      }
      return axis;
    };

    // Calculate Y-axis data ranges for domain calculation
    const yAxisRanges = yKeys.map(keyItem => {
      const key = getKeyName(keyItem);
      const values = data.map(item => item[key]).filter(val => val !== null && val !== undefined);
      return {
        key,
        axis: getKeyAxis(keyItem),
        min: Math.min(...values),
        max: Math.max(...values),
        sampleValues: values.slice(0, 3)
      };
    });

    console.log("📊 Y-axis data ranges:", yAxisRanges);

    // Transform data to ensure numeric values for chart rendering
    const transformedData = data.map(item => {
      const newItem = { ...item };
      yKeys.forEach(keyItem => {
        const key = getKeyName(keyItem);
        if (newItem[key] !== null && newItem[key] !== undefined) {
          // Ensure numeric values
          const numValue = parseFloat(newItem[key]);
          if (!isNaN(numValue)) {
            newItem[key] = numValue;
          }
        }
      });
      return newItem;
    });

    console.log("📊 Transformed data sample:", transformedData.slice(0, 2));

    // Determine if it's a multiline chart based on yKeys length
    const isMultiline = yKeys && yKeys.length > 1;
    console.log("Is multiline chart:", isMultiline, "yKeys count:", yKeys?.length);

    // Determine if this is a multi-axis chart - check both chartType and messageType
    const isMultiAxis = chartType?.toLowerCase() === "multiaxis" || messageType?.toLowerCase() === "multiaxis";
    console.log("🔍 Multi-axis detection:", {
      isMultiAxis,
      chartType,
      messageType,
      yKeysCount: yKeys?.length,
      firstTwoYKeys: yKeys?.slice(0, 2)
    });

    // 🐛 DEBUG: Add comprehensive debugging for Y-axis issues
    console.log("🐛 DEBUGGING Y-AXIS ISSUES:");
    console.log("🐛 Raw data from API:", data.slice(0, 2));
    console.log("🐛 Transformed data:", transformedData.slice(0, 2));
    console.log("🐛 yKeys:", yKeys);
    console.log("🐛 isMultiAxis:", isMultiAxis);
    console.log("🐛 isNewMultiAxisFormat:", isNewMultiAxisFormat);

    // Check data types for each yKey
    yKeys.forEach(keyItem => {
      const key = getKeyName(keyItem);
      const axis = getKeyAxis(keyItem);
      const sampleValues = transformedData.slice(0, 3).map(item => ({
        value: item[key],
        type: typeof item[key],
        isNumber: typeof item[key] === 'number',
        isNaN: isNaN(item[key])
      }));
      console.log(`🐛 Data for ${key} (axis: ${axis}):`, sampleValues);
    });

    // Determine chart component based on type
    const ChartComponent = (chartType?.toLowerCase() === "line" || isMultiAxis) ? LineChart : BarChart;

    console.log(`🐛 Using chart component: ${ChartComponent?.name || 'undefined'}, isMultiAxis: ${isMultiAxis}`);
    console.log(`🐛 Available components:`, { ComposedChart: !!ComposedChart, LineChart: !!LineChart, BarChart: !!BarChart });

    // High-contrast palette (no red-like hues); API-provided colors still respected
    const colors = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#0891b2", "#a16207", "#0ea5e9", "#111827"];

    // Helpers to avoid visually similar colors (e.g., red vs maroon)
    const hexToHsl = (hex) => {
      if (!hex) return null;
      const cleaned = hex.replace('#', '');
      const bigint = parseInt(cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned, 16);
      const r = ((bigint >> 16) & 255) / 255;
      const g = ((bigint >> 8) & 255) / 255;
      const b = (bigint & 255) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
      if (max === min) { h = s = 0; }
      else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          default: h = (r - g) / d + 4; break;
        }
        h *= 60;
      }
      return { h, s, l };
    };

    const isSimilarColor = (c1, c2) => {
      const h1 = hexToHsl(c1); const h2 = hexToHsl(c2);
      if (!h1 || !h2) return false;
      const hueDiff = Math.min(Math.abs(h1.h - h2.h), 360 - Math.abs(h1.h - h2.h));
      const satDiff = Math.abs(h1.s - h2.s);
      const lightDiff = Math.abs(h1.l - h2.l);
      return hueDiff < 18 && satDiff < 0.35 && lightDiff < 0.35; // conservative similarity threshold
    };

    // Build stable series meta with unique colors (respect API-provided colors)
    const buildSeriesMeta = () => {
      const usedColors = new Set(
        yKeys
          .filter((k) => typeof k === 'object' && k.color)
          .map((k) => k.color.toLowerCase())
      );

      const series = [];
      let paletteIndex = 0;

      yKeys.forEach((keyItem, idx) => {
        const key = getKeyName(keyItem);
        const axis = isMultiAxis ? (isNewMultiAxisFormat ? getKeyAxis(keyItem) : getAxisAssignment(keyItem, idx, transformedData)) : undefined;
        const isDotted = typeof keyItem === 'object' && keyItem.axis && (keyItem.axis.includes('dotted') || keyItem.axis.endsWith('-dotted'));

        // Respect provided color, otherwise pick the next palette color not already used
        let color = (typeof keyItem === 'object' && keyItem.color) ? keyItem.color : undefined;
        if (!color) {
          // Find next non-conflicting palette color and avoid similarity to already used colors
          while (paletteIndex < colors.length && (
            usedColors.has(colors[paletteIndex].toLowerCase()) ||
            Array.from(usedColors).some(u => isSimilarColor(u, colors[paletteIndex]))
          )) {
            paletteIndex += 1;
          }
          color = colors[paletteIndex % colors.length];
          usedColors.add(color.toLowerCase());
          paletteIndex += 1;
        }

        series.push({ key, axis, color, isDotted });
      });

      return series;
    };

    const seriesMeta = buildSeriesMeta();

    // Determine Y-axis colors based on which data series are assigned to each axis
    const getAxisColors = () => {
      if (!isMultiAxis) return { left: "#2563eb", right: "#dc2626" };

      const leftAxisSeries = seriesMeta.filter(s => s.axis === 'left');
      const rightAxisSeries = seriesMeta.filter(s => s.axis === 'right');

      // Use the color of the first series on each axis, or fallback to default colors
      const leftColor = leftAxisSeries.length > 0 ? leftAxisSeries[0].color : "#2563eb";
      const rightColor = rightAxisSeries.length > 0 ? rightAxisSeries[0].color : "#dc2626";

      console.log("🎨 Axis color assignment:", {
        leftAxisSeries,
        rightAxisSeries,
        leftColor,
        rightColor
      });

      return { left: leftColor, right: rightColor };
    };

    const axisColors = getAxisColors();

    // Calculate custom Y-axis domains with 5% padding
    const calculateAxisDomains = () => {
      if (!isMultiAxis) {
        // For single axis charts, calculate domain for all yKeys combined
        const allValues = [];
        yAxisRanges.forEach(range => {
          const values = transformedData.map(item => item[range.key]).filter(val => typeof val === 'number' && !isNaN(val));
          allValues.push(...values);
        });

        if (allValues.length === 0) return { single: undefined };

        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min;
        const padding = range * 0.05; // 5% padding

        // Calculate domain bounds with padding
        let domainMin = min - padding;
        let domainMax = max + padding;

        // Only enforce 0 as minimum if all values are positive and close to 0
        if (min >= 0 && min < (range * 0.1)) {
          domainMin = 0;
        }

        return {
          single: [domainMin, domainMax]
        };
      }

      // For multi-axis charts, calculate domains for left and right axes separately
      const leftAxisValues = [];
      const rightAxisValues = [];

      yKeys.forEach((keyItem, idx) => {
        const key = getKeyName(keyItem);
        const axis = isNewMultiAxisFormat ? getKeyAxis(keyItem) : getAxisAssignment(keyItem, idx, transformedData);
        const values = transformedData.map(item => item[key]).filter(val => typeof val === 'number' && !isNaN(val));

        if (axis === 'left') {
          leftAxisValues.push(...values);
        } else if (axis === 'right') {
          rightAxisValues.push(...values);
        }
      });

      const calculateDomain = (values) => {
        if (values.length === 0) return undefined;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        const padding = range * 0.05; // 5% padding

        // Calculate domain bounds with padding
        let domainMin = min - padding;
        let domainMax = max + padding;

        // Only enforce 0 as minimum if all values are positive and close to 0
        // This prevents negative values from being cut off
        if (min >= 0 && min < (range * 0.1)) {
          domainMin = 0;
        }

        return [domainMin, domainMax];
      };

      return {
        left: calculateDomain(leftAxisValues),
        right: calculateDomain(rightAxisValues)
      };
    };

    const axisDomains = calculateAxisDomains();
    console.log("📊 Calculated axis domains:", axisDomains);

    // Common tick formatter: integers only for clean labels
    const integerTickFormatter = (value) => {
      return (typeof value === 'number')
        ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)
        : String(value);
    };

    // Create equal-spaced, nice ticks for Y axes so differences are consistent
    const niceNumber = (value, round) => {
      const exponent = Math.floor(Math.log10(value));
      const fraction = value / Math.pow(10, exponent);
      let niceFraction;
      if (round) {
        if (fraction < 1.5) niceFraction = 1;
        else if (fraction < 3) niceFraction = 2;
        else if (fraction < 7) niceFraction = 5;
        else niceFraction = 10;
      } else {
        if (fraction <= 1) niceFraction = 1;
        else if (fraction <= 2) niceFraction = 2;
        else if (fraction <= 5) niceFraction = 5;
        else niceFraction = 10;
      }
      return niceFraction * Math.pow(10, exponent);
    };

    const computeNiceTicksExact = (domain, tickCount = 10) => {
      if (!domain) return undefined;
      let [min, max] = domain;
      if (!(typeof min === 'number' && typeof max === 'number') || !isFinite(min) || !isFinite(max)) return undefined;
      if (min === max) {
        max = min + 1;
      }
      // Use a tight step based on the actual span so the last tick is at max
      const span = Math.max(1e-9, max - min);
      let step = span / (tickCount - 1);
      // Prevent extreme decimals by snapping step to a sensible precision
      const precision = Math.pow(10, Math.max(0, 3 - Math.floor(Math.log10(Math.abs(step)))));
      step = Math.round(step * precision) / precision;

      let first = min;
      let last = first + step * (tickCount - 1);
      if (last < max) {
        // Shift window so last lands at max, ensuring at most one step above
        last = max;
        first = last - step * (tickCount - 1);
      }

      const ticks = [];
      for (let i = 0; i < tickCount; i++) {
        const v = first + step * i;
        ticks.push(Number(v.toFixed(3)));
      }
      return ticks;
    };

    const TICK_COUNT = 10; // shared across left/right for uniformity
    const leftTicks = isMultiAxis ? computeNiceTicksExact(axisDomains.left, TICK_COUNT) : undefined;
    const rightTicks = isMultiAxis ? computeNiceTicksExact(axisDomains.right, TICK_COUNT) : undefined;
    const singleTicks = !isMultiAxis ? computeNiceTicksExact(axisDomains.single, TICK_COUNT) : undefined;

    // Helper function to determine which axis a data series should use
    const getAxisAssignment = (keyItem, idx, data) => {
      if (!isMultiAxis) return undefined;

      // For new multiaxis format, use the axis specified in the API response
      if (isNewMultiAxisFormat) {
        const axis = getKeyAxis(keyItem);
        console.log(`🔍 Using API-specified axis for ${getKeyName(keyItem)}: ${axis}`);
        return axis;
      }

      // For old format, use the legacy logic
      const key = getKeyName(keyItem);

      // For multi-axis charts, assign first two yKeys to different axes
      // First yKey -> left axis, Second yKey -> right axis
      // Additional yKeys follow alternating pattern
      if (idx === 0) return 'left';   // First series always on left
      if (idx === 1) return 'right';  // Second series always on right

      // For additional series (3rd, 4th, etc.), alternate based on their values
      // Try to intelligently assign based on data ranges if available
      if (data && data.length > 0) {
        const values = data.map(item => item[key]).filter(val => typeof val === 'number' && val !== null);
        if (values.length > 0) {
          const max = Math.max(...values);
          const min = Math.min(...values);
          const range = max - min;

          // Store range info for intelligent axis assignment
          if (!window.chartAxisRanges) window.chartAxisRanges = {};
          window.chartAxisRanges[key] = { min, max, range };

          // For 3rd+ series, try to balance the axes based on scale similarity
          // This is a simple heuristic - could be enhanced further
          return (idx % 2 === 0) ? 'left' : 'right';
        }
      }

      // Fallback: alternate assignment for 3rd+ series
      return (idx % 2 === 0) ? 'left' : 'right';
    };

    const renderSeries = () => {
      if (chartType?.toLowerCase() === "line" || isMultiAxis) {
        // For line charts and multi-axis charts, render each yKey as a separate line
        return yKeys.map((keyItem, idx) => {
          const key = getKeyName(keyItem);
          // Resolve color from precomputed series meta to avoid color bleeding
          const meta = seriesMeta.find(s => s.key === key) || {};
          const color = meta.color || colors[idx % colors.length];
          const yAxisId = isMultiAxis ? getAxisAssignment(keyItem, idx, transformedData) : undefined;

          console.log(`🐛 Line ${key}: yAxisId=${yAxisId}, idx=${idx}, isMultiAxis=${isMultiAxis}`);
          console.log(`🐛 Line component props:`, {
            key,
            dataKey: key,
            yAxisId,
            stroke: color
          });

          // Check if this line should be dotted
          const isDotted = !!meta.isDotted;

          // Hide dots if there are more than 100 data points
          const shouldShowDots = transformedData.length <= 100;

          const lineProps = {
            key: key,
            type: "monotone",
            dataKey: key,
            stroke: color,
            strokeWidth: isMultiline || isMultiAxis ? 3 : 2,
            name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            dot: shouldShowDots ? { r: isMultiline || isMultiAxis ? 4 : 3 } : false,
            strokeDasharray: isDotted ? "5 5" : "0"
          };

          // Only add yAxisId for multi-axis charts
          if (isMultiAxis) {
            lineProps.yAxisId = yAxisId;
          }

          return (
            <Line
              {...lineProps}
              activeDot={shouldShowDots ? { r: isMultiline || isMultiAxis ? 6 : 5 } : false}
              yAxisId={yAxisId}
            />
          );
        });
      } else {
        // For bar charts, render each yKey as a separate bar series
        return yKeys.map((keyItem, idx) => {
          const key = getKeyName(keyItem);
          // Use color from yKey if provided, otherwise use default colors
          const color = (typeof keyItem === 'object' && keyItem.color) ? keyItem.color : colors[idx % colors.length];
          return (
            <Bar key={key} dataKey={key} fill={color} radius={[4, 4, 0, 0]} />
          );
        });
      }
    };

    // Calculate grid line spacing and X-axis interval to avoid clutter
    const gridStrokeWidth = transformedData.length > 200 ? 0.4 : 0.6;
    const gridOpacity = transformedData.length > 200 ? 0.4 : 0.6;

    const getXAxisInterval = (dataLength, isChartOnly, isFullscreen) => {
      // Fullscreen mode: use normal view logic (more labels, wider space)
      if (isChartOnly && isFullscreen) {
        if (dataLength <= 15) return 0; // Show all labels
        if (dataLength <= 30) return 0; // Show all labels
        if (dataLength <= 60) return 1; // Show every 2nd label
        if (dataLength <= 100) return 2; // Show every 3rd label

        // For larger datasets, calculate interval to maintain reasonable label density
        const maxInterval = 2;
        const minLabels = Math.max(12, Math.ceil(dataLength / 10));
        const calculatedInterval = Math.max(1, Math.floor(dataLength / minLabels));

        return Math.min(maxInterval, calculatedInterval);
      }
      
      // Split-view (chartOnly but not fullscreen): show fewer labels due to narrower width
      if (isChartOnly) {
        if (dataLength <= 10) return 0; // Show all labels for very small datasets
        if (dataLength <= 30) return 2; // Show every 3rd label
        if (dataLength <= 60) return 4; // Show every 5th label
        if (dataLength <= 100) return 6; // Show every 7th label
        
        // For larger datasets in split-view, calculate interval to show fewer labels
        const maxInterval = 8; // Allow larger intervals in split-view
        const minLabels = Math.max(8, Math.ceil(dataLength / 15)); // Fewer labels in split-view
        const calculatedInterval = Math.max(2, Math.floor(dataLength / minLabels));
        
        return Math.min(maxInterval, calculatedInterval);
      }
      
      // Normal view: original logic
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

    const xAxisInterval = getXAxisInterval(transformedData.length, chartOnly, isFullscreenMode);

    // Generate explicit ticks array to ensure first and last are always included
    const generateXAxisTicks = () => {
      const tickIndices = [0]; // Always include first index
      const interval = xAxisInterval + 1; // Convert interval to step size
      const lastIndex = transformedData.length - 1;
      
      // Calculate minimum distance from first/last labels to prevent overlap
      // Use a smaller, more adaptive threshold for better spacing
      // In split-view, use smaller threshold; in fullscreen/normal, use slightly larger
      const minDistanceFromEnds = chartOnly && !isFullscreenMode
        ? Math.max(Math.ceil(transformedData.length * 0.03), 2) // 3% or min 2 for split-view
        : Math.max(Math.ceil(transformedData.length * 0.02), 1); // 2% or min 1 for fullscreen/normal
      
      console.log('🔍 X-Axis Debug (MarkdownStructuredMessage) - Data Length:', transformedData.length);
      console.log('🔍 X-Axis Debug (MarkdownStructuredMessage) - Calculated Interval:', xAxisInterval);
      console.log('🔍 X-Axis Debug (MarkdownStructuredMessage) - Step Size (interval + 1):', interval);
      console.log('🔍 X-Axis Debug (MarkdownStructuredMessage) - Min Distance From Ends:', minDistanceFromEnds);
      
      // Generate intermediate ticks with better spacing
      // Start from the interval, but adjust if too close to first
      let startIndex = interval;
      if (startIndex < minDistanceFromEnds) {
        // If the first interval tick is too close, start from a safe distance
        startIndex = minDistanceFromEnds;
      }
      
      // Similarly, ensure we don't go too close to the end
      let endIndex = lastIndex - minDistanceFromEnds;
      
      // Generate ticks with consistent spacing
      for (let i = startIndex; i <= endIndex; i += interval) {
        const distanceFromFirst = i - 0;
        const distanceFromLast = lastIndex - i;
        
        // Only add if it's far enough from both ends
        if (distanceFromFirst >= minDistanceFromEnds && distanceFromLast >= minDistanceFromEnds) {
          tickIndices.push(i);
        }
      }
      
      // If we have very few intermediate ticks, try to add one more in the middle
      if (tickIndices.length === 2 && lastIndex > minDistanceFromEnds * 2) {
        const middleIndex = Math.floor(lastIndex / 2);
        if (middleIndex > minDistanceFromEnds && middleIndex < lastIndex - minDistanceFromEnds) {
          tickIndices.splice(1, 0, middleIndex); // Insert in the middle
        }
      }
      
      // Always include last index if not already included
      if (tickIndices[tickIndices.length - 1] !== lastIndex) {
        tickIndices.push(lastIndex);
      }
      
      // CRITICAL: Validate that first index (0) is present
      if (tickIndices[0] !== 0) {
        console.error('❌ CRITICAL ERROR: First tick index is not 0!', tickIndices);
        tickIndices.unshift(0); // Force add first index at the beginning
      }
      
      // Sort indices to ensure proper order (in case of any edge cases)
      tickIndices.sort((a, b) => a - b);
      
      // Convert indices to actual data values (Recharts needs values, not indices)
      const ticks = tickIndices.map(index => transformedData[index]?.[xKey]);
      
      console.log('🔍 X-Axis Debug (MarkdownStructuredMessage) - Generated Tick Indices:', tickIndices);
      console.log('🔍 X-Axis Debug (MarkdownStructuredMessage) - Generated Tick Values:', ticks);
      console.log('🔍 X-Axis Debug (MarkdownStructuredMessage) - Tick Values Detail:', JSON.stringify(ticks, null, 2));
      console.log('🔍 X-Axis Debug (MarkdownStructuredMessage) - First Data Point:', transformedData[0]);
      console.log('🔍 X-Axis Debug (MarkdownStructuredMessage) - Last Data Point:', transformedData[lastIndex]);
      console.log('🔍 X-Axis Debug (MarkdownStructuredMessage) - X-Axis Key:', xKey);
      console.log('🔍 X-Axis Debug (MarkdownStructuredMessage) - First Label:', transformedData[0]?.[xKey]);
      console.log('🔍 X-Axis Debug (MarkdownStructuredMessage) - Last Label:', transformedData[lastIndex]?.[xKey]);
      console.log('🔍 X-Axis Debug (MarkdownStructuredMessage) - First Tick in Array:', ticks[0]);
      console.log('🔍 X-Axis Debug (MarkdownStructuredMessage) - Last Tick in Array:', ticks[ticks.length - 1]);
      
      return ticks;
    };

    const xAxisTicks = generateXAxisTicks();

    // Determine chart height based on context and screen size
    const getChartHeight = () => {
      const screenHeight = window.innerHeight;
      let calculatedHeight;

      if (chartOnly) {
        // In chart-only mode (fullscreen, split view), use responsive heights
        if (screenHeight <= 600) {
          calculatedHeight = 720;
        } else if (screenHeight <= 800) {
          calculatedHeight = 1100;
        } else if (screenHeight >= 1400) {
          calculatedHeight = 1500;
        } else if (screenHeight >= 1200) {
          calculatedHeight = 1300;
        } else {
          calculatedHeight = 720; // Default for chart-only mode
        }
      } else {
        // In normal view, use fixed heights
        calculatedHeight = isMultiAxis ? 750 : (isMultiline ? 700 : 600);
      }

      console.log("Chart height calculation:", {
        chartOnly,
        screenHeight,
        calculatedHeight,
        isMultiAxis,
        isMultiline
      });

      return calculatedHeight;
    };

      return (
      <div 
        ref={setChartContainerRef}
        style={{
          width: "100%",
          height: getChartHeight(),
          minWidth: "300px",
          maxWidth: "100%",
          marginBottom: "30px"
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={transformedData}
            margin={{
              top: 20,
              right: isMultiAxis ? 60 : 30, // Increased to prevent last label cutoff
              // In chart-only mode (split view/fullscreen), need more left margin due to narrower layout
              // Extra margin needed for rotated first label (-35 degrees with textAnchor="end")
              left: chartOnly 
                ? (isMultiAxis ? 120 : 110)  // Split view/fullscreen: extra margin for rotated first label
                : (isMultiAxis ? 80 : 70),   // Normal view: standard margin
              bottom: 150
            }}
            syncId="multiAxisChart"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              strokeWidth={gridStrokeWidth}
              opacity={gridOpacity}
            />
            <XAxis
              dataKey={xKey}
              angle={-35}
              textAnchor="end"
              ticks={xAxisTicks}
              height={80}
              tick={{ fontSize: 11 }}
              interval={0}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke={axisColors.left}
              tick={{ fontSize: 12 }}
              domain={axisDomains.left || 'auto'}
              tickCount={TICK_COUNT}
              ticks={leftTicks}
              tickFormatter={integerTickFormatter}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={axisColors.right}
              tick={{ fontSize: 12 }}
              domain={axisDomains.right || 'auto'}
              tickCount={TICK_COUNT}
              ticks={rightTicks}
              tickFormatter={integerTickFormatter}
            />
            {!isMultiAxis && (
              <YAxis
                tick={{ fontSize: 12 }}
                domain={axisDomains.single || 'auto'}
                tickCount={TICK_COUNT}
                ticks={singleTicks}
                tickFormatter={integerTickFormatter}
              />
            )}
            <Tooltip
              content={({ payload, label }) => {
                if (!payload || payload.length === 0) return null;
                const point = payload[0].payload;

                // Format numeric values for better display
                const formatValue = (value) => {
                  if (typeof value === 'number') {
                    return value % 1 === 0 ? value.toString() : value.toFixed(3);
                  }
                  return value;
                };

                return (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid #ccc",
                      padding: 12,
                      borderRadius: 6,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      minWidth: "200px"
                    }}
                  >
                    <strong style={{ fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                      {label}
                    </strong>
                    {yKeys.map((keyItem) => {
                      const k = getKeyName(keyItem);
                      return (
                        <div key={k} style={{ margin: '4px 0', fontSize: '13px' }}>
                          <span style={{ fontWeight: '500' }}>
                            {k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                          </span>{' '}
                          <span style={{ color: '#2563eb' }}>
                            {formatValue(point[k])}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              content={({ payload }) => {
                // Build legend entries from series meta to control dashed icons
                const entries = seriesMeta.map(s => ({
                  value: s.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  color: s.color,
                  isDotted: s.isDotted
                }));
                return (
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingBottom: 8, marginTop: -10, justifyContent: 'center' }}>
                    {entries.map((e) => (
                      <div key={e.value} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* custom swatch showing solid or dashed line */}
                        <svg width="28" height="10" viewBox="0 0 28 10">
                          <line x1="0" y1="5" x2="28" y2="5" stroke={e.color} strokeWidth="3" strokeDasharray={e.isDotted ? '6 4' : '0'} />
                        </svg>
                        <span style={{ fontSize: 12 }}>{e.value}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            {renderSeries()}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    );
  });





  // Memoize the heavy parsing operations to prevent re-renders when typing
  const { parsedContent, chartSections } = useMemo(() => {
    let parsedContent, chartSections = [];

    // Check if this is a pure JSON message (format 1, 2, or 3)
    if (message.text.startsWith('{')) {
      try {
        const jsonData = JSON.parse(message.text);
        console.log("MarkdownStructuredMessage - Pure JSON data:", jsonData);

        // Database_response processing removed - only handle chart/summary JSON now

        parsedContent = {
          beforeText: '',
          jsonData: jsonData,
          jsonDataArray: [jsonData],
          afterText: '',
          textSegments: []
        };

        // Format 3: Chart/Table format
        if (jsonData.chart || jsonData.table) {
          console.log("Detected chart/table format:", jsonData);
          chartSections.push({
            chartData: jsonData.chart,
            tableData: jsonData.table,
            summary: jsonData.summary,
            hasChart: !!jsonData.chart,
            hasTable: !!jsonData.table,
            hasSummary: !!jsonData.summary,
            jsonData: jsonData,
            formatType: 'chart_table'
          });
        }
        // Format 4: Summary-only format (when chart fails but summary exists)
        else if (jsonData.summary && (jsonData.type || jsonData.meta)) {
          console.log("Detected summary-only format:", jsonData);
          chartSections.push({
            chartData: null,
            tableData: null,
            summary: jsonData.summary,
            hasChart: false,
            hasTable: false,
            hasSummary: true,
            jsonData: jsonData,
            formatType: 'summary_only'
          });
        }
        // Format 1: Simple report format
        else if (jsonData.report) {
          console.log("Detected report format:", jsonData);
          parsedContent.textSegments.push({
            text: jsonData.report,
            position: 0,
            type: 'report'
          });
        }
      } catch (error) {
        console.error("Error parsing pure JSON:", error);
        // Treat as plain text if JSON parsing fails
        parsedContent = {
          beforeText: message.text,
          jsonData: null,
          jsonDataArray: [],
          afterText: '',
          textSegments: [{ text: message.text, position: 0, type: 'text' }]
        };
      }
    } else {
      // Mixed content or plain text - parse using streaming response parser
      parsedContent = parseStreamingResponse(message.text);

      // Create chart sections for each valid JSON data found
      parsedContent.jsonDataArray.forEach((jsonData) => {
        if (jsonData.chart) {
          console.log("Detected chart format in mixed content:", jsonData);
          chartSections.push({
            chartData: jsonData.chart,
            summary: jsonData.summary,
            hasChart: !!jsonData.chart,
            hasSummary: !!jsonData.summary,
            jsonData: jsonData,
            position: jsonData.position,
            formatType: 'chart_only'
          });
        }
      });
    }

    return { parsedContent, chartSections };
  }, [message.text]); // Only re-compute when message.text changes

  const { beforeText, afterText, textSegments } = parsedContent;

  console.log("MarkdownStructuredMessage - Parsed content:", parsedContent);
  console.log("MarkdownStructuredMessage - Chart sections:", chartSections);

  // Helper function to render content segments in order
  const renderContentInOrder = () => {
    const elements = [];

    // If chartOnly mode, only render charts (no summaries, no text)
    if (chartOnly) {
      chartSections.forEach((section, index) => {
        if (section.hasChart) {
          elements.push(renderChartSection(section, index, true)); // Pass chartOnly flag
        }
      });
      return elements;
    }

    // If splitView mode, only render text content (charts will be in right panel)
    if (splitView) {
      // Collect all text content for typewriter effect
      let allTextContent = '';

      // Collect text segments
      textSegments.forEach((segment) => {
        if (segment.text) {
          allTextContent += segment.text + '\n\n';
        }
      });

      // Collect summary text from chart sections
      chartSections.forEach((section) => {
        if (section.hasSummary && section.summary) {
          allTextContent += section.summary + '\n\n';
        }
      });

      // If no text segments but we have beforeText or afterText, collect them
      if (textSegments.length === 0) {
        if (beforeText) {
          allTextContent += beforeText + '\n\n';
        }
        if (afterText) {
          allTextContent += afterText + '\n\n';
        }
      }

      // If we still have no content, try to extract text from the raw message
      if (!allTextContent.trim() && message.text) {
        // Try to extract non-JSON text content
        const textContent = message.text.replace(/\{[^{}]*\}/g, '').trim();
        if (textContent) {
          allTextContent = textContent;
        }
      }

      // Render with typewriter effect
      if (allTextContent.trim()) {
        elements.push(
          <div key="typewriter-text" className="message-text">
            <TypewriterText
              text={allTextContent.trim()}
              speed={30}
              maxDuration={10000}
              className="split-view-typewriter"
              enableAnimation={true}
              animationKey={message.timestamp || message.id || `msg-${Date.now()}`}
            />
          </div>
        );
      }

      return elements;
    }

    // Normal mode: render everything in order
    if (chartSections.length > 0 || textSegments.length > 0) {
      // Create a combined array of all content elements with their positions
      const allElements = [
        ...textSegments.map(seg => ({ ...seg, elementType: 'text' })),
        ...chartSections.map(section => ({
          ...section,
          elementType: 'chart',
          position: section.position || 0
        }))
      ].sort((a, b) => a.position - b.position);

      allElements.forEach((element, index) => {
        if (element.elementType === 'text') {
          elements.push(
            <div key={`text-${index}`} className="message-text markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{element.text}</ReactMarkdown>
            </div>
          );
        } else if (element.elementType === 'chart') {
          elements.push(renderChartSection(element, index, false));
        }
      });
    } else {
      // Fallback to simple text rendering
      if (beforeText) {
        elements.push(
          <div key="before-text" className="message-text markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{beforeText}</ReactMarkdown>
          </div>
        );
      }
      if (afterText) {
        elements.push(
          <div key="after-text" className="message-text markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{afterText}</ReactMarkdown>
          </div>
        );
      }
    }

    return elements;
  };

  // Helper function to render a chart section
  const renderChartSection = (section, index, isChartOnly = false) => {

    return (
      <div key={`chart-section-${index}`} className={isChartOnly ? 'chart-only-section' : ''}>
        {/* Chart section - new format */}
        {section.hasChart && section.chartData ? (
          <div className={`message-chart ${isChartOnly ? 'chart-only' : ''}`}>
            {!isChartOnly && (
              <div className="chart-header">
                <div className="chart-title">
                  <FiBarChart2 className="chart-icon" />
                  <h4>Data Visualization {chartSections.length > 1 ? `${index + 1} ` : ''}({
                    section.jsonData?.type?.toUpperCase() === 'MULTIAXIS' ? 'MULTIAXIS' :
                    section.chartData.chartType?.toUpperCase() || 'CHART'
                  })</h4>
                </div>
                <div className="chart-controls">
                  {canToggleSplitView && onSplitViewToggle && (
                    <button
                      onClick={() => onSplitViewToggle(message)}
                      className={`chart-control-btn split-view-btn ${isSplitViewActive ? 'active' : ''}`}
                      title={isSplitViewActive ? "Exit split view" : "Open in split view"}
                    >
                      {isSplitViewActive ? <FiEye /> : <FiColumns />}
                    </button>
                  )}
                  <button
                    onClick={() => onFullscreen ? onFullscreen(message) : setIsModalOpen(true)}
                    className="chart-control-btn fullscreen-btn"
                    title="Open in fullscreen"
                  >
                    <FiMaximize2 />
                  </button>
                </div>
              </div>
            )}
            <div className={`chart-container ${isChartOnly ? 'chart-only-container' : ''}`}>
              <DynamicChart
                chartData={section.chartData}
                messageType={section.jsonData?.type}
              />
            </div>
          </div>
        ) : null}

        {/* Summary section - NEVER render in chartOnly mode */}
        {!isChartOnly && section.hasSummary && section.summary && (
          <div className="message-text markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.summary}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  // For chartOnly mode, return just the chart content without wrapper
  if (chartOnly) {
    return (
      <div
        ref={messageRef}
        className="chart-only-container"
        style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}
      >
        {renderContentInOrder()}

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
      </div>
    );
  }

  return (
    <div
      ref={messageRef}
      className={`message-bubble ai-bubble markdown ${chartSections.length > 0 ? 'chart-message' : ''} ${splitView ? 'split-view-message' : ''}`}
      style={{ position: 'relative' }}
    >
      {renderContentInOrder()}

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

      {/* Timestamp - only show in normal mode */}
      {!splitView && (
        <div className="message-timestamp">{formatTime(message.timestamp)}</div>
      )}

      {/* Fullscreen Chart Modal */}
      <FullscreenChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        message={message}
        formatTime={formatTime}
        darkMode={darkMode}
      />
    </div>
  );
};

export default React.memo(MarkdownStructuredMessage);
