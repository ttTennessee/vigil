import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './styles/reset.css';
import './styles/tokens.css';
import './styles/fonts.css';
import './styles/layout.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
