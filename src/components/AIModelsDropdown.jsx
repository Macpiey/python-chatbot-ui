import React, { useState, useRef, useEffect } from 'react';
import { FiZap, FiChevronDown, FiTrendingUp, FiBarChart2, FiActivity } from 'react-icons/fi';
import apiService from '../services/apiService';
import { getAPIParameters, generateReportTitle, processQuickReportsResponse, generateChartString } from '../utils/quickReportsProcessor';

const AIModelsDropdown = ({ darkMode = false, disabled = false, onQuickReportSelect = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedSubcategory, setExpandedSubcategory] = useState(null);
  const [loadingOptionId, setLoadingOptionId] = useState(null);
  const dropdownRef = useRef(null);

  const modelCategories = [
    {
      id: 'sarimax',
      name: 'Time Series Model',
      icon: <FiTrendingUp className="category-icon" />,
      subcategories: [
        {
          id: 'arabica',
          name: 'Arabica Roaster Coverage',
          options: [
            { id: 'sarimax-arabica-ice-stu', name: 'ICE Price vs STU (Physical + COT Long)' },
            { id: 'sarimax-arabica-ice-funds', name: 'ICE Price vs Net Funds Position + STU' }
          ]
        },
        {
          id: 'robusta',
          name: 'Robusta Roaster Coverage',
          options: [
            { id: 'sarimax-robusta-liffe-stu', name: 'LIFFE Price vs STU (Physical + COT Long)' },
            { id: 'sarimax-robusta-liffe-funds', name: 'LIFFE Price vs Net Funds Position + STU' }
          ]
        },
        {
          id: 'gfs-arabica',
          name: 'Daily Arabica',
          options: [
            { id: 'sarimax-gfs-arabica-dnd5', name: 'ICE vs DOD Change 5' },
            { id: 'sarimax-gfs-arabica-todnd10', name: 'ICE vs DOD Change upto 10 days' },
            { id: 'sarimax-gfs-arabica-todnd15', name: 'ICE vs DOD Change upto 15 days' },
            { id: 'sarimax-gfs-arabica-certified_rain15d', name: 'ICE vs Certified Stock + Cumulative Rainfall 15 days + DOD Change upto 15 days' },
            { id: 'sarimax-gfs-arabica-certified_rain15d_rsi', name: 'ICE vs Certified Stock + Cumulative Rainfall 15 days + DOD Change upto 15 days + RSI' }
          ]
        },
        {
          id: 'gfs-robusta',
          name: 'Daily Robusta',
          options: [
            { id: 'sarimax-gfs-robusta-dnd5', name: 'LIFFE vs DOD Change 5' },
            { id: 'sarimax-gfs-robusta-todnd10', name: 'LIFFE vs DOD Change upto 10 days' },
            { id: 'sarimax-gfs-robusta-todnd15', name: 'LIFFE vs DOD Change upto 15 days' },
            { id: 'sarimax-gfs-robusta-certified_rain15d', name: 'LIFFE vs Certified Stock + Cumulative Rainfall 15 days + DOD Change upto 15 days' },
            { id: 'sarimax-gfs-robusta-certified_rain15d_rsi', name: 'LIFFE vs Certified Stock + Cumulative Rainfall 15 days + DOD Change upto 15 days + RSI' }
          ]
        },
        {
          id: 'gfs-raw-sugar',
          name: 'Daily Raw Sugar',
          options: [
            { id: 'sarimax-gfs-raw-sugar-dnd5', name: 'Weather Forecast 5 days' },
            { id: 'sarimax-gfs-raw-sugar-todnd10', name: 'Weather Forecast 10 days' },
            { id: 'sarimax-gfs-raw-sugar-todnd15', name: 'Weather Forecast 15 days' },
            { id: 'sarimax-gfs-raw-sugar-rain15d_todnd15', name: 'Weather Forecast + Realized Rain' },
            { id: 'sarimax-gfs-raw-sugar-rain15d_todnd15_rsi', name: 'Weather Forecast + Realized Rain + RSI + Whites Premium' }
          ]
        },
        {
          id: 'gfs-white-sugar',
          name: 'Daily White Sugar',
          options: [
            { id: 'sarimax-gfs-white-sugar-dnd5', name: 'Weather Forecast 5 days' },
            { id: 'sarimax-gfs-white-sugar-todnd10', name: 'Weather Forecast 10 days' },
            { id: 'sarimax-gfs-white-sugar-todnd15', name: 'Weather Forecast 15 days' },
            { id: 'sarimax-gfs-white-sugar-rain15d_todnd15', name: 'Weather Forecast + Realized Rain' },
            { id: 'sarimax-gfs-white-sugar-rain15d_todnd15_rsi', name: 'Weather Forecast + Realized Rain + RSI' }
          ]
        },
        {
          id: 'ico',
          name: 'ICO Price Model',
          options: [
            { id: 'sarimax-ico-price-world-stock', name: 'ICO Price vs STU + World Stock' }
          ]
        },
        {
          id: 'daily-oi-cert-stock',
          name: 'Daily Open Interest & Cert Stock',
          options: [
            { id: 'sarimax-daily-oi-cert-stock-arabica', name: 'ARABICA' },
            { id: 'sarimax-daily-oi-cert-stock-robusta', name: 'ROBUSTA' }
          ]
        }
      ]
    },
    {
      id: 'slr',
      name: 'Linear Model',
      icon: <FiBarChart2 className="category-icon" />,
      subcategories: [
        {
          id: 'arabica',
          name: 'Arabica Roaster Coverage',
          options: [
            { id: 'slr-arabica-ice-stu', name: 'ICE Price vs STU (Physical + COT Long)' },
            { id: 'slr-arabica-ice-funds', name: 'ICE Price vs Net Funds Position + STU' }
          ]
        },
        {
          id: 'robusta',
          name: 'Robusta Roaster Coverage',
          options: [
            { id: 'slr-robusta-liffe-stu', name: 'LIFFE Price vs STU (Physical + COT Long)' },
            { id: 'slr-robusta-liffe-funds', name: 'LIFFE Price vs Net Funds Position + STU' }
          ]
        },
        {
          id: 'gfs-arabica',
          name: 'Daily Arabica',
          options: [
            { id: 'slr-gfs-arabica-dnd5', name: 'ICE vs DOD Change 5' },
            { id: 'slr-gfs-arabica-todnd10', name: 'ICE vs DOD Change upto 10 days' },
            { id: 'slr-gfs-arabica-todnd15', name: 'ICE vs DOD Change upto 15 days' },
            { id: 'slr-gfs-arabica-certified_rain15d', name: 'ICE vs Certified Stock + Cumulative Rainfall 15 days + DOD Change upto 15 days' }
          ]
        },
        {
          id: 'gfs-robusta',
          name: 'Daily Robusta',
          options: [
            { id: 'slr-gfs-robusta-dnd5', name: 'LIFFE vs DOD Change 5' },
            { id: 'slr-gfs-robusta-todnd10', name: 'LIFFE vs DOD Change upto 10 days' },
            { id: 'slr-gfs-robusta-todnd15', name: 'LIFFE vs DOD Change upto 15 days' },
            { id: 'slr-gfs-robusta-certified_rain15d', name: 'LIFFE vs Certified Stock + Cumulative Rainfall 15 days + DOD Change upto 15 days' }
          ]
        },
        {
          id: 'gfs-raw-sugar',
          name: 'Daily Raw Sugar',
          options: [
            { id: 'slr-gfs-raw-sugar-dnd5', name: 'Weather Forecast 5 days' },
            { id: 'slr-gfs-raw-sugar-todnd10', name: 'Weather Forecast 10 days' },
            { id: 'slr-gfs-raw-sugar-todnd15', name: 'Weather Forecast 15 days' },
            { id: 'slr-gfs-raw-sugar-rain15d_todnd15', name: 'Weather Forecast + Realized Rain' },
            { id: 'slr-gfs-raw-sugar-rain15d_todnd15_rsi', name: 'Weather Forecast + Realized Rain + RSI + Whites Premium' }
          ]
        },
        {
          id: 'gfs-white-sugar',
          name: 'Daily White Sugar',
          options: [
            { id: 'slr-gfs-white-sugar-dnd5', name: 'Weather Forecast 5 days' },
            { id: 'slr-gfs-white-sugar-todnd10', name: 'Weather Forecast 10 days' },
            { id: 'slr-gfs-white-sugar-todnd15', name: 'Weather Forecast 15 days' },
            { id: 'slr-gfs-white-sugar-rain15d_todnd15', name: 'Weather Forecast + Realized Rain' },
            { id: 'slr-gfs-white-sugar-rain15d_todnd15_rsi', name: 'Weather Forecast + Realized Rain + RSI' }
          ]
        },
        {
          id: 'ico',
          name: 'ICO Price Model',
          options: [
            { id: 'slr-ico-price-world-stock', name: 'ICO Price vs STU + World Stock' }
          ]
        },
        {
          id: 'daily-oi-cert-stock',
          name: 'Daily Open Interest & Cert Stock',
          options: [
            { id: 'slr-daily-oi-cert-stock-arabica', name: 'ARABICA' },
            { id: 'slr-daily-oi-cert-stock-robusta', name: 'ROBUSTA' }
          ]
        }
      ]
    },
    {
      id: 'xgboost',
      name: 'Machine Learning Model (MLM)',
      icon: <FiActivity className="category-icon" />,
      subcategories: [
        {
          id: 'arabica',
          name: 'Arabica Roaster Coverage',
          options: [
            { id: 'xgboost-arabica-ice-stu', name: 'ICE Price vs STU (Physical + COT Long)' },
            { id: 'xgboost-arabica-ice-funds', name: 'ICE Price vs Net Funds Position + STU' }
          ]
        },
        {
          id: 'robusta',
          name: 'Robusta Roaster Coverage',
          options: [
            { id: 'xgboost-robusta-liffe-stu', name: 'LIFFE Price vs STU (Physical + COT Long)' },
            { id: 'xgboost-robusta-liffe-funds', name: 'LIFFE Price vs Net Funds Position + STU' }
          ]
        },
        {
          id: 'gfs-arabica',
          name: 'Daily Arabica',
          options: [
            { id: 'xgboost-gfs-arabica-dnd5', name: 'ICE vs DOD Change 5' },
            { id: 'xgboost-gfs-arabica-todnd10', name: 'ICE vs DOD Change upto 10 days' },
            { id: 'xgboost-gfs-arabica-todnd15', name: 'ICE vs DOD Change upto 15 days' },
            { id: 'xgboost-gfs-arabica-certified_rain15d', name: 'ICE vs Certified Stock + Cumulative Rainfall 15 days + DOD Change upto 15 days' }
          ]
        },
        {
          id: 'gfs-robusta',
          name: 'Daily Robusta',
          options: [
            { id: 'xgboost-gfs-robusta-dnd5', name: 'LIFFE vs DOD Change 5' },
            { id: 'xgboost-gfs-robusta-todnd10', name: 'LIFFE vs DOD Change upto 10 days' },
            { id: 'xgboost-gfs-robusta-todnd15', name: 'LIFFE vs DOD Change upto 15 days' },
            { id: 'xgboost-gfs-robusta-certified_rain15d', name: 'LIFFE vs Certified Stock + Cumulative Rainfall 15 days + DOD Change upto 15 days' }
          ]
        },
        {
          id: 'gfs-raw-sugar',
          name: 'Daily Raw Sugar',
          options: [
            { id: 'xgboost-gfs-raw-sugar-dnd5', name: 'Weather Forecast 5 days' },
            { id: 'xgboost-gfs-raw-sugar-todnd10', name: 'Weather Forecast 10 days' },
            { id: 'xgboost-gfs-raw-sugar-todnd15', name: 'Weather Forecast 15 days' },
            { id: 'xgboost-gfs-raw-sugar-rain15d_todnd15', name: 'Weather Forecast + Realized Rain' },
            { id: 'xgboost-gfs-raw-sugar-rain15d_todnd15_rsi', name: 'Weather Forecast + Realized Rain + RSI + Whites Premium' }
          ]
        },
        {
          id: 'gfs-white-sugar',
          name: 'Daily White Sugar',
          options: [
            { id: 'xgboost-gfs-white-sugar-dnd5', name: 'Weather Forecast 5 days' },
            { id: 'xgboost-gfs-white-sugar-todnd10', name: 'Weather Forecast 10 days' },
            { id: 'xgboost-gfs-white-sugar-todnd15', name: 'Weather Forecast 15 days' },
            { id: 'xgboost-gfs-white-sugar-rain15d_todnd15', name: 'Weather Forecast + Realized Rain' },
            { id: 'xgboost-gfs-white-sugar-rain15d_todnd15_rsi', name: 'Weather Forecast + Realized Rain + RSI' }
          ]
        },
        {
          id: 'ico',
          name: 'ICO Price Model',
          options: [
            { id: 'xgboost-ico-price-world-stock', name: 'ICO Price vs STU + World Stock' }
          ]
        },
        {
          id: 'daily-oi-cert-stock',
          name: 'Daily Open Interest & Cert Stock',
          options: [
            { id: 'xgboost-daily-oi-cert-stock-arabica', name: 'ARABICA' },
            { id: 'xgboost-daily-oi-cert-stock-robusta', name: 'ROBUSTA' }
          ]
        }
      ]
    }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setExpandedCategory(null);
        setExpandedSubcategory(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCategoryClick = (categoryId) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
      setExpandedSubcategory(null);
    } else {
      setExpandedCategory(categoryId);
      setExpandedSubcategory(null);
    }
  };

  const handleSubcategoryClick = (subcategoryId) => {
    if (expandedSubcategory === subcategoryId) {
      setExpandedSubcategory(null);
    } else {
      setExpandedSubcategory(subcategoryId);
    }
  };

  const handleOptionClick = async (categoryId, subcategoryId, optionId) => {
    console.log(`Selected: ${categoryId} - ${subcategoryId} - ${optionId}`);

    // Prevent multiple simultaneous requests
    if (loadingOptionId) {
      return;
    }

    try {
      // Get API parameters for the selected option
      const apiParams = getAPIParameters(optionId);
      if (!apiParams) {
        console.error('No API parameters found for option:', optionId);
        return;
      }

      // Generate report title
      const reportTitle = generateReportTitle(optionId);

      // Set loading state - keep dropdown open with shimmer animation
      setLoadingOptionId(optionId);

      // Call the API with type parameter
      console.log('Calling quick reports API with params:', apiParams);
      const apiResponse = await apiService.getReadyMadeLLMAnalysis(
        apiParams.dependent,
        apiParams.independent,
        apiParams.type,
        apiParams.commodity
      );

      // Process the response
      const processedData = processQuickReportsResponse(apiResponse);

      // Generate chart string for compatibility with existing renderer
      const chartString = generateChartString(processedData.chart);

      // Create a message object that mimics the normal chat flow
      // Use the same format as the existing API responses
      const chartJsonData = {
        chart: processedData.chart,
        summary: processedData.summary,
        type: processedData.type
      };

      const quickReportMessage = {
        id: Date.now(),
        text: JSON.stringify(chartJsonData),
        timestamp: Date.now(),
        sender: "ai",
        type: "markdown_structured",
        isQuickReport: true
      };

      // Call the callback to add this to the conversation
      if (onQuickReportSelect) {
        onQuickReportSelect(quickReportMessage, reportTitle);
      }

      // Clear loading state and close dropdown after successful API call
      setLoadingOptionId(null);
      setIsOpen(false);
      setExpandedCategory(null);
      setExpandedSubcategory(null);

    } catch (error) {
      console.error('Error fetching quick report:', error);
      // Clear loading state on error but keep dropdown open
      setLoadingOptionId(null);
      // You might want to show an error message to the user here
    }
  };

  return (
    <div className="ai-models-dropdown" ref={dropdownRef}>
      <button
        className={`models-button ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        {...(!isOpen && !disabled && { 'data-tooltip': "Quick reports" })}
        disabled={disabled}
      >
        <FiZap className="models-icon" />
      </button>

      {isOpen && (
        <div className="models-dropdown-menu">
          {modelCategories.map((category) => (
            <div key={category.id} className="model-category">
              <button
                className={`category-button ${expandedCategory === category.id ? 'expanded' : ''}`}
                onClick={() => handleCategoryClick(category.id)}
              >
                <div className="category-content">
                  {category.icon}
                  <span className="category-name">{category.name}</span>
                </div>
                <FiChevronDown
                  className={`category-chevron ${expandedCategory === category.id ? 'rotated' : ''}`}
                />
              </button>

              {expandedCategory === category.id && (
                <div className="category-subcategories">
                  {category.subcategories.map((subcategory) => (
                    <div key={subcategory.id} className="model-subcategory">
                      <button
                        className={`subcategory-button ${expandedSubcategory === subcategory.id ? 'expanded' : ''}`}
                        onClick={() => handleSubcategoryClick(subcategory.id)}
                      >
                        <div className="subcategory-content">
                          <span className="subcategory-name">{subcategory.name}</span>
                        </div>
                        <FiChevronDown
                          className={`subcategory-chevron ${expandedSubcategory === subcategory.id ? 'rotated' : ''}`}
                        />
                      </button>

                      {expandedSubcategory === subcategory.id && (
                        <div className="subcategory-options">
                          {subcategory.options.map((option) => (
                            <button
                              key={option.id}
                              className={`option-button ${loadingOptionId === option.id ? 'loading' : ''}`}
                              onClick={() => handleOptionClick(category.id, subcategory.id, option.id)}
                              disabled={loadingOptionId && loadingOptionId !== option.id}
                            >
                              <span className="option-name">{option.name}</span>
                              {loadingOptionId === option.id && (
                                <div className="shimmer-overlay"></div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIModelsDropdown;
