import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { requestFirebaseNotificationPermission } from './firebase';
import { downloadBlob } from './utils';
import { loadStoredUser, saveUser, clearUser } from './utils/userStorage';
import { computeStats, computeStreak, playSound, ALL_SUBJ } from './utils/analytics';

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
  const [file, setFile] = useState(null);
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
    setIsAuthenticated(false);
    setUserRole(null);
    setUserEmail('');
    setProfilePicture(null);
    setEquippedBorder(null);
    setCurrentView('dashboard');
    clearUser();
  }, []);

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
  const loadCoreData = useCallback(async () => {
    if (!isAuthenticated) return;
    setDataLoadState('loading');
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

    if (trackerResult.status === 'fulfilled') {
      const data = trackerResult.value;

      if (data?.pre && data?.post) {
        setParsedData(data);
        const list = Array.from(new Set([...Object.keys(data.pre), ...Object.keys(data.post)])).sort();
        setStudents(list);
        setSelectedStudent(prev => prev || list[0] || '');
      }
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
  }, [isAuthenticated]);

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
    () => computeStats(selectedStudent, reportType, parsedData),
    [selectedStudent, reportType, parsedData],
  );

  const studentStreak = useMemo(
    () => computeStreak(globalAttendance, globalUsers, selectedStudent, userRole, userEmail),
    [globalAttendance, globalUsers, selectedStudent, userRole, userEmail],
  );

  // ── File upload (Excel) ──────────────────────────────────────
  const handleFileUpload = async (e) => {
    const uploadedFile = e?.target?.files ? e.target.files[0] : e;

    if (!uploadedFile) return null;
    setFile(uploadedFile);
    setStatus(null);
    setSelectedStudent('');
    setParsedData({ pre: {}, post: {} });

    try {
      const XLSX = await import('xlsx');
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const studentNames = new Set();
      const newParsedData = { pre: {}, post: {} };
      ['Pre-Test Data', 'Post-Test Data'].forEach(sheetName => {
        const sheetKey = sheetName.includes('Pre') ? 'pre' : 'post';

        if (!workbook.Sheets[sheetName]) return;
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        for (let i = 1; i < json.length; i++) {
          const row = json[i];

          if (row?.[3]) {
            const name = row[3];
            studentNames.add(name);
            const studentData = { total: parseFloat(row[4]) || 0, subjects: {} };
            ALL_SUBJ.forEach((subj, idx) => { studentData.subjects[subj] = parseFloat(row[5 + idx]) || 0; });
            newParsedData[sheetKey][name] = studentData;
          }
        }
      });
      const sortedStudents = Array.from(studentNames).sort();
      setStudents(sortedStudents);
      setParsedData(newParsedData);
      await Promise.all([
        fetch('/api/allowed_students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ students: sortedStudents }) }).catch(console.error),
        fetch('/api/tracker_data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newParsedData) }).catch(console.error),
      ]);
      const msg = sortedStudents.length > 0 ? `Loaded tracker with ${sortedStudents.length} students.` : 'No student names found in tracker file.';
      setStatus({ type: 'success', msg });
      toast.success(msg);

      return { success: true, count: sortedStudents.length, students: sortedStudents };
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: 'Failed to parse Excel tracker file.' });
      toast.error('Failed to parse Excel tracker file.');

      return { success: false, error: err };
    }
  };

  // ── PDF generation ───────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedStudent) return;
    setIsGenerating(true);
    setStatus({ type: 'info', msg: 'Generating PDF...' });

    try {
      let response;

      if (file) {
        const formData = new FormData();
        formData.append('excel_file', file);
        formData.append('student_name', selectedStudent);
        formData.append('report_type', reportType);
        response = await fetch('/api/generate-pdf', { method: 'POST', body: formData });
      } else {
        response = await fetch('/api/generate-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_name: selectedStudent, report_type: reportType }) });
      }

      if (!response.ok) throw new Error(`Server error ${response.status}`);
      let filename = `SHORE_${reportType}_${selectedStudent.replace(/\s+/g, '_')}.pdf`;
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
            isGenerating={isGenerating} handleGenerate={handleGenerate}
            studentStreak={studentStreak}
            expandedCard={expandedCard} handleSetExpandedCard={handleSetExpandedCard}
            handleLogout={handleLogout}
            dataLoadState={dataLoadState} dataLoadError={dataLoadError}
            onRetryData={loadCoreData}
            onUploadTracker={() => fileInputRef.current?.click()}
            trackerFile={file}
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
        return userRole === 'admin' ? <ManageClassView onUploadTracker={handleFileUpload} trackerFile={file} /> : null;
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
      default:
        return <ReportsView parsedData={parsedData} students={students} />;
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
              file={file} fileInputRef={fileInputRef} handleFileUpload={handleFileUpload}
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
