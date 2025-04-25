import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));

const isLocalhost = window.location.hostname === 'localhost';

root.render(
  isLocalhost ?
    <BrowserRouter>
      <App />
    </BrowserRouter>
    :

    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
);
reportWebVitals();