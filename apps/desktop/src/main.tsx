import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { appLogger } from '@/store/controller';

import { App } from '@/app/App';

import './globals.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Elemen #root tidak ditemukan.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Error di luar React (mis. promise yang gagal) dicatat ke log lokal.
window.addEventListener('error', (event) => {
  void appLogger.log('error', `window: ${event.message}`);
});
window.addEventListener('unhandledrejection', (event) => {
  void appLogger.log('error', `promise: ${String(event.reason)}`);
});
