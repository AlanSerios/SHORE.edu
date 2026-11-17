import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { requestFirebaseNotificationPermission } from './firebase';
import { downloadBlob } from './utils';
import { loadStoredUser, saveUser, clearUser } from './utils/userStorage';
import { computeStats, computeStreak, playSound } from './utils/analytics';
import { createPretestTemplate, parsePretestWorkbook, PRETEST_BLUEPRINT_ID } from './utils/assessmentBlueprint';

// Views
import LoginPage from './components/LoginPage';

const CalendarView = React.lazy(() => import('./components/CalendarView'));

const ReportsView = React.lazy(() => import('./components/ReportsView'));

const AccountsView = React.lazy(() => import('./components/AccountsView'));

const ScholarshipsView = React.lazy(() => import('./components/ScholarshipsView'));

const SettingsView = React.lazy(() => import('./components/SettingsView'));

const AttendanceStudentView = React.lazy(() => import('./components/AttendanceStudentView'));

const AttendanceAdminView = React.lazy(() => import('./components/AttendanceAdminView'));

const ManageClassView = React.lazy(() => import('./components/ManageClassView'));

const ManageTeamView = React.lazy(() => import('./components/ManageTeamView'));

const AnnouncementsView = React.lazy(() => import('./components/AnnouncementsView'));

const RecitationsAdminView = React.lazy(() => import('./components/RecitationsAdminView'));

const ShopView = React.lazy(() => import('./components/ShopView'));

const TicketsView = React.lazy(() => import('./components/TicketsView'));

// Layout
import Sidebar from './components/Sidebar';
import { MobileBottomNav, MobileMenuSheet } from './components/mobile/MobileNav';

const DashboardView = React.lazy(() => import('./components/dashboard/DashboardView'));

import PWAInstallBanner from './components/PWAInstallBanner';
import OfflineIndicator from './components/OfflineIndicator';
import TrackerImportDialog from './components/TrackerImportDialog';

import { ACADEMIC_TOOL_IDS, ADMIN_TOOL_IDS } from './utils/navConfig';

export const preloadView = (view) => {
  switch (view) {
    case 'calendar': import('./components/CalendarView'); break;
    case 'announcements': import('./components/AnnouncementsView'); break;
    case 'scholarships': import('./components/ScholarshipsView'); break;
    case 'settings': import('./components/SettingsView'); break;
    case 'shop': case 'leaderboard': import('./components/ShopView'); break;
    case 'tickets': import('./components/TicketsView'); break;
    case 'manageteam': import('./components/ManageTeamView'); break;
    case 'manageclass': import('./components/ManageClassView'); break;
    case 'accounts': import('./components/AccountsView'); break;
    case 'attendance': import('./components/AttendanceAdminView'); import('./components/AttendanceStudentView'); break;
    case 'recitations': import('./components/RecitationsAdminView'); break;
    case 'reports': import('./components/ReportsView'); break;
    case 'dashboard': import('./components/dashboard/DashboardView'); break;
    default: break;
  }
};

export default function App() {
  // ── Data state ──────────────────────────────────────────────
  const [trackerFilename, setTrackerFilename] = useState('');
  const [trackerRevision, setTrackerRevision] = useState('');
  const [trackerLoadState, setTrackerLoadState] = useState('idle');
  const trackerWriteVersion = useRef(0);
  const [legacyTrackerAvailable, setLegacyTrackerAvailable] = useState(false);
  const [trackerImportOpen, setTrackerImportOpen] = useState(false);
  const [trackerImportDraft, setTrackerImportDraft] = useState(null);
  const [trackerImportBusy, setTrackerImportBusy] = useState(false);
  const [trackerHistory, setTrackerHistory] = useState([]);
  const [trackerHistoryLoading, setTrackerHistoryLoading] = useState(false);
  const [trackerHistoryError, setTrackerHistoryError] = useState('');
  const [trackerRestoreBusy, setTrackerRestoreBusy] = useState(false);
  const [students, setStudents] = useState([]);
  const [parsedData, setParsedData] = useState({ pre: {}, post: {} });
  const [globalAttendance, setGlobalAttendance] = useState([]);
  const [globalUsers, setGlobalUsers] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [reportType, setReportType] = useState('both');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState(null);
  const [dataLoadState, setDataLoadState] = useState('idle');
  const [dataLoadError, setDataLoadError] = useState('');

  // ── Auth state ───────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [equippedBorder, setEquippedBorder] = useState(null);

  // ── UI state ─────────────────────────────────────────────────
  const [currentView, _setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMenuSheetOpen, setIsMenuSheetOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [classToolsOpen, setClassToolsOpen] = useState(false);
  const [adminToolsOpen, setAdminToolsOpen] = useState(false);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [expandedCard, setExpandedCard] = useState(null);

  const fileInputRef = useRef(null);
  const authSessionVersionRef = useRef(0);

  const clearAccountScopedData = useCallback((nextSelectedStudent = '', nextLoadState = 'idle') => {
    setTrackerFilename('');
    setTrackerRevision('');
    setTrackerLoadState(nextLoadState);
    setLegacyTrackerAvailable(false);
    setTrackerImportOpen(false);
    setTrackerImportDraft(null);
    setTrackerHistory([]);
    setTrackerHistoryError('');
    setStudents([]);
    setParsedData({ pre: {}, post: {} });
    setGlobalAttendance([]);
    setGlobalUsers([]);
    setSelectedStudent(nextSelectedStudent);
    setReportType('both');
    setDataLoadState(nextLoadState);
    setDataLoadError('');
    setStatus(null);
    setExpandedCard(null);
  }, []);

  const setCurrentView = (view) => {
    if (!view || view === currentView) return;
    _setCurrentView(view);
    window.location.hash = view;

    if (ACADEMIC_TOOL_IDS.includes(view)) {
      setClassToolsOpen(true);
    }

    if (ADMIN_TOOL_IDS.includes(view)) {
      setAdminToolsOpen(true);
    }
  };

  // ── Auth handlers ────────────────────────────────────────────
  const handleLogin = (user, token) => {
    authSessionVersionRef.current += 1;
    clearAccountScopedData(user.role === 'student' ? (user.name || '') : '', 'loading');
    setIsAuthenticated(true);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserName(user.name);
    setProfilePicture(user.profilePicture || null);
    setEquippedBorder(user.equippedBorder || null);
    setCurrentView('dashboard');

    if (user.role === 'student' && user.name) setSelectedStudent(user.name);

    if (token) localStorage.setItem('shore_token', token);
    saveUser(user);
  };

  const handleLogout = useCallback(() => {
    authSessionVersionRef.current += 1;
    clearAccountScopedData();
    setIsAuthenticated(false);
    setUserRole(null);
    setUserEmail('');
    setUserName('');
    setProfilePicture(null);
    setEquippedBorder(null);
    setCurrentView('dashboard');
    clearUser();
  }, [clearAccountScopedData]);

  // Auto-logout and notify on session expiry or token revocation
  useEffect(() => {
    const onAuthExpired = () => {
      handleLogout();
      toast.error('Your session has expired or was revoked. Please sign in again.');
    };

    window.addEventListener('shore_auth_expired', onAuthExpired);

    return () => window.removeEventListener('shore_auth_expired', onAuthExpired);
  }, [handleLogout]);

  const handleUpdateUser = useCallback((user) => {
    if (!user) return;

    if (user.profilePicture !== undefined) setProfilePicture(user.profilePicture || null);

    if (user.equippedBorder !== undefined) setEquippedBorder(user.equippedBorder || null);
    saveUser(user);
  }, []);

  // ── Card expand with sound ───────────────────────────────────
  const handleSetExpandedCard = (card) => {
    if (card && !expandedCard) playSound('whoosh');
    else if (!card && expandedCard) playSound('pop');
    setExpandedCard(card);
  };

  // ── Effects ──────────────────────────────────────────────────
  // Hash-based routing
  useEffect(() => {
    const onHash = () => {
      const view = window.location.hash.replace('#', '') || 'dashboard';
      _setCurrentView(prev => prev === view ? prev : view);

      if (ACADEMIC_TOOL_IDS.includes(view)) {
        setClassToolsOpen(true);
      }

      if (ADMIN_TOOL_IDS.includes(view)) {
        setAdminToolsOpen(true);
      }
    };

    window.addEventListener('hashchange', onHash);
    onHash();

    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Preload common views during idle browser time
  useEffect(() => {
    if (!isAuthenticated) return;

    const idleId = (window.requestIdleCallback || ((cb) => setTimeout(cb, 1000)))(() => {
      preloadView('calendar');
      preloadView('announcements');
      preloadView('shop');

      if (userRole === 'admin') preloadView('manageteam');
    });

    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idleId);
    };
  }, [isAuthenticated, userRole]);

  // Restore session from localStorage or Google OAuth redirect
  useEffect(() => {
    // Check if redirected from Google OAuth with a session token
    const urlParams = new URLSearchParams(window.location.search);
    const googleToken = urlParams.get('token');

    if (googleToken) {
      localStorage.setItem('shore_token', googleToken);
      fetch('/api/users/me')
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data && data.user) {
            handleLogin(data.user, googleToken);
          }
        })
        .catch(console.error)
        .finally(() => {
          const cleanUrl = window.location.pathname + (window.location.hash || '#dashboard');
          window.history.replaceState({}, document.title, cleanUrl);
        });

      return;
    }

    const user = loadStoredUser();

    if (!user) return;
    setIsAuthenticated(true);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserName(user.name);
    setProfilePicture(user.profilePicture || null);
    setEquippedBorder(user.equippedBorder || null);

    if (user.role === 'student' && user.name) setSelectedStudent(user.name);
  }, []);

  // Push notifications
  useEffect(() => {
    if (!isAuthenticated || !userEmail) return;
    requestFirebaseNotificationPermission().then(token => {
      if (token) {
        fetch('/api/register-device', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail, token }) }).catch(console.error);
      }
    });
  }, [isAuthenticated, userEmail]);

  // Unread announcements polling
  const fetchUnreadCounts = useCallback(async () => {
    if (!isAuthenticated || !userEmail) return;

    try {
      const res = await fetch('/api/unread_counts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail }) });

      if (res.ok) {
        const data = await res.json();
        setUnreadAnnouncements(data.announcements || 0);
      }
    } catch { /* ignore */ }
  }, [isAuthenticated, userEmail]);

  useEffect(() => {
    fetchUnreadCounts();
    const id = setInterval(fetchUnreadCounts, 30000);

    return () => clearInterval(id);
  }, [fetchUnreadCounts]);

  // Mark all read when viewing announcements
  useEffect(() => {
    if (currentView === 'announcements' && unreadAnnouncements > 0) {
      setUnreadAnnouncements(0);
      fetch('/api/announcements/mark_all_read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail }) }).catch(console.error);
    }
  }, [currentView, userEmail]);

  // Load tracker + attendance + users on auth. Keep failures visible instead of
  // presenting a network problem as an empty dashboard.
  const applyTrackerData = useCallback((data) => {
    setParsedData(data);
    setTrackerLoadState('success');
    setTrackerRevision(data.revision ?? '');
    setLegacyTrackerAvailable(Boolean(data.legacyDataAvailable));
    setTrackerFilename(data.metadata?.filename || '');

    const list = [...new Set([...Object.keys(data.pre), ...Object.keys(data.post)])].sort();
    setStudents(list);
    setSelectedStudent(prev => list.includes(prev) ? prev : (list[0] || (userRole === 'student' ? userName : '') || ''));
  }, [userRole, userName]);

  const loadCoreData = useCallback(async () => {
    if (!isAuthenticated) return;
    const sessionVersion = authSessionVersionRef.current;
    const writeVersion = trackerWriteVersion.current;
    setDataLoadState('loading');
    setTrackerLoadState('loading');
    setDataLoadError('');

    const fetchJson = async (url) => {
      const response = await fetch(url);

      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

      return response.json();
    };

    const timestamp = Date.now();

    const [trackerResult, attendanceResult, usersResult] = await Promise.allSettled([
      fetchJson(`/api/tracker_data?t=${timestamp}`),
      fetchJson(`/api/attendance?t=${timestamp}`),
      fetchJson(`/api/users?t=${timestamp}`),
    ]);

    if (sessionVersion !== authSessionVersionRef.current) return;

    if (writeVersion === trackerWriteVersion.current) {
      const data = trackerResult.status === 'fulfilled' ? trackerResult.value : null;

      if (data?.pre && data?.post) applyTrackerData(data);
      else setTrackerLoadState('error');
    }

    if (attendanceResult.status === 'fulfilled') setGlobalAttendance(attendanceResult.value.attendance || []);

    if (usersResult.status === 'fulfilled') setGlobalUsers(usersResult.value.users || []);

    const failed = [trackerResult, attendanceResult, usersResult].filter(result => result.status === 'rejected');

    if (failed.length) {
      failed.forEach(result => console.error('Failed to load dashboard data', result.reason));
      setDataLoadState('error');
      setDataLoadError(failed.length === 3
        ? 'We could not reach the data service. Check your connection and try again.'
        : 'Some dashboard data could not be loaded. Try again to refresh the missing information.');

      return;
    }

    setDataLoadState('success');
  }, [isAuthenticated, applyTrackerData]);

  useEffect(() => {
    loadCoreData();
  }, [loadCoreData]);

  // Sync equipped border from globalUsers
  useEffect(() => {
    if (!userEmail || !globalUsers.length) return;
    const u = globalUsers.find(x => x.email === userEmail);

    if (u?.equippedBorder !== undefined) setEquippedBorder(prev => prev !== u.equippedBorder ? (u.equippedBorder || null) : prev);
  }, [globalUsers, userEmail]);

  // ── Derived values ───────────────────────────────────────────
  const stats = useMemo(
    () => computeStats(selectedStudent, reportType, parsedData, userRole),
    [selectedStudent, reportType, parsedData, userRole],
  );

  const studentStreak = useMemo(
    () => computeStreak(globalAttendance, globalUsers, selectedStudent, userRole, userEmail),
    [globalAttendance, globalUsers, selectedStudent, userRole, userEmail],
  );

  // ── File upload (Excel) ──────────────────────────────────────
  const handleFileUpload = async (event) => {
    const uploadedFile = event?.target?.files?.[0];

    if (!uploadedFile) return;
    const sessionVersion = authSessionVersionRef.current;
    setTrackerImportOpen(true);
    setTrackerImportDraft({ fileName: uploadedFile.name, rows: [], errors: [], sheetName: '', loading: true });

    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await uploadedFile.arrayBuffer(), { cellDates: false });
      const parsed = parsePretestWorkbook(workbook, XLSX);

      if (sessionVersion !== authSessionVersionRef.current) return;
      setTrackerImportDraft({ ...parsed, fileName: uploadedFile.name, loading: false });
      setStatus(null);
    } catch (error) {
      if (sessionVersion !== authSessionVersionRef.current) return;
      console.error('Failed to read pre-test workbook', error);
      setTrackerImportDraft({
        fileName: uploadedFile.name,
        rows: [],
        loading: false,
        errors: [{ row: 0, message: 'This file could not be read. Save it as an .xlsx workbook and try again.' }],
      });
    } finally {
      if (event?.target) event.target.value = '';
    }
  };

  const downloadTrackerTemplate = async () => {
    const XLSX = await import('xlsx');
    const workbook = createPretestTemplate(XLSX);
    XLSX.writeFile(workbook, 'SHORE_PreTest_160_Scores.xlsx');
  };

  const loadTrackerHistory = async () => {
    const sessionVersion = authSessionVersionRef.current;
    setTrackerHistoryLoading(true);
    setTrackerHistoryError('');

    try {
      const response = await fetch('/api/tracker_data/history');
      const result = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(result.error || 'Could not load tracker history.');

      if (sessionVersion !== authSessionVersionRef.current) return;

      setTrackerHistory(result.history || []);
      setTrackerRevision(result.revision || trackerRevision);
    } catch (error) {
      if (sessionVersion !== authSessionVersionRef.current) return;
      setTrackerHistoryError(error.message || 'Could not load tracker history.');
    } finally {
      setTrackerHistoryLoading(false);
    }
  };

  const restoreTrackerVersion = async (backupId) => {
    const sessionVersion = authSessionVersionRef.current;
    setTrackerRestoreBusy(true);

    try {
      const response = await fetch('/api/tracker_data/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId, revision: trackerRevision }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(result.error || 'Could not restore this tracker version.');

      if (sessionVersion !== authSessionVersionRef.current) return false;

      if (!result.success || !result.tracker?.pre || !result.tracker?.post) {
        throw new Error('The server did not confirm which version was restored. Refresh saved versions before retrying.');
      }

      trackerWriteVersion.current += 1;
      applyTrackerData(result.tracker);
      setTrackerHistory([]);

      const message = result.legacyFormat
        ? 'Older tracker restored. Its scores use a different test structure and are kept outside the current diagnostic reports.'
        : `Restored ${result.diagnosticCount} pre-test results to Dashboard and Reports.`;

      setStatus({ type: 'success', msg: message });
      toast.success(message);

      return true;
    } catch (error) {
      if (sessionVersion !== authSessionVersionRef.current) return false;
      setStatus({ type: 'error', msg: error.message || 'Could not restore tracker history.' });
      toast.error(error.message || 'Could not restore tracker history.');

      return false;
    } finally {
      setTrackerRestoreBusy(false);
    }
  };

  const commitTrackerImport = async ({ mode, confirmReplace }) => {
    if (!trackerImportDraft?.rows?.length || trackerImportDraft.errors?.length) return;
    const sessionVersion = authSessionVersionRef.current;
    setTrackerImportBusy(true);

    try {
      const response = await fetch('/api/tracker_data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: PRETEST_BLUEPRINT_ID,
          revision: trackerRevision,
          filename: trackerImportDraft.fileName,
          mode,
          confirmReplace,
          rows: trackerImportDraft.rows,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(result.error || `Import failed (${response.status}).`);

      if (sessionVersion !== authSessionVersionRef.current) return;

      const tracker = result.tracker;

      if (!result.success || !tracker?.pre || !tracker?.post || tracker.revision !== result.revision) {
        throw new Error('The server did not confirm which results were saved. Refresh the page before retrying.');
      }

      trackerWriteVersion.current += 1;
      applyTrackerData(tracker);
      setTrackerImportOpen(false);
      setTrackerImportDraft(null);

      setCurrentView('reports');

      const successMessage = `Published ${result.importedCount} pre-test results to Dashboard and Reports.`;
      setStatus({ type: 'success', msg: successMessage });
      toast.success(successMessage);
    } catch (error) {
      if (sessionVersion !== authSessionVersionRef.current) return;
      console.error('Tracker import did not complete', error);
      setStatus({ type: 'error', msg: error.message || 'Tracker import failed. Your reviewed file is still available to retry.' });
      toast.error(error.message || 'Tracker import failed. Your reviewed file is still available to retry.');
    } finally {
      setTrackerImportBusy(false);
    }
  };

  // ── PDF generation ───────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedStudent) return;
    setIsGenerating(true);
    setStatus({ type: 'info', msg: 'Generating PDF...' });

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_name: selectedStudent, report_type: 'pre' }),
      });

      if (!response.ok) throw new Error(`Server error ${response.status}`);
      let filename = `SHORE_Pre-Test_${selectedStudent.replace(/\s+/g, '_')}.pdf`;
      const disposition = response.headers.get('Content-Disposition');

      if (disposition?.includes('attachment')) {
        const m = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);

        if (m?.[1]) filename = m[1].replace(/['"]/g, '');
      }

      downloadBlob(await response.blob(), filename);
      setStatus({ type: 'success', msg: 'PDF generated.' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: 'Failed to generate PDF.' });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  const sharedProps = { userRole, userEmail, profilePicture, equippedBorder };

  const renderView = (view) => {
    switch (view) {
      case 'dashboard':
        return (
          <DashboardView
            {...sharedProps}
            userName={userName}
            students={students} stats={stats}
            selectedStudent={selectedStudent} setSelectedStudent={setSelectedStudent}
            reportType={reportType} setReportType={setReportType}
            hasPretest={Boolean(parsedData.pre?.[selectedStudent])}
            isGenerating={isGenerating} handleGenerate={handleGenerate}
            studentStreak={studentStreak}
            expandedCard={expandedCard} handleSetExpandedCard={handleSetExpandedCard}
            handleLogout={handleLogout}
            dataLoadState={dataLoadState} dataLoadError={dataLoadError}
            onRetryData={loadCoreData}
            onUploadTracker={() => setTrackerImportOpen(true)}
            trackerFile={trackerFilename}
            legacyTrackerAvailable={legacyTrackerAvailable}
            onViewReports={userRole === 'admin' ? () => setCurrentView('reports') : undefined}
          />
        );
      case 'calendar':
        return <CalendarView userRole={userRole} />;
      case 'scholarships':
        return <ScholarshipsView userRole={userRole} userEmail={userEmail} />;
      case 'settings':
        return <SettingsView userEmail={userEmail} userRole={userRole} onUpdateUser={handleUpdateUser} />;
      case 'accounts':
        return userRole === 'admin' ? <AccountsView /> : null;
      case 'manageclass':
        return userRole === 'admin' ? <ManageClassView onUploadTracker={() => setTrackerImportOpen(true)} trackerFile={trackerFilename} /> : null;
      case 'manageteam':
        return userRole === 'admin' ? <ManageTeamView /> : null;
      case 'attendance':
        return userRole === 'admin' ? <AttendanceAdminView /> : <AttendanceStudentView userEmail={userEmail} userName={userName} />;
      case 'announcements':
        return <AnnouncementsView userEmail={userEmail} userName={userName} userRole={userRole} profilePicture={profilePicture} onRead={fetchUnreadCounts} />;
      case 'shop':
      case 'leaderboard':
        return <ShopView userEmail={userEmail} userRole={userRole} />;
      case 'recitations':
        return <RecitationsAdminView />;
      case 'tickets':
        return <TicketsView userEmail={userEmail} userName={userName} userRole={userRole} />;
      case 'reports':
        return userRole === 'admin' ? (
          <ReportsView
            parsedData={parsedData}
            trackerLoadState={trackerLoadState}
            onRetry={loadCoreData}
            onUploadTracker={() => setTrackerImportOpen(true)}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div key="login" exit={{ opacity: 0, transition: { duration: 0.3 } }} className="absolute inset-0 z-50 bg-background">
            <LoginPage onLogin={handleLogin} />
          </motion.div>
        ) : (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="absolute inset-0 flex h-[100dvh] bg-canvas font-sans overflow-hidden text-fg">

            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary focus:shadow-lg">
              Skip to main content
            </a>

            <Sidebar
              {...sharedProps}
              sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
              currentView={currentView} setCurrentView={setCurrentView}
              preloadView={preloadView}
              userRole={userRole} userEmail={userEmail} userName={userName}
              unreadAnnouncements={unreadAnnouncements}
              classToolsOpen={classToolsOpen} setClassToolsOpen={setClassToolsOpen}
              adminToolsOpen={adminToolsOpen} setAdminToolsOpen={setAdminToolsOpen}
              isProfileMenuOpen={isProfileMenuOpen} setIsProfileMenuOpen={setIsProfileMenuOpen}
              file={trackerFilename} fileInputRef={fileInputRef}
              status={status} handleLogout={handleLogout}
            />

            <main id="main-content" tabIndex="-1" className="flex-1 flex flex-col overflow-hidden relative focus:outline-none">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentView}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                  className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full"
                >
                  <React.Suspense fallback={
                    <div className="flex-1 flex items-center justify-center min-h-[300px]" role="status" aria-live="polite">
                      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span className="sr-only">Loading view…</span>
                    </div>
                  }>
                    {renderView(currentView)}
                  </React.Suspense>
                </motion.div>
              </AnimatePresence>
            </main>

            <MobileMenuSheet
              isOpen={isMenuSheetOpen} onClose={() => setIsMenuSheetOpen(false)}
              currentView={currentView} setCurrentView={setCurrentView}
              {...sharedProps}
              userName={userName}
              handleLogout={handleLogout}
            />

          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
        aria-label="Choose pre-test score workbook"
      />

      <TrackerImportDialog
        open={isAuthenticated && userRole === 'admin' && trackerImportOpen}
        draft={trackerImportDraft}
        currentNames={Object.keys(parsedData.pre || {})}
        busy={trackerImportBusy}
        history={trackerHistory}
        historyLoading={trackerHistoryLoading}
        historyError={trackerHistoryError}
        restoreBusy={trackerRestoreBusy}
        onClose={() => { if (!trackerImportBusy && !trackerRestoreBusy) setTrackerImportOpen(false); }}
        onChooseFile={() => fileInputRef.current?.click()}
        onDownloadTemplate={downloadTrackerTemplate}
        onImport={commitTrackerImport}
        onLoadHistory={loadTrackerHistory}
        onRestore={restoreTrackerVersion}
      />

      {isAuthenticated && (
        <MobileBottomNav
          currentView={currentView} setCurrentView={setCurrentView}
          preloadView={preloadView}
          unreadAnnouncements={unreadAnnouncements}
          isMenuSheetOpen={isMenuSheetOpen} setIsMenuSheetOpen={setIsMenuSheetOpen}
        />
      )}

      <OfflineIndicator />
      <PWAInstallBanner />
    </>
  );
}
