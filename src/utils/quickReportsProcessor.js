// Utility functions for processing quick reports API responses

export const processQuickReportsResponse = (apiResponse) => {
  try {
    console.log("Processing quick reports response:", apiResponse);

    if (!apiResponse || !Array.isArray(apiResponse) || apiResponse.length === 0) {
      throw new Error("Invalid API response format");
    }

    const responseData = apiResponse[0]; // Get the first item from the array

    if (!responseData.analysis) {
      throw new Error("No analysis data found in response");
    }

    const { analysis } = responseData;
    const { chart, summary, type } = analysis;

    // Process chart data for rendering - handle empty data arrays gracefully
    let processedChart = null;
    let isSummaryOnly = false;
    
    if (chart) {
      // Check if chart data is empty or invalid
      if (!chart.data || !Array.isArray(chart.data) || chart.data.length === 0) {
        // Chart data is empty - this is valid for summary-only responses
        isSummaryOnly = true;
        // Return null for chart when data is empty
        processedChart = null;
      } else {
        // Chart data exists - process normally
        processedChart = processChartData(chart);
      }
    }

    return {
      chart: processedChart,
      summary: summary || "",
      type: type || "multiaxis",
      rawData: chart?.data || [],
      dependent: responseData.dependent,
      independent: responseData.independent,
      isSummaryOnly: isSummaryOnly
    };
  } catch (error) {
    console.error("Error processing quick reports response:", error);
    throw error;
  }
};

const processChartData = (chartData) => {
  if (!chartData) {
    throw new Error("No chart data found");
  }

  const { chartType, data, xKey, yKeys } = chartData;

  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error("Invalid chart data");
  }

  // Process yKeys to handle dotted lines and preserve color information
  const processedYKeys = yKeys.map(yKey => {
    if (typeof yKey === 'object' && yKey.axis && yKey.key) {
      return {
        ...yKey,
        isDotted: yKey.axis.includes('dotted'),
        actualAxis: yKey.axis.replace('-dotted', ''),
        // Preserve color if provided in the API response
        color: yKey.color || undefined
      };
    }
    return yKey;
  });

  return {
    chartType: chartType || "line",
    data: data,
    xKey: xKey || "Date",
    yKeys: processedYKeys
  };
};

// Generate chart string for DynamicBackendChartRenderer compatibility
export const generateChartString = (chartData) => {
  const { chartType, xKey, yKeys } = chartData;

  // Determine if it's multi-axis
  const isMultiAxis = yKeys.some(yKey =>
    typeof yKey === 'object' && yKey.axis && (yKey.axis.includes('left') || yKey.axis.includes('right'))
  );

  let chartString = `<LineChart width="100%" height={400} dataKey="${xKey}"`;

  if (isMultiAxis) {
    chartString += ' multiaxis="true"';
  }

  chartString += '>';

  // Add lines
  yKeys.forEach((yKey, index) => {
    if (typeof yKey === 'object' && yKey.key) {
      const defaultColors = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#ea580c'];

      // Use the color from yKey if provided, otherwise use default colors
      const color = yKey.color || defaultColors[index % defaultColors.length];

      chartString += `<Line dataKey="${yKey.key}" stroke="${color}"`;

      if (yKey.axis) {
        chartString += ` yAxisId="${yKey.axis}"`;
      }

      chartString += '/>';
    }
  });

  chartString += '</LineChart>';

  console.log("Generated chart string:", chartString);
  return chartString;
};

// Map option IDs to API parameters
export const getAPIParameters = (optionId) => {
  const parameterMap = {
    // SARIMAX options
    'sarimax-arabica-ice-stu': {
      dependent: 'ice_month_2_price',
      independent: 'stu',
      type: 'SARIMAX'
    },
    'sarimax-arabica-ice-funds': {
      dependent: 'ice_month_2_price',
      independent: 'stu_net_funds',
      type: 'SARIMAX'
    },
    'sarimax-robusta-liffe-stu': {
      dependent: 'liffe_month_2_price',
      independent: 'stu',
      type: 'SARIMAX'
    },
    'sarimax-robusta-liffe-funds': {
      dependent: 'liffe_month_2_price',
      independent: 'stu_net_funds',
      type: 'SARIMAX'
    },
    'sarimax-ico-price-world-stock': {
      dependent: 'ico_price',
      independent: 'cop_total_world_stock',
      type: 'SARIMAX'
    },
    // SARIMAX - Daily Open Interest & Cert Stock
    'sarimax-daily-oi-cert-stock-arabica': {
      dependent: 'arabica_daily',
      independent: 'certified_oi',
      type: 'SARIMAX',
      commodity: 'ARABICA'
    },
    'sarimax-daily-oi-cert-stock-robusta': {
      dependent: 'robusta_daily',
      independent: 'certified_oi',
      type: 'SARIMAX',
      commodity: 'ROBUSTA'
    },
    // Simple Linear Regression options
    'slr-arabica-ice-stu': {
      dependent: 'ice_month_2_price',
      independent: 'stu',
      type: 'SLR'
    },
    'slr-arabica-ice-funds': {
      dependent: 'ice_month_2_price',
      independent: 'stu_net_funds',
      type: 'SLR'
    },
    'slr-robusta-liffe-stu': {
      dependent: 'liffe_month_2_price',
      independent: 'stu',
      type: 'SLR'
    },
    'slr-robusta-liffe-funds': {
      dependent: 'liffe_month_2_price',
      independent: 'stu_net_funds',
      type: 'SLR'
    },
    'slr-ico-price-world-stock': {
      dependent: 'ico_price',
      independent: 'cop_total_world_stock',
      type: 'SLR'
    },
    // SLR - Daily Open Interest & Cert Stock
    'slr-daily-oi-cert-stock-arabica': {
      dependent: 'arabica_daily',
      independent: 'certified_oi',
      type: 'SLR',
      commodity: 'ARABICA'
    },
    'slr-daily-oi-cert-stock-robusta': {
      dependent: 'robusta_daily',
      independent: 'certified_oi',
      type: 'SLR',
      commodity: 'ROBUSTA'
    },
    // XGBOOST options
    'xgboost-arabica-ice-stu': {
      dependent: 'ice_month_2_price',
      independent: 'stu',
      type: 'XGBOOST'
    },
    'xgboost-arabica-ice-funds': {
      dependent: 'ice_month_2_price',
      independent: 'stu_net_funds',
      type: 'XGBOOST'
    },
    'xgboost-robusta-liffe-stu': {
      dependent: 'liffe_month_2_price',
      independent: 'stu',
      type: 'XGBOOST'
    },
    'xgboost-robusta-liffe-funds': {
      dependent: 'liffe_month_2_price',
      independent: 'stu_net_funds',
      type: 'XGBOOST'
    },
    'xgboost-ico-price-world-stock': {
      dependent: 'ico_price',
      independent: 'cop_total_world_stock',
      type: 'XGBOOST'
    },
    // XGBOOST - Daily Open Interest & Cert Stock
    'xgboost-daily-oi-cert-stock-arabica': {
      dependent: 'arabica_daily',
      independent: 'certified_oi',
      type: 'XGBOOST',
      commodity: 'ARABICA'
    },
    'xgboost-daily-oi-cert-stock-robusta': {
      dependent: 'robusta_daily',
      independent: 'certified_oi',
      type: 'XGBOOST',
      commodity: 'ROBUSTA'
    },
    // GFS Arabica - XGBOOST
    'xgboost-gfs-arabica-dnd5': { dependent: 'gfs_price', independent: 'dnd5', type: 'XGBOOST', commodity: 'ARABICA' },
    'xgboost-gfs-arabica-todnd10': { dependent: 'gfs_price', independent: 'todnd10', type: 'XGBOOST', commodity: 'ARABICA' },
    'xgboost-gfs-arabica-todnd15': { dependent: 'gfs_price', independent: 'todnd15', type: 'XGBOOST', commodity: 'ARABICA' },
    'xgboost-gfs-arabica-certified_rain15d': { dependent: 'gfs_price', independent: 'certified_rain15d_todnd15', type: 'XGBOOST', commodity: 'ARABICA' },
    // GFS Robusta - XGBOOST
    'xgboost-gfs-robusta-dnd5': { dependent: 'gfs_price', independent: 'dnd5', type: 'XGBOOST', commodity: 'ROBUSTA' },
    'xgboost-gfs-robusta-todnd10': { dependent: 'gfs_price', independent: 'todnd10', type: 'XGBOOST', commodity: 'ROBUSTA' },
    'xgboost-gfs-robusta-todnd15': { dependent: 'gfs_price', independent: 'todnd15', type: 'XGBOOST', commodity: 'ROBUSTA' },
    'xgboost-gfs-robusta-certified_rain15d': { dependent: 'gfs_price', independent: 'certified_rain15d_todnd15', type: 'XGBOOST', commodity: 'ROBUSTA' },
    // GFS Arabica - SARIMAX
    'sarimax-gfs-arabica-dnd5': { dependent: 'gfs_price', independent: 'dnd5', type: 'SARIMAX', commodity: 'ARABICA' },
    'sarimax-gfs-arabica-dnd10': { dependent: 'gfs_price', independent: 'dnd10', type: 'SARIMAX', commodity: 'ARABICA' },
    'sarimax-gfs-arabica-dnd15': { dependent: 'gfs_price', independent: 'dnd15', type: 'SARIMAX', commodity: 'ARABICA' },
    'sarimax-gfs-arabica-todnd10': { dependent: 'gfs_price', independent: 'todnd10', type: 'SARIMAX', commodity: 'ARABICA' },
    'sarimax-gfs-arabica-todnd15': { dependent: 'gfs_price', independent: 'todnd15', type: 'SARIMAX', commodity: 'ARABICA' },
    'sarimax-gfs-arabica-certified_rain15d': { dependent: 'gfs_price', independent: 'certified_rain15d_todnd15', type: 'SARIMAX', commodity: 'ARABICA' },
    'sarimax-gfs-arabica-certified_rain15d_rsi': { dependent: 'gfs_price', independent: 'certified_rain15d_todnd15_rsi', type: 'SARIMAX', commodity: 'ARABICA' },
    // GFS Robusta - SARIMAX
    'sarimax-gfs-robusta-dnd5': { dependent: 'gfs_price', independent: 'dnd5', type: 'SARIMAX', commodity: 'ROBUSTA' },
    'sarimax-gfs-robusta-dnd10': { dependent: 'gfs_price', independent: 'dnd10', type: 'SARIMAX', commodity: 'ROBUSTA' },
    'sarimax-gfs-robusta-dnd15': { dependent: 'gfs_price', independent: 'dnd15', type: 'SARIMAX', commodity: 'ROBUSTA' },
    'sarimax-gfs-robusta-todnd10': { dependent: 'gfs_price', independent: 'todnd10', type: 'SARIMAX', commodity: 'ROBUSTA' },
    'sarimax-gfs-robusta-todnd15': { dependent: 'gfs_price', independent: 'todnd15', type: 'SARIMAX', commodity: 'ROBUSTA' },
    'sarimax-gfs-robusta-certified_rain15d': { dependent: 'gfs_price', independent: 'certified_rain15d_todnd15', type: 'SARIMAX', commodity: 'ROBUSTA' },
    'sarimax-gfs-robusta-certified_rain15d_rsi': { dependent: 'gfs_price', independent: 'certified_rain15d_todnd15_rsi', type: 'SARIMAX', commodity: 'ROBUSTA' },
    // GFS Raw Sugar (SUGAR NY) - SARIMAX
    'sarimax-gfs-raw-sugar-dnd5': { dependent: 'gfs_price', independent: 'dnd5', type: 'SARIMAX', commodity: 'SUGAR NY' },
    'sarimax-gfs-raw-sugar-todnd10': { dependent: 'gfs_price', independent: 'todnd10', type: 'SARIMAX', commodity: 'SUGAR NY' },
    'sarimax-gfs-raw-sugar-todnd15': { dependent: 'gfs_price', independent: 'todnd15', type: 'SARIMAX', commodity: 'SUGAR NY' },
    'sarimax-gfs-raw-sugar-rain15d_todnd15': { dependent: 'gfs_price', independent: 'rain15d_todnd15', type: 'SARIMAX', commodity: 'SUGAR NY' },
    'sarimax-gfs-raw-sugar-rain15d_todnd15_rsi': { dependent: 'gfs_price', independent: 'rain15d_todnd15_rsi_arbitrage', type: 'SARIMAX', commodity: 'SUGAR NY' },

    // GFS Arabica - SLR
    'slr-gfs-arabica-dnd5': { dependent: 'gfs_price', independent: 'dnd5', type: 'SLR', commodity: 'ARABICA' },
    'slr-gfs-arabica-dnd10': { dependent: 'gfs_price', independent: 'dnd10', type: 'SLR', commodity: 'ARABICA' },
    'slr-gfs-arabica-dnd15': { dependent: 'gfs_price', independent: 'dnd15', type: 'SLR', commodity: 'ARABICA' },
    'slr-gfs-arabica-todnd10': { dependent: 'gfs_price', independent: 'todnd10', type: 'SLR', commodity: 'ARABICA' },
    'slr-gfs-arabica-todnd15': { dependent: 'gfs_price', independent: 'todnd15', type: 'SLR', commodity: 'ARABICA' },
    'slr-gfs-arabica-certified_rain15d': { dependent: 'gfs_price', independent: 'certified_rain15d_todnd15', type: 'SLR', commodity: 'ARABICA' },
    // GFS Robusta - SLR
    'slr-gfs-robusta-dnd5': { dependent: 'gfs_price', independent: 'dnd5', type: 'SLR', commodity: 'ROBUSTA' },
    'slr-gfs-robusta-dnd10': { dependent: 'gfs_price', independent: 'dnd10', type: 'SLR', commodity: 'ROBUSTA' },
    'slr-gfs-robusta-dnd15': { dependent: 'gfs_price', independent: 'dnd15', type: 'SLR', commodity: 'ROBUSTA' },
    'slr-gfs-robusta-todnd10': { dependent: 'gfs_price', independent: 'todnd10', type: 'SLR', commodity: 'ROBUSTA' },
    'slr-gfs-robusta-todnd15': { dependent: 'gfs_price', independent: 'todnd15', type: 'SLR', commodity: 'ROBUSTA' },
    'slr-gfs-robusta-certified_rain15d': { dependent: 'gfs_price', independent: 'certified_rain15d_todnd15', type: 'SLR', commodity: 'ROBUSTA' }
    ,
    // GFS Raw Sugar (SUGAR NY) - SLR
    'slr-gfs-raw-sugar-dnd5': { dependent: 'gfs_price', independent: 'dnd5', type: 'SLR', commodity: 'SUGAR NY' },
    'slr-gfs-raw-sugar-todnd10': { dependent: 'gfs_price', independent: 'todnd10', type: 'SLR', commodity: 'SUGAR NY' },
    'slr-gfs-raw-sugar-todnd15': { dependent: 'gfs_price', independent: 'todnd15', type: 'SLR', commodity: 'SUGAR NY' },
    'slr-gfs-raw-sugar-rain15d_todnd15': { dependent: 'gfs_price', independent: 'rain15d_todnd15', type: 'SLR', commodity: 'SUGAR NY' },
    'slr-gfs-raw-sugar-rain15d_todnd15_rsi': { dependent: 'gfs_price', independent: 'rain15d_todnd15_rsi_arbitrage', type: 'SLR', commodity: 'SUGAR NY' },
    // GFS White Sugar (SUGAR LN) - SLR
    'slr-gfs-white-sugar-dnd5': { dependent: 'gfs_price', independent: 'dnd5', type: 'SLR', commodity: 'SUGAR LN' },
    'slr-gfs-white-sugar-todnd10': { dependent: 'gfs_price', independent: 'todnd10', type: 'SLR', commodity: 'SUGAR LN' },
    'slr-gfs-white-sugar-todnd15': { dependent: 'gfs_price', independent: 'todnd15', type: 'SLR', commodity: 'SUGAR LN' },
    'slr-gfs-white-sugar-rain15d_todnd15': { dependent: 'gfs_price', independent: 'rain15d_todnd15', type: 'SLR', commodity: 'SUGAR LN' },
    'slr-gfs-white-sugar-rain15d_todnd15_rsi': { dependent: 'gfs_price', independent: 'rain15d_todnd15_rsi', type: 'SLR', commodity: 'SUGAR LN' },
    // GFS Raw Sugar (SUGAR NY) - XGBOOST
    'xgboost-gfs-raw-sugar-dnd5': { dependent: 'gfs_price', independent: 'dnd5', type: 'XGBOOST', commodity: 'SUGAR NY' },
    'xgboost-gfs-raw-sugar-todnd10': { dependent: 'gfs_price', independent: 'todnd10', type: 'XGBOOST', commodity: 'SUGAR NY' },
    'xgboost-gfs-raw-sugar-todnd15': { dependent: 'gfs_price', independent: 'todnd15', type: 'XGBOOST', commodity: 'SUGAR NY' },
    'xgboost-gfs-raw-sugar-rain15d_todnd15': { dependent: 'gfs_price', independent: 'rain15d_todnd15', type: 'XGBOOST', commodity: 'SUGAR NY' },
    'xgboost-gfs-raw-sugar-rain15d_todnd15_rsi': { dependent: 'gfs_price', independent: 'rain15d_todnd15_rsi_arbitrage', type: 'XGBOOST', commodity: 'SUGAR NY' },
    // GFS White Sugar (SUGAR LN) - XGBOOST
    'xgboost-gfs-white-sugar-dnd5': { dependent: 'gfs_price', independent: 'dnd5', type: 'XGBOOST', commodity: 'SUGAR LN' },
    'xgboost-gfs-white-sugar-todnd10': { dependent: 'gfs_price', independent: 'todnd10', type: 'XGBOOST', commodity: 'SUGAR LN' },
    'xgboost-gfs-white-sugar-todnd15': { dependent: 'gfs_price', independent: 'todnd15', type: 'XGBOOST', commodity: 'SUGAR LN' },
    'xgboost-gfs-white-sugar-rain15d_todnd15': { dependent: 'gfs_price', independent: 'rain15d_todnd15', type: 'XGBOOST', commodity: 'SUGAR LN' },
    'xgboost-gfs-white-sugar-rain15d_todnd15_rsi': { dependent: 'gfs_price', independent: 'rain15d_todnd15_rsi', type: 'XGBOOST', commodity: 'SUGAR LN' }
  };

  return parameterMap[optionId] || null;
};

// Generate a user-friendly title for the report
export const generateReportTitle = (optionId) => {
  const titleMap = {
    // Time Series Model titles
    'sarimax-arabica-ice-stu': 'ICE Price vs STU Analysis',
    'sarimax-arabica-ice-funds': 'ICE Price vs Net Funds Position + STU Analysis',
    'sarimax-robusta-liffe-stu': 'LIFFE Price vs STU Analysis',
    'sarimax-robusta-liffe-funds': 'LIFFE Price vs Net Funds Position + STU Analysis',
    'sarimax-ico-price-world-stock': 'ICO Price vs STU + World Stock Analysis',
    'sarimax-daily-oi-cert-stock-arabica': 'Daily Open Interest & Certified Stock - Arabica',
    'sarimax-daily-oi-cert-stock-robusta': 'Daily Open Interest & Certified Stock - Robusta',
    // Linear Model titles
    'slr-arabica-ice-stu': 'ICE Price vs STU Analysis',
    'slr-arabica-ice-funds': 'ICE Price vs Net Funds Position + STU Analysis',
    'slr-robusta-liffe-stu': 'LIFFE Price vs STU Analysis',
    'slr-robusta-liffe-funds': 'LIFFE Price vs Net Funds Position + STU Analysis',
    'slr-ico-price-world-stock': 'ICO Price vs STU + World Stock Analysis',
    'slr-daily-oi-cert-stock-arabica': 'Daily Open Interest & Certified Stock - Arabica',
    'slr-daily-oi-cert-stock-robusta': 'Daily Open Interest & Certified Stock - Robusta',
    // Machine Learning Model (MLM) titles
    'xgboost-arabica-ice-stu': 'ICE Price vs STU Analysis',
    'xgboost-arabica-ice-funds': 'ICE Price vs Net Funds Position + STU Analysis',
    'xgboost-robusta-liffe-stu': 'LIFFE Price vs STU Analysis',
    'xgboost-robusta-liffe-funds': 'LIFFE Price vs Net Funds Position + STU Analysis',
    'xgboost-ico-price-world-stock': 'ICO Price vs STU + World Stock Analysis',
    'xgboost-daily-oi-cert-stock-arabica': 'Daily Open Interest & Certified Stock - Arabica',
    'xgboost-daily-oi-cert-stock-robusta': 'Daily Open Interest & Certified Stock - Robusta',
    // Machine Learning Model (MLM) GFS titles
    'xgboost-gfs-arabica-dnd5': 'GFS Arabica - Price vs DOD 5',
    'xgboost-gfs-arabica-todnd10': 'GFS Arabica - Price vs DOD up to 10',
    'xgboost-gfs-arabica-todnd15': 'GFS Arabica - Price vs DOD up to 15',
    'xgboost-gfs-arabica-certified_rain15d': 'GFS Arabica - Price vs Certified Stock + Rainfall + DOD',
    'xgboost-gfs-robusta-dnd5': 'GFS Robusta - Price vs DOD 5',
    'xgboost-gfs-robusta-todnd10': 'GFS Robusta - Price vs DOD up to 10',
    'xgboost-gfs-robusta-todnd15': 'GFS Robusta - Price vs DOD up to 15',
    'xgboost-gfs-robusta-certified_rain15d': 'GFS Robusta - Price vs Certified Stock + Rainfall + DOD',
    // GFS titles
    'sarimax-gfs-arabica-dnd5': 'GFS Arabica - Price vs DOD 5',
    'sarimax-gfs-arabica-dnd10': 'GFS Arabica - Price vs DOD 10',
    'sarimax-gfs-arabica-dnd15': 'GFS Arabica - Price vs DOD 15',
    'sarimax-gfs-arabica-todnd10': 'GFS Arabica - Price vs DOD up to 10',
    'sarimax-gfs-arabica-todnd15': 'GFS Arabica - Price vs DOD up to 15',
    'sarimax-gfs-arabica-certified_rain15d': 'GFS Arabica - Price vs Certified Stock + Rainfall + DOD',
    'sarimax-gfs-arabica-certified_rain15d_rsi': 'GFS Arabica - Price vs Certified Stock + Rainfall + DOD + RSI',
    'sarimax-gfs-robusta-dnd5': 'GFS Robusta - Price vs DOD 5',
    'sarimax-gfs-robusta-dnd10': 'GFS Robusta - Price vs DOD 10',
    'sarimax-gfs-robusta-dnd15': 'GFS Robusta - Price vs DOD 15',
    'sarimax-gfs-robusta-todnd10': 'GFS Robusta - Price vs DOD up to 10',
    'sarimax-gfs-robusta-todnd15': 'GFS Robusta - Price vs DOD up to 15',
    'sarimax-gfs-robusta-certified_rain15d': 'GFS Robusta - Price vs Certified Stock + Rainfall + DOD',
    'sarimax-gfs-robusta-certified_rain15d_rsi': 'GFS Robusta - Price vs Certified Stock + Rainfall + DOD + RSI',
    'slr-gfs-arabica-dnd5': 'GFS Arabica - Price vs DOD 5',
    'slr-gfs-arabica-dnd10': 'GFS Arabica - Price vs DOD 10',
    'slr-gfs-arabica-dnd15': 'GFS Arabica - Price vs DOD 15',
    'slr-gfs-arabica-todnd10': 'GFS Arabica - Price vs DOD up to 10',
    'slr-gfs-arabica-todnd15': 'GFS Arabica - Price vs DOD up to 15',
    'slr-gfs-robusta-dnd5': 'GFS Robusta - Price vs DOD 5',
    'slr-gfs-robusta-dnd10': 'GFS Robusta - Price vs DOD 10',
    'slr-gfs-robusta-dnd15': 'GFS Robusta - Price vs DOD 15',
    'slr-gfs-robusta-todnd10': 'GFS Robusta - Price vs DOD up to 10',
    'slr-gfs-robusta-todnd15': 'GFS Robusta - Price vs DOD up to 15'
    ,
    // GFS Sugar titles
    'sarimax-gfs-raw-sugar-dnd5': 'Raw Sugar - Weather Forecast 5 days',
    'sarimax-gfs-raw-sugar-todnd10': 'Raw Sugar - Weather Forecast 10 days',
    'sarimax-gfs-raw-sugar-todnd15': 'Raw Sugar - Weather Forecast 15 days',
    'sarimax-gfs-raw-sugar-rain15d_todnd15': 'Raw Sugar - Weather Forecast + Realized Rain',
    'sarimax-gfs-raw-sugar-rain15d_todnd15_rsi': 'Raw Sugar - Weather Forecast + Realized Rain + RSI + Whites Premium',
    'sarimax-gfs-white-sugar-dnd5': 'White Sugar - Weather Forecast 5 days',
    'sarimax-gfs-white-sugar-todnd10': 'White Sugar - Weather Forecast 10 days',
    'sarimax-gfs-white-sugar-todnd15': 'White Sugar - Weather Forecast 15 days',
    'sarimax-gfs-white-sugar-rain15d_todnd15': 'White Sugar - Weather Forecast + Realized Rain',
    'sarimax-gfs-white-sugar-rain15d_todnd15_rsi': 'White Sugar - Weather Forecast + Realized Rain + RSI',
    'slr-gfs-raw-sugar-dnd5': 'Raw Sugar - Weather Forecast 5 days',
    'slr-gfs-raw-sugar-todnd10': 'Raw Sugar - Weather Forecast 10 days',
    'slr-gfs-raw-sugar-todnd15': 'Raw Sugar - Weather Forecast 15 days',
    'slr-gfs-raw-sugar-rain15d_todnd15': 'Raw Sugar - Weather Forecast + Realized Rain',
    'slr-gfs-raw-sugar-rain15d_todnd15_rsi': 'Raw Sugar - Weather Forecast + Realized Rain + RSI + Whites Premium',
    'slr-gfs-white-sugar-dnd5': 'White Sugar - Weather Forecast 5 days',
    'slr-gfs-white-sugar-todnd10': 'White Sugar - Weather Forecast 10 days',
    'slr-gfs-white-sugar-todnd15': 'White Sugar - Weather Forecast 15 days',
    'slr-gfs-white-sugar-rain15d_todnd15': 'White Sugar - Weather Forecast + Realized Rain',
    'slr-gfs-white-sugar-rain15d_todnd15_rsi': 'White Sugar - Weather Forecast + Realized Rain + RSI',
    'xgboost-gfs-raw-sugar-dnd5': 'Raw Sugar - Weather Forecast 5 days',
    'xgboost-gfs-raw-sugar-todnd10': 'Raw Sugar - Weather Forecast 10 days',
    'xgboost-gfs-raw-sugar-todnd15': 'Raw Sugar - Weather Forecast 15 days',
    'xgboost-gfs-raw-sugar-rain15d_todnd15': 'Raw Sugar - Weather Forecast + Realized Rain',
    'xgboost-gfs-raw-sugar-rain15d_todnd15_rsi': 'Raw Sugar - Weather Forecast + Realized Rain + RSI + Whites Premium',
    'xgboost-gfs-white-sugar-dnd5': 'White Sugar - Weather Forecast 5 days',
    'xgboost-gfs-white-sugar-todnd10': 'White Sugar - Weather Forecast 10 days',
    'xgboost-gfs-white-sugar-todnd15': 'White Sugar - Weather Forecast 15 days',
    'xgboost-gfs-white-sugar-rain15d_todnd15': 'White Sugar - Weather Forecast + Realized Rain',
    'xgboost-gfs-white-sugar-rain15d_todnd15_rsi': 'White Sugar - Weather Forecast + Realized Rain + RSI'
  };

  return titleMap[optionId] || 'Quick Report Analysis';
};
