import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);

      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.3 }}
          className="fixed top-[max(0.75rem,calc(0.5rem+env(safe-area-inset-top,0px)))] left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[92vw]"
        >
          <div className="flex items-center gap-2.5 px-4 py-2 bg-amber-500/90 text-slate-950 font-medium text-xs rounded-full backdrop-blur-md shadow-lg shadow-amber-500/20 border border-amber-400 text-center">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>Offline Mode: Cached scholarships and review data are active</span>
          </div>
        </motion.div>
      )}

      {showReconnected && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.3 }}
          className="fixed top-[max(0.75rem,calc(0.5rem+env(safe-area-inset-top,0px)))] left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[92vw]"
        >
          <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-600 text-white font-medium text-xs rounded-full backdrop-blur-md shadow-lg shadow-emerald-600/20 border border-emerald-400 text-center">
            <Wifi className="w-3.5 h-3.5 shrink-0" />
            <span>Back Online: Connection restored</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
