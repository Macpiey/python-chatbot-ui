import React, { useState, useEffect } from 'react';
import { FiArrowRight, FiX } from 'react-icons/fi';

const SuggestionChips = ({ suggestions, onSuggestionClick, onDismiss }) => {
  const [visibleSuggestions, setVisibleSuggestions] = useState([]);

  useEffect(() => {
    if (suggestions && suggestions.length > 0) {
      setVisibleSuggestions(suggestions);
    }
  }, [suggestions]);

  const handleSuggestionClick = (suggestion) => {
    onSuggestionClick(suggestion);
    // Remove this suggestion from visible list
    setVisibleSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  const handleDismissAll = () => {
    setVisibleSuggestions([]);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleDismissSingle = (suggestion, e) => {
    e.stopPropagation();
    setVisibleSuggestions(prev => prev.filter(s => s !== suggestion));
  };

  if (!visibleSuggestions || visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <div className="suggestion-chips-container">
      <div className="suggestion-chips-header">
        <span className="suggestion-chips-title">💡 Suggested responses</span>
        <button 
          className="suggestion-chips-dismiss-all"
          onClick={handleDismissAll}
          title="Dismiss all suggestions"
        >
          <FiX />
        </button>
      </div>
      <div className="suggestion-chips-list">
        {visibleSuggestions.map((suggestion, index) => (
          <div
            key={index}
            className="suggestion-chip"
            onClick={() => handleSuggestionClick(suggestion)}
          >
            <span className="suggestion-chip-text">{suggestion}</span>
            <div className="suggestion-chip-actions">
              <button
                className="suggestion-chip-dismiss"
                onClick={(e) => handleDismissSingle(suggestion, e)}
                title="Dismiss this suggestion"
              >
                <FiX />
              </button>
              <FiArrowRight className="suggestion-chip-arrow" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(SuggestionChips);
