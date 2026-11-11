import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

const ONE_HOUR = 60 * 60 * 1000;

function showPwaToast(message: string) {
  if (document.getElementById('pwa-toast')) return;
  const toast = document.createElement('div');
  toast.id = 'pwa-toast';
  toast.className = 'pwa-toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

// Service Worker: registro inmediato + actualización automática.
// Con registerType 'autoUpdate' el nuevo SW se activa solo y la app se recarga.
// Se comprueba además cada hora si hay una versión nueva desplegada.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    setInterval(() => {
      registration.update().catch(() => undefined);
    }, ONE_HOUR);
  },
  onOfflineReady() {
    showPwaToast('Streaming Platform está lista para usarse sin conexión.');
  },
  onRegisterError(error) {
    console.error('No se pudo registrar el service worker:', error);
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
