import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Download, X } from 'lucide-react';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // Check if app is already running in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const dismissedTime = localStorage.getItem('shore_pwa_dismissed');
      if (dismissedTime) {
        const diffHours = (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60);
        if (diffHours < 24) return; // Don't prompt again within 24 hours
      }
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('shore_pwa_dismissed', Date.now().toString());
  };

  if (!isVisible || isInstalled) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
        transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+6rem)] left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:max-w-md z-50 pointer-events-auto"
        role="region"
        aria-labelledby="pwa-install-title"
      >
        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-700 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shrink-0 flex items-center justify-center shadow-md">
              <img
                src="/SHORE5.png"
                alt="SHORE"
                width="48"
                height="48"
                className="w-full h-full object-cover rounded-[10px]"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 id="pwa-install-title" className="text-sm font-semibold text-white tracking-tight">Install SHORE Skwela</h2>
                <span className="px-1.5 py-0.5 text-[11px] font-bold bg-blue-500/20 text-blue-300 rounded-full border border-blue-400/20 uppercase tracking-wider">PWA</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Offline access to scholarships & schedules
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex min-h-10 items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Dismiss"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
