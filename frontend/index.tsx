import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Mount the SPA entry point as soon as the root element is available.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);