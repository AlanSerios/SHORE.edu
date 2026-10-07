import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';

export default function QRPassModal({ isOpen, onClose, userEmail, userRole }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-[max(1.5rem,calc(1rem+env(safe-area-inset-bottom,0px)))] pt-[max(1.5rem,calc(1rem+env(safe-area-inset-top,0px)))] sm:p-6 overflow-y-auto overscroll-contain">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-card rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center max-w-sm w-full z-10 my-auto border border-border"
        >
          <button
            onClick={onClose}
            aria-label="Close QR Pass"
            className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center bg-canvas text-muted hover:text-fg rounded-full transition-colors active:scale-90 touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="bg-white p-4 rounded-2xl mb-4 shadow-inner border border-border/50">
            <QRCodeSVG
              value={userEmail}
              size={220}
              bgColor="transparent"
              fgColor="#000000"
              level="H"
              includeMargin={false}
            />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-fg text-center mb-1 tracking-tight">
            {userEmail.split('@')[0]}
          </h2>
          <div className="flex items-center gap-1.5 justify-center">
            <span className="text-xs font-bold text-primary uppercase tracking-[0.15em] bg-primary/10 px-3 py-1 rounded-full">
              {userRole === 'admin' ? 'Volunteer/Admin' : 'SHORE 5.0 Student'}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
