import React, { useState, useRef, useEffect } from 'react';
import { FiEdit2, FiCopy, FiSend, FiX, FiCheck } from 'react-icons/fi';

const UserMessage = ({ message, formatTime, onEdit, onCopy }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [copySuccess, setCopySuccess] = useState(false);
  const textareaRef = useRef(null);
  const editContainerRef = useRef(null);

  // Auto-resize textarea and focus when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  // Handle click outside to cancel edit
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isEditing && editContainerRef.current && !editContainerRef.current.contains(event.target)) {
        handleEditToggle(); // Cancel editing
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  // Handle copy functionality
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text || '');
      setCopySuccess(true);
      if (onCopy) onCopy(message);
      
      // Reset copy success indicator after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Handle edit mode toggle
  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing
      setEditText(message.text || '');
      setIsEditing(false);
    } else {
      // Start editing
      setIsEditing(true);
    }
  };

  // Handle send edited message
  const handleSendEdit = () => {
    if (editText.trim() && onEdit) {
      onEdit(message, editText.trim());
      setIsEditing(false);
    }
  };

  // Handle textarea key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendEdit();
    } else if (e.key === 'Escape') {
      handleEditToggle();
    }
  };

  // Auto-resize textarea on input
  const handleTextareaChange = (e) => {
    setEditText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  return (
    <div className="user-message-container">
      {isEditing ? (
        // Edit mode
        <div className="user-message-edit-mode" ref={editContainerRef}>
          <div className="edit-textarea-container">
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyPress}
              className="edit-textarea"
              placeholder="Edit your message..."
              rows="1"
            />
          </div>
          <div className="edit-actions">
            <button
              onClick={handleEditToggle}
              className="edit-cancel-btn"
              title="Cancel editing"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEdit}
              disabled={!editText.trim()}
              className={`edit-send-btn ${!editText.trim() ? 'disabled' : ''}`}
              title="Send edited message"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        // Normal mode
        <>
          <div className="message-bubble user-bubble">
            <div className="message-text">
              {message.text}
            </div>
            <div className="message-timestamp">{formatTime(message.timestamp)}</div>
          </div>
          <div className="user-message-actions">
            <button
              onClick={handleCopy}
              className={`user-action-btn copy-btn ${copySuccess ? 'success' : ''}`}
              title={copySuccess ? "Copied!" : "Copy message"}
            >
              {copySuccess ? <FiCheck /> : <FiCopy />}
            </button>
            <button
              onClick={handleEditToggle}
              className="user-action-btn edit-btn"
              title="Edit message"
            >
              <FiEdit2 />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMessage;
