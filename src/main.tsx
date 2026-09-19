import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { registerSW } from 'virtual:pwa-register';

// Automatically register service worker for offline support and updates
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New content available, ready to refresh.');
  },
  onOfflineReady() {
    console.log('App ready to work offline.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
