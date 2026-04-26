import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill global and crypto for libraries like bcryptjs
if (typeof window !== 'undefined') {
  (window as any).global = window;
  const cachedTheme = localStorage.getItem('qb_theme');
  if (cachedTheme) {
    document.documentElement.setAttribute('data-theme', cachedTheme);
  }
}


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
