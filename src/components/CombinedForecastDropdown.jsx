import React, { useState, useRef, useEffect } from 'react';
import { FiTrendingUp, FiChevronDown } from 'react-icons/fi';

const CombinedForecastDropdown = ({ darkMode = false, disabled = false, onForecastSelect = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedOption, setExpandedOption] = useState(null);
  const [loadingOption, setLoadingOption] = useState(null);
  const dropdownRef = useRef(null);

  const forecastOptions = [
    {
      id: 'gfs',
      name: 'Daily',
      commodity: 'ALL'
    },
    {
      id: 'stu',
      name: 'Monthly',
      suboptions: [
        { id: 'stu_all', name: 'All', commodity: 'ALL' },
        { id: 'stu_arabica', name: 'Arabica', commodity: 'ARABICA' },
        { id: 'stu_robusta', name: 'Robusta', commodity: 'ROBUSTA' },
        { id: 'stu_ico', name: 'ICO', commodity: 'ICO' }
      ]
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setExpandedOption(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOptionClick = (option) => {
    if (option.suboptions) {
      setExpandedOption(expandedOption === option.id ? null : option.id);
    } else {
      handleSelectForecast(option.id, option.commodity);
    }
  };

  const handleSuboptionClick = (suboption) => {
    handleSelectForecast(suboption.id, suboption.commodity);
  };

  const handleSelectForecast = async (optionId, commodity) => {
    console.log(`Selected Combined Forecast option: ${optionId}, Commodity: ${commodity}`);

    if (loadingOption) {
      return;
    }

    setIsOpen(false);
    setExpandedOption(null);

    try {
      setLoadingOption(optionId);

      if (onForecastSelect) {
        await onForecastSelect(optionId, commodity);
      }

      setLoadingOption(null);

    } catch (error) {
      console.error('Error in combined forecast selection:', error);
      setLoadingOption(null);
    }
  };

  return (
    <div className="combined-forecast-dropdown" ref={dropdownRef}>
      <button
        className={`combined-forecast-button ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''} ${loadingOption ? 'loading' : ''}`}
        onClick={() => !disabled && !loadingOption && setIsOpen(!isOpen)}
        {...(!isOpen && !disabled && !loadingOption && { 'data-tooltip': "Combined Forecast" })}
        disabled={disabled || !!loadingOption}
        title="Get Combined Forecast Analysis"
      >
        <FiTrendingUp className="combined-forecast-icon" />
      </button>

      {isOpen && (
        <div className="combined-forecast-dropdown-menu">
          {forecastOptions.map((option) => (
            <div key={option.id} className="forecast-option-group">
              <button
                className={`forecast-option-button ${expandedOption === option.id ? 'expanded' : ''} ${loadingOption === option.id ? 'loading' : ''}`}
                onClick={() => handleOptionClick(option)}
                disabled={loadingOption && loadingOption !== option.id}
              >
                <span className="forecast-option-name">{option.name}</span>
                {option.suboptions && (
                  <FiChevronDown
                    className={`forecast-option-chevron ${expandedOption === option.id ? 'rotated' : ''}`}
                  />
                )}
                {loadingOption === option.id && (
                  <div className="shimmer-overlay"></div>
                )}
              </button>

              {expandedOption === option.id && option.suboptions && (
                <div className="forecast-suboptions">
                  {option.suboptions.map((suboption) => (
                    <button
                      key={suboption.id}
                      className={`forecast-suboption-button ${loadingOption === suboption.id ? 'loading' : ''}`}
                      onClick={() => handleSuboptionClick(suboption)}
                      disabled={loadingOption && loadingOption !== suboption.id}
                    >
                      <span className="forecast-suboption-name">{suboption.name}</span>
                      {loadingOption === suboption.id && (
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
  );
};

export default CombinedForecastDropdown;
