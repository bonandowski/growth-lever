import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { inject } from '@vercel/analytics';
import './styles.css';
import App from './App';

// Aggregate, cookie-less page views. Does nothing outside Vercel.
inject();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
