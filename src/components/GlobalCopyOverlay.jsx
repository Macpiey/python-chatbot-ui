import React, { useState, useEffect } from 'react';

// Global copy state - now tracks which component should show the button
let globalCopyState = {
  activeComponentId: null,
  selectedText: '',
  callbacks: new Set()
};

// Global copy manager
export const copyManager = {
  show: (componentId, text) => {
    globalCopyState.activeComponentId = componentId;
    globalCopyState.selectedText = text;
    globalCopyState.callbacks.forEach(callback => callback(globalCopyState));
  },

  hide: () => {
    globalCopyState.activeComponentId = null;
    globalCopyState.selectedText = '';
    globalCopyState.callbacks.forEach(callback => callback(globalCopyState));
  },

  subscribe: (callback) => {
    globalCopyState.callbacks.add(callback);
    return () => globalCopyState.callbacks.delete(callback);
  },

  isActive: (componentId) => {
    return globalCopyState.activeComponentId === componentId;
  },

  getSelectedText: () => {
    return globalCopyState.selectedText;
  }
};

// This component is no longer needed since we're using inline buttons
const GlobalCopyOverlay = () => {
  return null;
};

export default GlobalCopyOverlay;
