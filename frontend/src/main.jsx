import { StrictMode } from 'react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App.jsx'
import './index.css'

// -------------------------------------------------------------
// JWT AUTH INTERCEPTOR: Attaches Authorization Bearer token to /api/ requests
// -------------------------------------------------------------
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  const token = localStorage.getItem('shore_token');
  if (typeof url === 'string' && url.startsWith('/api') && token) {
    options = { ...options };
    options.headers = {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`
    };
  }
  return originalFetch(url, options);
};

// -------------------------------------------------------------
// PWA SERVICE WORKER REGISTRATION
// -------------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{padding: '20px', color: 'red'}}>
        <h1>Something went wrong.</h1>
        <pre>{this.state.error.toString()}</pre>
        <pre>{this.state.error.stack}</pre>
      </div>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Toaster position="top-right" richColors closeButton theme="light" />
  </StrictMode>,
)
