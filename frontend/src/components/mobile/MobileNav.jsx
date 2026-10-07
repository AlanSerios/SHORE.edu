import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Megaphone, Calendar, Menu, LogOut, Settings } from 'lucide-react';
import { cn } from '../../utils';
import AvatarBorder from '../AvatarBorder';
import { getAcademicTools, getAdminTools } from '../../utils/navConfig';

/** Bottom floating nav bar — 4 items + hamburger menu button. */
export function MobileBottomNav({ currentView, setCurrentView, preloadView = () => {}, unreadAnnouncements, isMenuSheetOpen, setIsMenuSheetOpen }) {
  const items = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'announcements', label: 'Updates', icon: Megaphone, badge: unreadAnnouncements },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'menu', label: 'More', icon: Menu },
  ];

  return (
    <nav aria-label="Primary mobile navigation" className={cn('md:hidden fixed bottom-[max(0.75rem,calc(0.5rem+env(safe-area-inset-bottom,0px)))] left-3 right-3 z-50 transition-opacity', isMenuSheetOpen && 'opacity-0 pointer-events-none')}>
      <div className="h-16 bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl flex items-center justify-around px-2 shadow-[0_8px_30px_rgba(15,23,42,0.12)] relative z-40">
        {items.map(item => {
          const isActive = item.id === 'menu' ? isMenuSheetOpen : currentView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.badge > 0 ? `${item.label}, ${item.badge} unread` : item.label}
              aria-current={item.id !== 'menu' && isActive ? 'page' : undefined}
              aria-expanded={item.id === 'menu' ? isMenuSheetOpen : undefined}
              onPointerEnter={() => { if (item.id !== 'menu') preloadView(item.id); }}
              onClick={() => {
                if (item.id === 'menu') { setIsMenuSheetOpen(true); }
                else { setCurrentView(item.id); setIsMenuSheetOpen(false); }
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-w-14 h-12 rounded-xl transition-[color,background-color,transform] active:scale-[0.93] duration-150 ease-out relative z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-manipulation select-none',
                isActive ? 'text-primary' : 'text-muted hover:text-fg hover:bg-slate-50/80'
              )}
            >
              {isActive && (
                <motion.div layoutId="bottomNavBg" className="absolute inset-0 bg-primary/10 rounded-xl z-[-1]" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />
              )}
              <motion.div
                animate={{ scale: isActive ? [1, 1.15, 1] : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25, duration: 0.25 }}
                className="relative flex items-center justify-center"
              >
                <item.icon aria-hidden="true" className="w-5 h-5" />
                {item.badge > 0 && (
                  <span aria-hidden="true" className="absolute -top-2 -right-2.5 bg-accentRedFg text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">{item.badge}</span>
                )}
              </motion.div>
              <span className="text-[11px] font-semibold leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Full-screen sheet that slides up on mobile — replaces the sidebar. */
export function MobileMenuSheet({ isOpen, onClose, setCurrentView, userRole, userEmail, userName, profilePicture, equippedBorder, handleLogout }) {
  const academicTools = getAcademicTools(userRole);
  const adminTools = getAdminTools(userRole);
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => sheetRef.current?.focus());

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button type="button" aria-label="Close menu" key="menu-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 z-[60] md:hidden" />
          <motion.div ref={sheetRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title" key="menu-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 220 }} className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[70] md:hidden flex flex-col max-h-[85vh] shadow-[0_-10px_40px_rgba(0,0,0,0.12)] focus:outline-none">
            {/* Native Sheet Pull Indicator */}
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 shrink-0" aria-hidden="true" />

            <div className="flex-1 overflow-y-auto overscroll-contain px-6 pt-3 pb-[max(2rem,calc(1.5rem+env(safe-area-inset-bottom,0px)))]">
              {/* Profile header */}
              <div className="flex items-center gap-4 px-1 pb-5 border-b border-border mb-5">
                <AvatarBorder borderId={equippedBorder} className="w-14 h-14 shrink-0">
                  <div className="w-full h-full rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                    {profilePicture ? <img src={profilePicture} width="56" height="56" className="w-full h-full object-cover rounded-full" alt="Profile" /> : (userRole === 'admin' ? 'A' : (userName || userEmail).charAt(0).toUpperCase())}
                  </div>
                </AvatarBorder>
                <div className="flex-1 min-w-0">
                  <h2 id="mobile-menu-title" className="text-lg font-bold text-fg tracking-tight truncate">{userRole === 'admin' ? 'Admin' : (userName || userEmail.split('@')[0])}</h2>
                  <p className="text-sm text-muted capitalize truncate">{userRole} Account</p>
                </div>
              </div>

              {/* Classroom & Academics Grid */}
              <div className="mb-5">
                <h3 className="text-xs font-bold text-muted mb-2.5 px-1 uppercase tracking-wider">Classroom & Academics</h3>
                <div className="grid grid-cols-2 gap-2">
                  {academicTools.map(item => (
                    <button type="button" key={item.id} onClick={() => { setCurrentView(item.id); onClose(); }} className="min-h-12 rounded-xl border border-border bg-canvas px-3 flex items-center justify-start gap-2.5 text-left text-fg transition-all hover:bg-slate-100 active:scale-[0.97] active:bg-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-manipulation select-none">
                      <item.icon aria-hidden="true" className="w-4 h-4 shrink-0 text-primary" />
                      <span className="text-xs font-semibold leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Administration & Accounts Grid */}
              {adminTools.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-muted mb-2.5 px-1 uppercase tracking-wider">Administration & Accounts</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {adminTools.map(item => (
                      <button type="button" key={item.id} onClick={() => { setCurrentView(item.id); onClose(); }} className="min-h-12 rounded-xl border border-border bg-canvas px-3 flex items-center justify-start gap-2.5 text-left text-fg transition-all hover:bg-slate-100 active:scale-[0.97] active:bg-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-manipulation select-none">
                        <item.icon aria-hidden="true" className="w-4 h-4 shrink-0 text-primary" />
                        <span className="text-xs font-semibold leading-tight">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="space-y-2">
                <button type="button" onClick={() => { setCurrentView('settings'); onClose(); }} className="w-full min-h-12 bg-canvas border border-border rounded-xl p-4 flex items-center gap-3 text-fg active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-manipulation select-none">
                  <Settings className="w-5 h-5 text-muted" />
                  <span className="font-semibold text-sm">Manage Account</span>
                </button>
                <button type="button" onClick={() => { handleLogout(); onClose(); }} className="w-full min-h-12 bg-accentRed/5 border border-accentRed/10 rounded-xl p-4 flex items-center gap-3 text-accentRedFg active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentRedFg focus-visible:ring-offset-2 touch-manipulation select-none">
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
