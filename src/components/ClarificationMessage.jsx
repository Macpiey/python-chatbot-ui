import React from 'react';
import { FiHelpCircle, FiArrowRight } from 'react-icons/fi';

const ClarificationMessage = ({ message, formatTime, onSuggestionClick }) => {
  // Extract suggestions from the text
  const extractSuggestions = (text) => {
    const suggestions = [];

    // Try to find suggestion text
    const suggestionMatch = text.match(/Suggestion:\s*([^]*?)(?=You may|$)/i);
    if (suggestionMatch) {
      const suggestionText = suggestionMatch[1].trim();
      // Split by common delimiters and clean up
      const parts = suggestionText.split(/[,;]|\sand\s|\sor\s/).map(s => s.trim()).filter(s => s.length > 0);
      suggestions.push(...parts);
    }

    return suggestions;
  };

  // Split the text into sections and preserve spacing
  const renderClarificationContent = (text) => {
    console.log("Full clarification text:", JSON.stringify(text));

    // First try splitting by double newlines
    let sections = text.split('\n\n');
    console.log("Sections after \\n\\n split:", sections.length, sections);

    // If we only have one section, the text might not have proper separators
    // Try to manually split by finding "Suggestion:" and other patterns
    if (sections.length === 1) {
      const fullText = sections[0];
      const parts = [];

      // Find Clarification part
      const clarificationMatch = fullText.match(/Clarification:\s*([^]*?)(?=Suggestion:|$)/i);
      if (clarificationMatch) {
        parts.push(`Clarification: ${clarificationMatch[1].trim()}`);
      }

      // Find Suggestion part
      const suggestionMatch = fullText.match(/Suggestion:\s*([^]*?)(?=You may|$)/i);
      if (suggestionMatch) {
        parts.push(`Suggestion: ${suggestionMatch[1].trim()}`);
      }

      // Find remaining text (general message)
      const remainingMatch = fullText.match(/You may[^]*$/i);
      if (remainingMatch) {
        parts.push(remainingMatch[0].trim());
      }

      sections = parts;
      console.log("Manual split sections:", sections);
    }

    return sections.map((section, index) => {
      const trimmedSection = section.trim();
      console.log(`Section ${index}:`, JSON.stringify(trimmedSection));

      if (!trimmedSection) {
        // Empty section - add spacing
        return <div key={index} className="clarification-spacing"></div>;
      }

      // Check if this section starts with "Clarification:" or "Suggestion:"
      if (trimmedSection.toLowerCase().startsWith('clarification:')) {
        return (
          <div key={index} className="clarification-line">
            <strong style={{ color: '#3b82f6' }}>Clarification:</strong>
            <span>{trimmedSection.substring(trimmedSection.indexOf(':') + 1)}</span>
          </div>
        );
      } else if (trimmedSection.toLowerCase().startsWith('suggestion:')) {
        const suggestionText = trimmedSection.substring(trimmedSection.indexOf(':') + 1).trim();
        return (
          <div key={index} className="suggestion-line">
            <strong style={{ color: '#3b82f6' }}>Suggestion:</strong>
            <span>{suggestionText}</span>
            {onSuggestionClick && suggestionText && (
              <button
                className="suggestion-use-button"
                onClick={() => onSuggestionClick(suggestionText)}
                title="Use this suggestion"
              >
                <FiArrowRight className="suggestion-arrow" />
                Use
              </button>
            )}
          </div>
        );
      } else {
        // Regular section (general message)
        return (
          <div key={index} className="general-line">
            {trimmedSection}
          </div>
        );
      }
    });
  };

  return (
    <div className="message-bubble ai-bubble clarification-message">
      <div className="clarification-header">
        <div className="clarification-icon">
          <FiHelpCircle className="help-icon" />
        </div>
        <div className="clarification-title">
          <h4>Clarification Request</h4>
        </div>
      </div>

      <div className="clarification-content">
        <div className="clarification-lines">
          {renderClarificationContent(message.text)}
        </div>
      </div>

      {/* Timestamp */}
      <div className="message-timestamp">{formatTime(message.timestamp)}</div>
    </div>
  );
};

export default React.memo(ClarificationMessage);
