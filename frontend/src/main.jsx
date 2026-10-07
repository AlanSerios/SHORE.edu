import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App.jsx';
import './index.css';

// JWT AUTH INTERCEPTOR: attaches Authorization header to /api/ requests
const originalFetch = window.fetch;

window.fetch = async (url, options = {}) => {
  const token = localStorage.getItem('shore_token');
  const urlString = String(url || '');

  if (urlString.startsWith('/api') && token) {
    const rawHeaders = options.headers;

    if (rawHeaders instanceof Headers) {
      if (!rawHeaders.has('Authorization')) {
        rawHeaders.set('Authorization', `Bearer ${token}`);
      }
    } else if (Array.isArray(rawHeaders)) {
      if (!rawHeaders.some(([k]) => String(k).toLowerCase() === 'authorization')) {
        options = { ...options, headers: [...rawHeaders, ['Authorization', `Bearer ${token}`]] };
      }
    } else {
      options = {
        ...options,
        headers: {
          ...rawHeaders,
          Authorization: `Bearer ${token}`
        }
      };
    }
  }

  const response = await originalFetch(url, options);

  // Auto-logout and clear revoked/expired token on 401 responses
  if (response.status === 401 && urlString.startsWith('/api') && !urlString.includes('/api/users/login')) {
    localStorage.removeItem('shore_token');
    window.dispatchEvent(new CustomEvent('shore_auth_expired'));
  }

  return response;
};

// PWA SERVICE WORKER
if ('serviceWorker' in navigator) {
  const isLocal = ['127.0.0.1', 'localhost'].includes(window.location.hostname);

  if (isLocal) {
    // Local BAT/Vite launches must always show the current build.
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister());
    });

    if ('caches' in window) {
      caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))));
    }
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then(reg => reg.update())
        .catch(err => console.warn('[PWA] SW registration failed:', err));
    });
  }
}

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Toaster position="bottom-right" richColors closeButton theme="light" offset="24px" />
  </React.StrictMode>,
);
