import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';

export default function QRPassModal({ isOpen, onClose, userEmail, userRole }) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();

        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-[max(1.5rem,calc(1rem+env(safe-area-inset-bottom,0px)))] pt-[max(1.5rem,calc(1rem+env(safe-area-inset-top,0px)))] sm:p-6 overflow-y-auto overscroll-contain">
        <motion.button
          type="button"
          aria-label="Close enlarged QR pass"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.18, ease: 'easeOut' }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-pass-title"
          initial={reduceMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { scale: 0.96, opacity: 0 }}
          transition={reduceMotion ? { duration: 0.12, ease: 'easeOut' } : { type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-card rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center max-w-sm w-full z-10 my-auto border border-border"
        >
          <button
            ref={closeButtonRef}
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

          <h2 id="qr-pass-title" className="text-xl sm:text-2xl font-black text-fg text-center mb-1 tracking-tight">
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
