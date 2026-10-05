import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, ChevronDown, Layers, Upload, CheckCircle2, LogOut, Settings } from 'lucide-react';
import { cn } from '../utils';
import AvatarBorder from './AvatarBorder';
import { TOP_NAV, getClassTools } from '../utils/navConfig';

export default function Sidebar({
  sidebarOpen, setSidebarOpen,
  currentView, setCurrentView,
  userRole, userEmail,
  profilePicture, equippedBorder,
  unreadAnnouncements,
  classToolsOpen, setClassToolsOpen,
  isProfileMenuOpen, setIsProfileMenuOpen,
  file, fileInputRef, handleFileUpload,
  status, handleLogout,
}) {
  const classTools = getClassTools(userRole);

  const NavItem = ({ item, indent = false }) => {
    const isActive = currentView === item.id;
    return (
      <button
        type="button"
        onClick={() => setCurrentView(item.id)}
        aria-label={item.badge > 0 ? `${item.label}, ${item.badge} unread` : item.label}
        title={!sidebarOpen ? item.label : ''}
        aria-current={isActive ? 'page' : undefined}
        className="relative flex items-center w-full text-left group rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {isActive && (
          <motion.div layoutId="active-sidebar-pill" className="absolute inset-0 bg-primary/10 border border-primary/15" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
        )}
        {!isActive && <div className="absolute inset-0 bg-canvas opacity-0 group-hover:opacity-100 transition-opacity" />}
        <div className={cn(
          'relative z-10 flex items-center font-medium transition-[color,background-color] duration-200',
          sidebarOpen ? (indent ? 'w-full px-3 py-2' : 'w-full px-3.5 py-3') : 'w-11 h-11 justify-center',
          isActive ? 'text-primary' : 'text-muted group-hover:text-fg',
        )}>
          <item.icon aria-hidden="true" className={cn('shrink-0', indent ? 'w-4 h-4' : 'w-5 h-5', isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100')} />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span initial={{ opacity: 0, width: 0, marginLeft: 0 }} animate={{ opacity: 1, width: 'auto', marginLeft: indent ? 12 : 12 }} exit={{ opacity: 0, width: 0, marginLeft: 0 }} className={cn('whitespace-nowrap overflow-hidden', indent && 'text-sm')}>
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
          {item.badge > 0 && (
            sidebarOpen
              ? <div className={cn('ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full', isActive ? 'bg-primary text-white' : 'bg-accentRedFg text-white')}>{item.badge}</div>
              : <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accentRedFg border border-card" />
          )}
        </div>
      </button>
    );
  };

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 240 : 72 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="hidden md:flex bg-sidebar border-r border-border flex-col shrink-0 z-20 overflow-visible"
    >
      {/* Header */}
      <div className="h-[4.5rem] flex items-center px-3 shrink-0 overflow-hidden border-b border-border/70">
        <button type="button" aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-muted hover:text-fg hover:bg-canvas rounded-lg transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Menu className="w-5 h-5" />
        </button>
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.div key="full-logo" initial={{ opacity: 0, width: 0, marginLeft: 0 }} animate={{ opacity: 1, width: 'auto', marginLeft: 10 }} exit={{ opacity: 0, width: 0, marginLeft: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden shrink-0">
              <img src="/shore_logo.png" alt="SHORE.edu" className="h-10 w-auto object-contain" style={{ maxWidth: 140 }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <div className="flex-1 px-3 py-3 space-y-1 overflow-x-hidden overflow-y-auto custom-scrollbar">
        {TOP_NAV.map(item => (
          <NavItem key={item.id} item={{ ...item, badge: item.id === 'announcements' ? unreadAnnouncements : 0 }} />
        ))}

        {/* Class Tools Section */}
        <div className="pt-2 pb-1">
          <button
            type="button"
            onClick={() => { if (!sidebarOpen) setSidebarOpen(true); setClassToolsOpen(!classToolsOpen); }}
            aria-label="Class tools"
            aria-expanded={classToolsOpen}
            aria-controls="class-tools-list"
            className="w-full flex items-center justify-between text-muted hover:text-fg transition-colors px-3 py-2 rounded-xl group"
            title={!sidebarOpen ? 'Class Tools' : ''}
          >
            <div className="flex items-center gap-3">
              <Layers className={cn('shrink-0 w-5 h-5 opacity-70 group-hover:opacity-100', !sidebarOpen && 'ml-0.5')} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span initial={{ opacity: 0, width: 0, marginLeft: 0 }} animate={{ opacity: 1, width: 'auto', marginLeft: 12 }} exit={{ opacity: 0, width: 0, marginLeft: 0 }} className="whitespace-nowrap overflow-hidden text-sm font-bold">
                    Class Tools
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            {sidebarOpen && <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', classToolsOpen && 'rotate-180')} />}
          </button>

          <AnimatePresence>
            {classToolsOpen && sidebarOpen && (
              <motion.div id="class-tools-list" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex flex-col gap-1 mt-1 pl-4 border-l border-border ml-5">
                {classTools.map(item => <NavItem key={item.id} item={item} indent />)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto flex flex-col w-full">
        {userRole === 'admin' && (
          <div className="px-4 pb-4 flex flex-col items-center">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls" className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label={file ? 'Tracker data uploaded' : 'Upload tracker data'}
              title={!sidebarOpen ? (file ? 'Data Uploaded' : 'Upload Tracker') : ''}
              className={cn('w-full px-3.5 py-3 rounded-xl border border-border bg-card text-sm font-semibold flex items-center transition-[color,background-color,border-color] shadow-sm overflow-hidden group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2', file ? 'border-primary/30 text-primary hover:bg-primary/5' : 'text-fg hover:bg-canvas')}
            >
              <div className="flex items-center w-full">
                <div className="shrink-0 flex items-center justify-center">
                  {file ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                </div>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span initial={{ opacity: 0, width: 0, marginLeft: 0 }} animate={{ opacity: 1, width: 'auto', marginLeft: 12 }} exit={{ opacity: 0, width: 0, marginLeft: 0 }} className="whitespace-nowrap overflow-hidden text-left">
                      {file ? 'Data Uploaded' : 'Upload Tracker'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </button>
            <AnimatePresence>
              {status?.type === 'error' && sidebarOpen && (
                <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-xs text-accentRedFg mt-3 text-center w-full overflow-hidden">
                  {status.msg}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="p-3 border-t border-border flex flex-col gap-2 overflow-visible shrink-0 relative">
          {/* Profile menu backdrop */}
          {isProfileMenuOpen && <button type="button" aria-label="Close profile menu" className="fixed inset-0 z-40 bg-black/10" onClick={() => setIsProfileMenuOpen(false)} />}

          {/* Profile dropdown */}
          <AnimatePresence>
            {isProfileMenuOpen && (
              <motion.div role="menu" aria-label="Profile options" initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute bottom-full left-3 w-56 mb-2 bg-card border border-border shadow-xl rounded-2xl overflow-hidden flex flex-col z-50 p-1.5">
                <div className="px-3 py-2 border-b border-border/50 mb-1">
                  <p className="text-xs font-bold text-fg truncate">{userRole === 'admin' ? 'Administrator' : userEmail.split('@')[0]}</p>
                  <p className="text-[11px] text-muted truncate">{userEmail}</p>
                </div>
                <button type="button" role="menuitem" onClick={() => { setCurrentView('settings'); setIsProfileMenuOpen(false); }} className={cn('w-full px-3 py-2.5 text-left text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', currentView === 'settings' ? 'bg-primary text-white' : 'text-fg hover:bg-canvas')}>
                  <Settings className="w-4 h-4" /> Account Settings
                </button>
                <div className="h-px bg-border/60 my-1" />
                <button type="button" role="menuitem" onClick={() => { handleLogout(); setIsProfileMenuOpen(false); }} className="w-full px-3 py-2.5 text-left text-xs font-semibold text-accentRedFg hover:bg-accentRed/10 rounded-xl flex items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentRedFg">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Profile card */}
          <div
            className={cn('flex items-center w-full group rounded-2xl p-2 transition-[color,background-color,border-color] duration-200 select-none', currentView === 'settings' ? 'bg-primary/10 border border-primary/20 text-primary shadow-sm' : 'hover:bg-canvas border border-transparent text-fg')}
            title={!sidebarOpen ? 'Account Settings' : undefined}
          >
            <button type="button" aria-label="Open account settings" onClick={() => setCurrentView('settings')} className="flex items-center min-w-0 flex-1 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <AvatarBorder borderId={equippedBorder} className="w-10 h-10 shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {profilePicture ? <img src={profilePicture} alt="Profile" width="40" height="40" className="w-full h-full object-cover" /> : (userRole === 'admin' ? 'A' : userEmail.charAt(0).toUpperCase())}
                </div>
              </AvatarBorder>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div initial={{ opacity: 0, width: 0, marginLeft: 0 }} animate={{ opacity: 1, width: 'auto', marginLeft: 10 }} exit={{ opacity: 0, width: 0, marginLeft: 0 }} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col whitespace-nowrap overflow-hidden pr-2">
                    <span className={cn('font-bold text-sm leading-tight truncate', currentView === 'settings' ? 'text-primary' : 'text-fg')}>
                      {userRole === 'admin' ? 'Admin' : userEmail.split('@')[0]}
                    </span>
                    <span className="text-[11px] text-muted leading-tight mt-0.5 capitalize truncate">{userRole} Account</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </button>
            {sidebarOpen && (
              <button type="button" aria-label="Open profile options" aria-haspopup="menu" aria-expanded={isProfileMenuOpen} onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className={cn('p-1.5 rounded-lg transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', isProfileMenuOpen ? 'bg-canvas text-fg' : 'text-muted hover:text-fg hover:bg-black/5')} title="More options">
                <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', isProfileMenuOpen && 'rotate-180')} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
