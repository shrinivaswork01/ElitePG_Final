import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ ElitePG SW registered:', registration.scope);

        // Check for updates periodically (every 60 minutes)
        setInterval(() => {
          registration.update();
        }, 1000 * 60 * 60);
      })
      .catch((error) => {
        console.log('⚠️ SW registration failed:', error);
      });
  });
}
