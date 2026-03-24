// Test data for chart rendering issues

export const testData1 = {
  "action": "Database_response",
  "report": "# ECMWF Forecasts for GIA LAI: Coffee Robusta in June and April## June 2025 Forecast- **State:** GIA LAI- **Total Rainfall:** 90.44 mm**CHART_TYPE:** BAR## Notes- The data provided only includes information for June 2025.- No data is available for April or for other years.- The forecast is specifically for Coffee Robusta in GIA LAI state.- Rainfall is a crucial factor for coffee cultivation, influencing crop yield and quality.To provide a more comprehensive analysis, additional data for April and other years would be necessary for comparison and trend identification.",
  "raw_data": [
    {
      "_id": "686cc36b8439986b82bbae45",
      "year": 2025,
      "month": 6,
      "state": "GIA LAI",
      "total_rainfall": 90.44
    }
  ]
};

export const testData2 = {
  "action": "Database_response",
  "report": "# Rainfall Comparison: Robusta vs Arabica in Espirito Santo, Brazil (April)## SummaryThis report analyzes the rainfall patterns for Robusta and Arabica coffee in Espirito Santo, Brazil, during April from 2000 to 2009. Key insights include:- Rainfall varies significantly year to year for both coffee types.- 2004 saw the highest rainfall for both Robusta (161.71 mm) and Arabica (120.23 mm).- The lowest rainfall for Robusta was in 2001 (28.56 mm), while for Arabica it was in 2002 (21.55 mm).- In most years, Robusta areas received more rainfall than Arabica areas.- There's no consistent trend of increasing or decreasing rainfall over the decade for either coffee type.- Some years show significant differences in rainfall between Robusta and Arabica areas, while others are more closely aligned.These variations in rainfall can have significant impacts on coffee production and quality, highlighting the importance of weather patterns in coffee cultivation in Espirito Santo.**CHART_TYPE:** LINE",
  "raw_data": [
    {
      "_id": 2000,
      "year": 2000,
      "robusta_rainfall": 92.78999999999999,
      "arabica_rainfall": 68.17
    },
    {
      "_id": 2001,
      "year": 2001,
      "robusta_rainfall": 28.560000000000002,
      "arabica_rainfall": 35.89
    },
    {
      "_id": 2002,
      "year": 2002,
      "robusta_rainfall": 49.91,
      "arabica_rainfall": 21.55
    },
    {
      "_id": 2003,
      "year": 2003,
      "robusta_rainfall": 55.8,
      "arabica_rainfall": 68.24000000000001
    },
    {
      "_id": 2004,
      "year": 2004,
      "robusta_rainfall": 161.70999999999998,
      "arabica_rainfall": 120.22999999999999
    },
    {
      "_id": 2005,
      "year": 2005,
      "robusta_rainfall": 54.97,
      "arabica_rainfall": 60.730000000000004
    },
    {
      "_id": 2006,
      "year": 2006,
      "robusta_rainfall": 50.09,
      "arabica_rainfall": 77.24
    },
    {
      "_id": 2007,
      "year": 2007,
      "robusta_rainfall": 103.57,
      "arabica_rainfall": 70.3
    },
    {
      "_id": 2008,
      "year": 2008,
      "robusta_rainfall": 95.25999999999999,
      "arabica_rainfall": 104.47
    },
    {
      "_id": 2009,
      "year": 2009,
      "robusta_rainfall": 150.9,
      "arabica_rainfall": 110.35
    }
  ]
};

// Test data with different variable names (trading_date scenario)
export const testData3 = {
  "action": "Database_response",
  "report": "# Price Difference Analysis\n\nThis chart shows price differences over trading dates.\n\n**CHART_TYPE:** LINE",
  "raw_data": [
    {
      "trading_date": "2025-01-02T00:00:00.000Z",
      "price_difference": 13.299999999999983,
    },
    {
      "trading_date": "2025-01-03T00:00:00.000Z",
      "price_difference": 5.449999999999989,
    },
    {
      "trading_date": "2025-01-04T00:00:00.000Z",
      "price_difference": 47.79999999999998,
    },
    {
      "trading_date": "2025-01-05T00:00:00.000Z",
      "price_difference": 9.150000000000034,
    }
  ]
};

// Test data with state as categorical x-axis
export const testData4 = {
  "action": "Database_response",
  "report": "# Average SMAP by State\n\nThis chart shows average SMAP values by state.\n\n**CHART_TYPE:** BAR",
  "raw_data": [
    {"avg_smap": 0.22499999999999998, "state": "ANDHRA PRADESH"},
    {"avg_smap": 0.2242222222222222, "state": "TAMIL NADU"},
    {"avg_smap": 0.2156789012345678, "state": "KARNATAKA"}
  ]
};

// Test data with multiple numeric values and mixed field types
export const testData5 = {
  "action": "Database_response",
  "report": "# Multi-metric Analysis by Month\n\nThis chart shows multiple metrics by month.\n\n**CHART_TYPE:** LINE",
  "raw_data": [
    {
      "month": 9,
      "rainfall_2024": 7.06,
      "temperature_avg": 25.5,
      "humidity_percent": 78.2,
      "state": "BAHIA"
    },
    {
      "month": 10,
      "rainfall_2024": 111.35,
      "temperature_avg": 27.8,
      "humidity_percent": 82.1,
      "state": "BAHIA"
    },
    {
      "month": 11,
      "rainfall_2024": 147.05,
      "temperature_avg": 29.2,
      "humidity_percent": 85.6,
      "state": "BAHIA"
    }
  ]
};

// Test data with multiple chart sections in one response
export const testDataMultipleCharts = `Here's the analysis you requested with multiple visualizations:

{"action": "Database_response", "report": "# First Chart: Rainfall by State\n\nThis shows total rainfall by different states.\n\n**CHART_TYPE:** BAR", "raw_data": [{"total_rainfall": 90.44, "state": "GIA LAI"}, {"total_rainfall": 120.33, "state": "CHAMPASAK"}, {"total_rainfall": 85.67, "state": "BAHIA"}]}

Based on the first chart, we can see the rainfall distribution. Now let's look at the temperature data:

{"action": "Database_response", "report": "# Second Chart: Temperature Trends Over Time\n\nThis shows temperature changes over months.\n\n**CHART_TYPE:** LINE", "raw_data": [{"month": 1, "temperature_avg": 25.5, "region": "TROPICAL"}, {"month": 2, "temperature_avg": 27.8, "region": "TROPICAL"}, {"month": 3, "temperature_avg": 29.2, "region": "TROPICAL"}]}

These two charts provide a comprehensive view of the weather patterns in the region.`;

// Function to simulate API response format
export const formatAsAPIResponse = (data) => {
  return JSON.stringify(data);
};
