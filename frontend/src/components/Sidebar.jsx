import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, ChevronDown, Layers, Upload, CheckCircle2, LogOut, Settings } from 'lucide-react';
import { cn } from '../utils';
import AvatarBorder from './AvatarBorder';
import { TOP_NAV, getClassTools } from '../utils/navConfig';

export default function Sidebar({
  sidebarOpen, setSidebarOpen,
  currentView, setCurrentView,
  userRole, userEmail, userName,
  profilePicture, equippedBorder,
  unreadAnnouncements,
  classToolsOpen, setClassToolsOpen,
  isProfileMenuOpen, setIsProfileMenuOpen,
  file, fileInputRef, handleFileUpload,
  _status, handleLogout,
}) {
  const [collapsedFlyoutOpen, setCollapsedFlyoutOpen] = useState(false);
  const classTools = getClassTools(userRole);
  const isAnyClassToolActive = classTools.some(item => item.id === currentView);

  const NavItem = ({ item, indent = false }) => {
    const isActive = currentView === item.id;
    return (
      <div className={cn('relative group', sidebarOpen ? 'w-full' : 'flex justify-center w-full')}>
        <button
          type="button"
          onClick={() => setCurrentView(item.id)}
          aria-label={item.badge > 0 ? `${item.label}, ${item.badge} unread` : item.label}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'relative flex items-center rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-transform active:scale-[0.98]',
            sidebarOpen ? (indent ? 'w-full text-left' : 'w-full text-left') : 'w-11 h-11 justify-center'
          )}
        >
          {isActive && (
            <motion.div
              layoutId={indent ? 'active-sidebar-subpill' : 'active-sidebar-pill'}
              className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          {!sidebarOpen && isActive && (
            <div className="absolute left-0.5 top-2.5 bottom-2.5 w-1 bg-primary rounded-r-full shadow-sm" />
          )}
          {!isActive && (
            <div className="absolute inset-0 bg-canvas/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
          )}
          <div className={cn(
            'relative z-10 flex items-center font-medium transition-[color,background-color] duration-150',
            sidebarOpen ? (indent ? 'w-full px-3 py-2 text-[13px]' : 'w-full px-3.5 py-2.5 text-sm') : 'w-11 h-11 justify-center',
            isActive ? 'text-primary font-semibold' : 'text-muted group-hover:text-fg',
          )}>
            <item.icon
              aria-hidden="true"
              className={cn(
                'shrink-0 transition-opacity',
                indent ? 'w-4 h-4' : 'w-5 h-5',
                isActive ? 'opacity-100 text-primary' : 'opacity-70 group-hover:opacity-100'
              )}
            />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                  animate={{ opacity: 1, width: 'auto', marginLeft: indent ? 10 : 12 }}
                  exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {item.badge > 0 && (
              sidebarOpen ? (
                <div className={cn(
                  'ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm',
                  isActive ? 'bg-primary text-white' : 'bg-accentRedFg text-white'
                )}>
                  {item.badge}
                </div>
              ) : (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accentRedFg border-2 border-card" />
              )
            )}
          </div>
        </button>

        {/* Instant floating tooltip for collapsed mode */}
        {!sidebarOpen && (
          <div
            role="tooltip"
            className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 z-50 flex items-center gap-1.5"
          >
            <span>{item.label}</span>
            {item.badge > 0 && (
              <span className="bg-accentRedFg text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {item.badge}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 240 : 72 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="hidden md:flex bg-sidebar border-r border-border flex-col shrink-0 z-20 overflow-visible"
    >
      {/* Header */}
      <div className={cn(
        'h-[4.5rem] flex items-center shrink-0 border-b border-border/70 transition-all',
        sidebarOpen ? 'px-3.5 justify-between' : 'justify-center px-0'
      )}>
        <div className={cn('flex items-center min-w-0', !sidebarOpen && 'justify-center w-full')}>
          <div className="relative group">
            <button
              type="button"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-expanded={sidebarOpen}
              onClick={() => {
                setSidebarOpen(!sidebarOpen);
                if (collapsedFlyoutOpen) setCollapsedFlyoutOpen(false);
              }}
              className="w-11 h-11 flex items-center justify-center text-muted hover:text-fg hover:bg-canvas rounded-xl transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Menu className="w-5 h-5" />
            </button>
            {!sidebarOpen && (
              <div
                role="tooltip"
                className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 z-50"
              >
                <span>Expand sidebar</span>
              </div>
            )}
          </div>
          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.div
                key="full-logo"
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: 'auto', marginLeft: 10 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden shrink-0 flex items-center"
              >
                <img src="/shore_logo.png" alt="SHORE.edu" className="h-9 w-auto object-contain" style={{ maxWidth: 135 }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav Items Container with clean scroll containment */}
      <div className={cn(
        'flex-1 min-h-0 py-3 space-y-1 custom-scrollbar',
        sidebarOpen ? 'px-3 overflow-x-hidden overflow-y-auto' : 'px-2 flex flex-col items-center overflow-visible'
      )}>
        {/* Main Section */}
        {sidebarOpen ? (
          <div className="px-3 pt-1 pb-1.5 text-[10px] font-bold tracking-wider text-muted/70 uppercase select-none">
            Main
          </div>
        ) : (
          <div className="w-8 h-px bg-border/80 my-2 mx-auto" />
        )}

        {TOP_NAV.map(item => (
          <NavItem key={item.id} item={{ ...item, badge: item.id === 'announcements' ? unreadAnnouncements : 0 }} />
        ))}

        {/* Academics / Class Tools Section */}
        <div className={cn('pt-3 pb-1', sidebarOpen ? 'w-full' : 'flex flex-col items-center w-full')}>
          {sidebarOpen ? (
            <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-muted/70 uppercase select-none">
              Academics
            </div>
          ) : (
            <div className="w-8 h-px bg-border/80 my-2 mx-auto" />
          )}

          <div className={cn('relative group', sidebarOpen ? 'w-full' : 'flex justify-center w-full')}>
            <button
              type="button"
              onClick={() => {
                if (!sidebarOpen) {
                  setCollapsedFlyoutOpen(!collapsedFlyoutOpen);
                } else {
                  setClassToolsOpen(!classToolsOpen);
                }
              }}
              aria-label="Class tools"
              aria-expanded={sidebarOpen ? classToolsOpen : collapsedFlyoutOpen}
              aria-controls="class-tools-list"
              className={cn(
                'transition-colors rounded-xl group relative text-sm flex items-center',
                sidebarOpen ? 'w-full justify-between px-3.5 py-2.5' : 'w-11 h-11 justify-center',
                isAnyClassToolActive && (!classToolsOpen || !sidebarOpen)
                  ? 'text-primary bg-primary/10 font-semibold'
                  : 'text-muted hover:text-fg hover:bg-canvas/60'
              )}
            >
              <div className={cn('flex items-center', sidebarOpen ? 'gap-3' : 'justify-center')}>
                <Layers className={cn(
                  'shrink-0 w-5 h-5 transition-opacity',
                  isAnyClassToolActive ? 'opacity-100 text-primary' : 'opacity-70 group-hover:opacity-100'
                )} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                      animate={{ opacity: 1, width: 'auto', marginLeft: 12 }}
                      exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                      className="whitespace-nowrap overflow-hidden font-medium"
                    >
                      Class Tools
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {!sidebarOpen && isAnyClassToolActive && (
                <div className="absolute left-0.5 top-2.5 bottom-2.5 w-1 bg-primary rounded-r-full shadow-sm" />
              )}

              {sidebarOpen && (
                <div className="flex items-center gap-1.5">
                  {isAnyClassToolActive && !classToolsOpen && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                  <ChevronDown className={cn('w-4 h-4 transition-transform duration-200 opacity-70 group-hover:opacity-100', classToolsOpen && 'rotate-180')} />
                </div>
              )}
            </button>

            {/* Tooltip for collapsed mode when flyout is closed */}
            {!sidebarOpen && !collapsedFlyoutOpen && (
              <div
                role="tooltip"
                className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 z-50 flex items-center gap-1.5"
              >
                <span>Class Tools</span>
                {isAnyClassToolActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </div>
            )}

            {/* Floating Flyout Menu for Collapsed Mode */}
            <AnimatePresence>
              {!sidebarOpen && collapsedFlyoutOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCollapsedFlyoutOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, x: -8, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-full top-0 ml-3 w-56 bg-card border border-border shadow-2xl rounded-2xl p-1.5 z-50 flex flex-col gap-0.5"
                  >
                    <div className="px-3 py-2 border-b border-border/60 text-[10px] font-bold text-muted uppercase tracking-wider">
                      Class Tools
                    </div>
                    {classTools.map(subItem => {
                      const isSubActive = currentView === subItem.id;
                      return (
                        <button
                          key={subItem.id}
                          type="button"
                          onClick={() => {
                            setCurrentView(subItem.id);
                            setCollapsedFlyoutOpen(false);
                          }}
                          className={cn(
                            'w-full px-3 py-2 text-left text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            isSubActive ? 'bg-primary text-white shadow-sm' : 'text-fg hover:bg-canvas'
                          )}
                        >
                          <subItem.icon className={cn('w-4 h-4', isSubActive ? 'text-white' : 'text-primary')} />
                          <span>{subItem.label}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {classToolsOpen && sidebarOpen && (
              <motion.div
                id="class-tools-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden flex flex-col gap-0.5 mt-1 pl-3.5 border-l-2 border-border/80 ml-5"
              >
                {classTools.map(item => <NavItem key={item.id} item={item} indent />)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Profile Area */}
      <div className={cn(
        'border-t border-border shrink-0 relative bg-sidebar select-none transition-all',
        sidebarOpen ? 'p-3' : 'py-3 px-2 flex flex-col items-center justify-center'
      )}>
        {/* Hidden File Input for Global Admin Tracker Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx,.xls"
          className="hidden"
        />

        {/* Profile menu backdrop */}
        {isProfileMenuOpen && (
          <button
            type="button"
            aria-label="Close profile menu"
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
            onClick={() => setIsProfileMenuOpen(false)}
          />
        )}

        {/* Profile dropdown menu with Integrated Admin Upload Tracker */}
        <AnimatePresence>
          {isProfileMenuOpen && (
            <motion.div
              role="menu"
              aria-label="Profile options"
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col z-50 p-1.5 w-60',
                sidebarOpen ? 'absolute bottom-full left-3 mb-2' : 'absolute bottom-2 left-full ml-3'
              )}
            >
              <div className="px-3 py-2.5 border-b border-border/60 mb-1">
                <p className="text-xs font-bold text-fg truncate">
                  {userRole === 'admin' ? 'Administrator' : (userName || userEmail.split('@')[0])}
                </p>
                <p className="text-[11px] text-muted truncate">{userEmail}</p>
              </div>

              {userRole === 'admin' && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full px-3 py-2.5 text-left text-xs font-semibold text-fg hover:bg-canvas rounded-xl flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group"
                  >
                    <span className="flex items-center gap-2.5">
                      {file ? (
                        <CheckCircle2 className="w-4 h-4 text-accentGreenFg shrink-0" />
                      ) : (
                        <Upload className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                      )}
                      <span>{file ? 'Update Tracker Data' : 'Upload Tracker (Excel)'}</span>
                    </span>
                    {file ? (
                      <span className="text-[10px] text-accentGreenFg font-bold px-1.5 py-0.5 rounded bg-accentGreen">
                        Active
                      </span>
                    ) : null}
                  </button>
                  <div className="h-px bg-border/60 my-1" />
                </>
              )}

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setCurrentView('settings');
                  setIsProfileMenuOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2.5 text-left text-xs font-semibold rounded-xl flex items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  currentView === 'settings' ? 'bg-primary text-white shadow-sm' : 'text-fg hover:bg-canvas'
                )}
              >
                <Settings className="w-4 h-4" /> Account Settings
              </button>
              <div className="h-px bg-border/60 my-1" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  handleLogout();
                  setIsProfileMenuOpen(false);
                }}
                className="w-full px-3 py-2.5 text-left text-xs font-semibold text-accentRedFg hover:bg-accentRed/10 rounded-xl flex items-center gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentRedFg"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Card / Button */}
        {sidebarOpen ? (
          <div
            className={cn(
              'flex items-center w-full group rounded-2xl p-2 transition-[color,background-color,border-color] duration-200 select-none relative',
              currentView === 'settings'
                ? 'bg-primary/10 border border-primary/20 text-primary shadow-sm'
                : 'hover:bg-canvas border border-transparent text-fg'
            )}
          >
            <button
              type="button"
              aria-label="Open account settings"
              onClick={() => setCurrentView('settings')}
              className="flex items-center min-w-0 flex-1 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <AvatarBorder borderId={equippedBorder} className="w-10 h-10 shrink-0">
                  <div className="w-full h-full rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" width="40" height="40" className="w-full h-full object-cover" />
                    ) : (
                      userRole === 'admin' ? 'A' : (userName || userEmail).charAt(0).toUpperCase()
                    )}
                  </div>
                </AvatarBorder>
              </div>
              <motion.div
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: 'auto', marginLeft: 10 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                className="flex items-center flex-1 min-w-0"
              >
                <div className="flex flex-col whitespace-nowrap overflow-hidden pr-2">
                  <span className={cn('font-bold text-sm leading-tight truncate', currentView === 'settings' ? 'text-primary' : 'text-fg')}>
                    {userRole === 'admin' ? 'Admin' : (userName || userEmail.split('@')[0])}
                  </span>
                  <span className="text-[11px] text-muted leading-tight mt-0.5 capitalize truncate">
                    {userRole} Account
                  </span>
                </div>
              </motion.div>
            </button>
            <button
              type="button"
              aria-label="Open profile options"
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={cn(
                'p-1.5 rounded-lg transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isProfileMenuOpen ? 'bg-canvas text-fg' : 'text-muted hover:text-fg hover:bg-black/5'
              )}
              title="More options"
            >
              <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', isProfileMenuOpen && 'rotate-180')} />
            </button>
          </div>
        ) : (
          <div className="relative group flex justify-center">
            <button
              type="button"
              aria-label="Open profile options"
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={cn(
                'w-11 h-11 rounded-2xl flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 relative',
                currentView === 'settings'
                  ? 'bg-primary/10 ring-2 ring-primary ring-offset-2 text-primary shadow-sm'
                  : 'hover:bg-canvas text-fg'
              )}
            >
              <AvatarBorder borderId={equippedBorder} className="w-10 h-10 shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" width="40" height="40" className="w-full h-full object-cover" />
                  ) : (
                    userRole === 'admin' ? 'A' : (userName || userEmail).charAt(0).toUpperCase()
                  )}
                </div>
              </AvatarBorder>
            </button>

            {/* Tooltip for collapsed avatar */}
            {!isProfileMenuOpen && (
              <div
                role="tooltip"
                className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 z-50 flex items-center gap-1.5"
              >
                <span>{userRole === 'admin' ? 'Admin Profile & Settings' : (userName || 'Profile & Settings')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.aside>
  );
}
