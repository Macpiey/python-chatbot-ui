import React from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import amplifyconfig from './amplifyconfigurations.json';
import App from './components/App';

// Configure Amplify
Amplify.configure(amplifyconfig);

// Create root and render app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
