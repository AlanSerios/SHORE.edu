import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { requestFirebaseNotificationPermission } from './firebase';
import { Upload, CheckCircle2, ChevronDown, Download, AlertCircle, Loader2, ArrowLeft, Target, Trophy, TrendingUp, AlertTriangle, LayoutDashboard, Calendar, FileText } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import { cn } from './utils';
import CalendarView from './components/CalendarView';
import ReportsView from './components/ReportsView';
import AccountsView from './components/AccountsView';
import LoginPage from './components/LoginPage';
import ScholarshipsView from './components/ScholarshipsView';
import SettingsView from './components/SettingsView';
import AttendanceStudentView from './components/AttendanceStudentView';
import AttendanceAdminView from './components/AttendanceAdminView';
import { LogOut, Users, Menu, Award, Settings, ClipboardCheck, GraduationCap, Shield, Megaphone, Star, Layers } from 'lucide-react';
import ManageClassView from './components/ManageClassView';
import ManageTeamView from './components/ManageTeamView';
import AnnouncementsView from './components/AnnouncementsView';
import RecitationsAdminView from './components/RecitationsAdminView';
import LeaderboardView from './components/LeaderboardView';

const REPORT_TYPES = [
  { id: 'pre', label: 'Pre-Test Only' },
  { id: 'post', label: 'Post-Test Only' },
  { id: 'both', label: 'Progress Report' }
];

const ALL_SUBJ = ["Arithmetic", "Algebra", "Geometry", "Calculus", "Trigonometry", "Logic", "Chemistry", "Biology", "Earth Science", "Physics", "English"];

export default function App() {
  const [file, setFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [parsedData, setParsedData] = useState({ pre: {}, post: {} });
  const [selectedStudent, setSelectedStudent] = useState('');
  const [reportType, setReportType] = useState('both');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState(null);
  const [currentView, _setCurrentView] = useState('dashboard');
  const setCurrentView = (view) => {
    _setCurrentView(view);
    window.location.hash = view;
  };
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'admin' or 'student'
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMenuSheetOpen, setIsMenuSheetOpen] = useState(false);
  const [classToolsOpen, setClassToolsOpen] = useState(false);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);

  React.useEffect(() => {
    if (isAuthenticated && userEmail) {
      // Try to request notification permission and register device
      requestFirebaseNotificationPermission().then(token => {
        if (token) {
          fetch('/api/register-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, token })
          }).catch(console.error);
        }
      });
    }
  }, [isAuthenticated, userEmail]);

  const fetchUnreadCounts = async () => {
    if (!isAuthenticated || !userEmail) return;
    try {
      const res = await fetch('/api/unread_counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadAnnouncements(data.announcements || 0);
      }
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, userEmail]);

  React.useEffect(() => {
    if (currentView === 'announcements' && unreadAnnouncements > 0) {
      setUnreadAnnouncements(0);
      fetch('/api/announcements/mark_all_read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      }).catch(console.error);
    }
  }, [currentView, unreadAnnouncements, userEmail]);

  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      _setCurrentView(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  React.useEffect(() => {
    const storedUser = localStorage.getItem('shore_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUserEmail(user.email);
        setUserRole(user.role);
        setUserName(user.name);
        setProfilePicture(user.profilePicture || null);
        if (user.role === 'student' && user.name) {
          setSelectedStudent(user.name);
        }
      } catch (e) {
        console.error('Failed to parse user from local storage', e);
      }
    }
  }, []);

  React.useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/tracker_data')
        .then(res => res.json())
        .then(data => {
          if (data && data.pre && data.post) {
            setParsedData(data);
            const preStudents = Object.keys(data.pre);
            const postStudents = Object.keys(data.post);
            const all = Array.from(new Set([...preStudents, ...postStudents])).sort();
            setStudents(all);
          }
        })
        .catch(err => console.error("Failed to load tracker data", err));
    }
  }, [isAuthenticated]);

  const fileInputRef = useRef(null);

  const handleLogin = (user) => {
    setIsAuthenticated(true);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserName(user.name);
    setProfilePicture(user.profilePicture || null);
    setCurrentView('dashboard');
    if (user.role === 'student' && user.name) {
      setSelectedStudent(user.name);
    }
    localStorage.setItem('shore_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserEmail('');
    setProfilePicture(null);
    setCurrentView('dashboard');
    localStorage.removeItem('shore_user');
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setStatus(null);
    setSelectedStudent('');
    setParsedData({ pre: {}, post: {} });
    
    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const studentNames = new Set();
      const newParsedData = { pre: {}, post: {} };
      
      ['Pre-Test Data', 'Post-Test Data'].forEach(sheetName => {
        const sheetKey = sheetName.includes('Pre') ? 'pre' : 'post';
        if (workbook.Sheets[sheetName]) {
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          for (let i = 1; i < json.length; i++) {
            const row = json[i];
            if (row && row[3]) {
              const name = row[3];
              studentNames.add(name);
              const studentData = { total: parseFloat(row[4]) || 0, subjects: {} };
              ALL_SUBJ.forEach((subj, idx) => {
                 studentData.subjects[subj] = parseFloat(row[5 + idx]) || 0;
              });
              newParsedData[sheetKey][name] = studentData;
            }
          }
        }
      });
      
      const sortedStudents = Array.from(studentNames).sort();
      setStudents(sortedStudents);
      setParsedData(newParsedData);
      
      fetch('/api/allowed_students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: sortedStudents })
      }).catch(err => console.error("Failed to sync students to backend", err));
      
      fetch('/api/tracker_data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newParsedData)
      }).catch(err => console.error("Failed to sync tracker data", err));
      
      if (sortedStudents.length > 0) {
        setStatus({ type: 'success', msg: `Loaded ${sortedStudents.length} records.` });
      } else {
        setStatus({ type: 'error', msg: 'No names found.' });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: 'Failed to parse Excel.' });
    }
  };

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
        
        response = await fetch('/api/generate-pdf', {
          method: 'POST',
          body: formData
        });
      } else {
        response = await fetch('/api/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_name: selectedStudent,
            report_type: reportType
          })
        });
      }
      
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      
      let filename = `SHORE_${reportType}_${selectedStudent.replace(/\s+/g, '_')}.pdf`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.includes('attachment')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setStatus({ type: 'success', msg: 'PDF generated.' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: 'Failed to generate PDF.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const stats = useMemo(() => {
    if (!selectedStudent) return null;
    const pre = parsedData.pre[selectedStudent];
    const post = parsedData.post[selectedStudent];
    
    const activeType = reportType === 'pre' ? 'pre' : 'post';
    const fallbackType = activeType === 'post' && !post ? 'pre' : activeType;
    const activeData = parsedData[fallbackType];
    
    const studentData = activeData?.[selectedStudent];
    if (!studentData) return null;

    let rank = 1;
    let totalStudents = 0;
    const cohortTotals = Object.values(activeData || {}).map(s => s.total);
    cohortTotals.forEach(t => {
      totalStudents++;
      if (t > studentData.total) rank++;
    });

    const cohortAverages = {};
    if (totalStudents > 0) {
       ALL_SUBJ.forEach(subj => {
          let sum = 0;
          Object.values(activeData).forEach(s => sum += (s.subjects[subj] || 0));
          cohortAverages[subj] = sum / totalStudents;
       });
    }

    const radarData = ALL_SUBJ.map(subj => ({
       subject: subj.length > 8 ? subj.substring(0, 8) + '...' : subj,
       score: studentData.subjects[subj] || 0
    }));

    const vsCohortData = ALL_SUBJ.map(subj => ({
       subject: subj,
       student: studentData.subjects[subj] || 0,
       cohort: Math.round(cohortAverages[subj] || 0)
    }));

    let preVsPostData = null;
    if (pre && post && reportType === 'both') {
       preVsPostData = ALL_SUBJ.map(subj => ({
          subject: subj,
          pre: pre.subjects[subj] || 0,
          post: post.subjects[subj] || 0
       }));
    }

    const subjectRankings = Object.entries(studentData.subjects || {})
      .map(([name, score]) => {
        const cohortAvg = Math.round(cohortAverages[name] || 0);
        return { name, score, cohortAvg, diff: score - cohortAvg };
      })
      .sort((a, b) => b.score - a.score);

    const strongest = subjectRankings.length > 0 ? subjectRankings[0] : { name: 'N/A', score: 0, cohortAvg: 0 };
    const weaknesses = [...subjectRankings].reverse().slice(0, 3);

    let growth = null;
    if (pre && post) {
      growth = post.total - pre.total;
    }

    let mostImproved = { name: 'N/A', diff: -Infinity };
    if (pre && post) {
        Object.keys(pre.subjects).forEach(subj => {
            const diff = (post.subjects[subj] || 0) - (pre.subjects[subj] || 0);
            if (diff > mostImproved.diff) mostImproved = { name: subj, diff };
        });
    }

    return {
      rank,
      totalStudents,
      total: studentData.total,
      growth,
      strongest,
      weaknesses,
      subjectRankings,
      mostImproved: mostImproved.diff !== -Infinity ? mostImproved : null,
      activeType: fallbackType,
      radarData,
      vsCohortData,
      preVsPostData
    };
  }, [selectedStudent, reportType, parsedData]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 shadow-sm rounded-lg">
          <p className="font-semibold text-fg text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <AnimatePresence mode="wait">
      {!isAuthenticated ? (
        <motion.div
          key="login"
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          className="absolute inset-0 z-50 bg-background"
        >
          <LoginPage onLogin={handleLogin} />
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0 flex h-screen bg-canvas font-sans overflow-hidden text-fg"
        >
          
          {/* LEFT SIDEBAR */}
      <motion.aside 
        animate={{ width: sidebarOpen ? 256 : 80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden md:flex bg-sidebar border-r border-border flex-col shrink-0 z-20 overflow-visible"
      >
        <div className="h-20 flex items-center pl-4 pr-4 shrink-0 overflow-hidden">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-2 text-muted hover:text-fg hover:bg-canvas rounded-lg transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.div
                key="full-logo"
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: "auto", marginLeft: 10 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden shrink-0"
              >
                <img
                  src="/shore_logo.png"
                  alt="SHORE.ed"
                  className="h-10 w-auto object-contain"
                  style={{ maxWidth: 140 }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 px-4 py-4 space-y-2 overflow-x-hidden overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard',     show: true },
            { id: 'announcements',icon: Megaphone,       label: 'Announcements', show: true, badge: unreadAnnouncements },
            { id: 'calendar',     icon: Calendar,        label: 'Calendar',      show: true },
          ].filter(i => i.show).map((item) => (
            <div 
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              title={!sidebarOpen ? item.label : ""}
              className="relative flex items-center cursor-pointer group rounded-xl overflow-hidden"
            >
              {currentView === item.id && (
                <motion.div 
                  layoutId="active-sidebar-pill"
                  className="absolute inset-0 bg-primary shadow-sm"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {currentView !== item.id && (
                <div className="absolute inset-0 bg-canvas opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              
              <div className={cn(
                "relative z-10 flex items-center font-medium transition-all duration-200",
                sidebarOpen ? "w-full px-3.5 py-3" : "w-11 h-11 justify-center",
                currentView === item.id ? "text-white" : "text-muted group-hover:text-fg"
              )}>
                <item.icon className={cn("shrink-0 transition-opacity", sidebarOpen ? "w-5 h-5" : "w-5 h-5", currentView === item.id ? "opacity-100" : "opacity-70 group-hover:opacity-100")} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span 
                      initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                      animate={{ opacity: 1, width: "auto", marginLeft: 12 }}
                      exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.badge > 0 && (
                  sidebarOpen ? (
                    <div className={cn("ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full", currentView === item.id ? "bg-white text-primary" : "bg-accentRedFg text-white")}>
                      {item.badge}
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accentRedFg border border-card" />
                  )
                )}
              </div>
            </div>
          ))}

          <div className="pt-2 pb-1">
            <button
              onClick={() => {
                if (!sidebarOpen) setSidebarOpen(true);
                setClassToolsOpen(!classToolsOpen);
              }}
              className="w-full flex items-center justify-between text-muted hover:text-fg transition-colors px-3 py-2 rounded-xl group"
              title={!sidebarOpen ? "Class Tools" : ""}
            >
               <div className="flex items-center gap-3">
                 <Layers className={cn("shrink-0 transition-opacity", sidebarOpen ? "w-5 h-5" : "w-5 h-5 ml-0.5", "opacity-70 group-hover:opacity-100")} />
                 <AnimatePresence>
                   {sidebarOpen && (
                     <motion.span 
                       initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                       animate={{ opacity: 1, width: "auto", marginLeft: 12 }}
                       exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                       className="whitespace-nowrap overflow-hidden text-sm font-bold"
                     >
                       Class Tools
                     </motion.span>
                   )}
                 </AnimatePresence>
               </div>
               {sidebarOpen && (
                 <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", classToolsOpen ? "rotate-180" : "")} />
               )}
            </button>
            <AnimatePresence>
              {classToolsOpen && sidebarOpen && (
                 <motion.div
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: "auto", opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   className="overflow-hidden flex flex-col gap-1 mt-1 pl-4 border-l border-border ml-5"
                 >
                   {[
                      { id: 'attendance',   icon: ClipboardCheck,  label: 'Attendance',    show: true },
                      { id: 'leaderboard',  icon: Star,            label: 'Leaderboard',   show: true },
                      { id: 'recitations',  icon: Target,          label: 'Recitations',   show: userRole === 'admin' },
                      { id: 'scholarships', icon: Award,           label: 'Scholarships',  show: true },
                      { id: 'reports',      icon: FileText,        label: 'Reports',       show: userRole === 'admin' },
                      { id: 'manageclass',  icon: GraduationCap,   label: 'Manage Class',  show: userRole === 'admin' },
                      { id: 'manageteam',   icon: Shield,          label: 'Manage Team',   show: userRole === 'admin' },
                      { id: 'accounts',     icon: Users,           label: 'Accounts',      show: userRole === 'admin' },
                   ].filter(i => i.show).map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => setCurrentView(item.id)}
                        className="relative flex items-center cursor-pointer group rounded-xl overflow-hidden mt-1"
                      >
                        {currentView === item.id && (
                          <motion.div 
                            layoutId="active-sidebar-pill"
                            className="absolute inset-0 bg-primary shadow-sm"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        {currentView !== item.id && (
                          <div className="absolute inset-0 bg-canvas opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                        
                        <div className={cn(
                          "relative z-10 flex items-center font-medium transition-all duration-200 w-full px-3 py-2",
                          currentView === item.id ? "text-white" : "text-muted group-hover:text-fg"
                        )}>
                          <item.icon className={cn("shrink-0 transition-opacity w-4 h-4", currentView === item.id ? "opacity-100" : "opacity-70 group-hover:opacity-100")} />
                          <span className="whitespace-nowrap overflow-hidden ml-3 text-sm">
                            {item.label}
                          </span>
                        </div>
                      </div>
                   ))}
                 </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-auto flex flex-col w-full">
          {userRole === 'admin' && (
            <div className="px-4 pb-4 flex flex-col items-center">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls" className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()}
                title={!sidebarOpen ? (file ? "Data Uploaded" : "Upload Tracker") : ""}
                className={cn(
                  "w-full px-3.5 py-3 rounded-xl border border-border bg-card text-sm font-semibold flex items-center transition-all shadow-sm overflow-hidden group shrink-0",
                  file ? "border-primary/30 text-primary hover:bg-primary/5" : "text-fg hover:bg-canvas"
                )}
              >
                <div className="flex items-center w-full">
                  <div className="shrink-0 flex items-center justify-center">
                    {file ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                  </div>
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span 
                        initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                        animate={{ opacity: 1, width: "auto", marginLeft: 12 }}
                        exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                        className="whitespace-nowrap overflow-hidden text-left"
                      >
                        {file ? "Data Uploaded" : "Upload Tracker"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </button>
              <AnimatePresence>
                {status && status.type === 'error' && sidebarOpen && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-accentRedFg mt-3 text-center w-full truncate overflow-hidden"
                  >
                    {status.msg}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="p-4 border-t border-border flex flex-col gap-2 overflow-visible shrink-0 relative">
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-4 w-52 mb-2 bg-card border border-border shadow-lg rounded-xl overflow-hidden flex flex-col z-50"
                >
                  <button
                    onClick={() => {
                      setCurrentView('settings');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-fg hover:bg-canvas flex items-center gap-3 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-muted" />
                    Manage Account
                  </button>
                  <div className="h-px bg-border w-full" />
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-medium text-accentRedFg hover:bg-accentRed/10 flex items-center gap-3 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={cn(
                "flex items-center w-full cursor-pointer group rounded-xl p-1 transition-colors",
                isProfileMenuOpen ? "bg-canvas" : "hover:bg-canvas"
              )}
              title={!sidebarOpen ? "Profile Menu" : "Profile Menu"}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  userRole === 'admin' ? 'A' : userEmail.charAt(0).toUpperCase()
                )}
              </div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div 
                    initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                    animate={{ opacity: 1, width: "auto", marginLeft: 12 }}
                    exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                    className="flex flex-col whitespace-nowrap overflow-hidden flex-1"
                  >
                    <span className="font-bold text-sm text-fg leading-tight truncate">
                      {userRole === 'admin' ? 'Admin' : userEmail.split('@')[0]}
                    </span>
                    <span className="text-xs text-muted leading-tight mt-0.5 capitalize truncate">
                      {userRole} Account
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.aside>

{/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden relative pb-16 md:pb-0">
        
        {currentView === 'dashboard' ? (
          <>
            {/* TOP HEADER */}
            <header className="pt-6 pb-4 px-4 md:px-10 shrink-0 z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-white text-primary flex items-center justify-center font-bold text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_10px_rgba(0,0,0,0.05)] border border-border overflow-hidden">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    userRole === 'admin' ? 'A' : (userEmail ? userEmail.charAt(0).toUpperCase() : '')
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-0.5">Welcome back,</p>
                  <h2 className="text-lg md:text-xl font-bold text-fg tracking-tight leading-none">{userRole === 'admin' ? 'Admin' : (userEmail ? userEmail.split('@')[0] : '')}</h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {userRole === 'admin' && (
                  <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-white border border-slate-200/50 flex items-center justify-center text-muted hover:text-accentRedFg hover:bg-accentRed/5 transition-colors shadow-[0_4px_14px_-6px_rgba(0,0,0,0.08)]" title="Sign Out">
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            </header>

            {/* DASHBOARD ACTION BAR (Controls) */}
            {students.length > 0 && (
              <div className="bg-card/50 border-b border-border px-4 md:px-10 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 z-10">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  {userRole === 'admin' || userRole === 'volunteer' ? (
                    <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                      <select 
                        value={selectedStudent} 
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        className="appearance-none w-full bg-white border border-border hover:border-borderHover rounded-xl pl-4 pr-10 py-2.5 sm:py-2 text-sm font-medium text-fg focus:outline-none focus:border-primary transition-colors cursor-pointer shadow-sm"
                      >
                        <option value="" disabled>Select Student</option>
                        {students.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                    </div>
                  ) : (
                    <div className="bg-white border border-border rounded-xl px-4 py-2.5 sm:py-2 text-sm font-bold text-primary w-full sm:w-auto sm:min-w-[200px] text-center shadow-sm">
                      {userName || selectedStudent}
                    </div>
                  )}

                  {/* Report Type */}
                  <div className="flex bg-white border border-border rounded-xl p-1 shadow-sm w-full sm:w-auto">
                    {REPORT_TYPES.map(type => (
                      <button
                        key={type.id}
                        onClick={() => setReportType(type.id)}
                        className={cn(
                          "flex-1 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap",
                          reportType === type.id ? "bg-primary text-white shadow-sm" : "text-muted hover:text-fg"
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Download Button */}
                <button
                  onClick={handleGenerate}
                  disabled={!selectedStudent || isGenerating}
                  className="w-full sm:w-auto bg-white border border-border hover:bg-canvas disabled:opacity-50 text-fg px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-primary" />}
                  Export PDF
                </button>
              </div>
            )}

        {/* SCROLLABLE DASHBOARD CONTENT */}
        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-7xl mx-auto flex flex-col min-h-full">
            
            {!selectedStudent ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-70">
                <div className="w-20 h-20 bg-card border border-border rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                  <LayoutDashboard className="w-10 h-10 text-muted" />
                </div>
                <h2 className="text-2xl font-bold text-fg mb-3">No Data Active</h2>
                <p className="text-muted text-sm leading-relaxed">
                  {userRole === 'admin' ? (
                    "Upload an Excel tracker using the button in the bottom left, then select a student from the top menu to view analytics."
                  ) : userRole === 'volunteer' ? (
                    "Select a student from the top menu to view analytics."
                  ) : (
                    "Please wait for the admin to upload the performance data or select your name if available."
                  )}
                </p>
              </div>
            ) : !stats ? (
               <div className="flex-1 flex items-center justify-center">
                  <div className="text-muted">No data available for this report type.</div>
               </div>
            ) : (
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
                
                {/* TOP METRICS ROW */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                  {/* Card 1: Active Style */}
                  <motion.div variants={itemVariants} className="col-span-2 xl:col-span-1 bg-primary text-white rounded-3xl p-5 md:p-6 shadow-md relative overflow-hidden flex flex-row items-center justify-between xl:flex-col xl:items-start">
                    <div className="relative z-10">
                      <p className="text-white/80 font-medium text-sm mb-1">Total Score</p>
                      <h3 className="text-4xl md:text-5xl font-bold tracking-tight">{stats.total}</h3>
                      {stats.growth !== null && (
                        <div className="mt-2 md:mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">
                          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                          <span>{stats.growth > 0 ? '+' : ''}{stats.growth} since Pre-Test</span>
                        </div>
                      )}
                    </div>
                    {/* Mobile visual circle */}
                    <div className="relative z-10 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 xl:hidden shrink-0 ml-4">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    {/* Decorative bg element */}
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  </motion.div>

                  {/* Card 2: Cohort Rank */}
                  <motion.div variants={itemVariants} className="col-span-1 bg-card border border-border rounded-3xl p-4 md:p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <p className="text-fg font-semibold text-xs md:text-sm truncate mr-2">Cohort Rank</p>
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-accentBlue/50 flex items-center justify-center shrink-0">
                        <Trophy className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1 md:gap-2">
                      <h3 className="text-2xl md:text-4xl font-bold text-fg tracking-tight">#{stats.rank}</h3>
                      <span className="text-muted font-medium text-xs md:text-base">/ {stats.totalStudents}</span>
                    </div>
                  </motion.div>

                  {/* Card 3: Strongest Subject */}
                  <motion.div variants={itemVariants} className="col-span-1 bg-card border border-border rounded-3xl p-4 md:p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <p className="text-fg font-semibold text-xs md:text-sm truncate mr-2">Top Performer</p>
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-accentGreen flex items-center justify-center shrink-0">
                        <Target className="w-3 h-3 md:w-4 md:h-4 text-accentGreenFg" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg md:text-2xl font-bold text-fg truncate mb-0.5 md:mb-1">{stats.strongest.name}</h3>
                      <p className="text-muted font-medium text-xs md:text-sm">{stats.strongest.score} pts</p>
                    </div>
                  </motion.div>

                  {/* Card 4: Primary Weakness */}
                  <motion.div variants={itemVariants} className="col-span-2 xl:col-span-1 bg-card border border-border rounded-3xl p-4 md:p-6 shadow-sm flex items-center xl:items-start xl:flex-col justify-between">
                    <div className="flex xl:w-full items-center justify-between xl:mb-4 gap-3 xl:gap-0">
                      <div className="w-12 h-12 xl:w-8 xl:h-8 rounded-full bg-accentRed flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 xl:w-4 xl:h-4 text-accentRedFg" />
                      </div>
                      <p className="text-fg font-semibold text-sm hidden xl:block">Priority Focus</p>
                    </div>
                    <div className="flex-1 ml-4 xl:ml-0 text-left">
                      <p className="text-fg font-semibold text-xs mb-1 block xl:hidden text-muted">Priority Focus</p>
                      <h3 className="text-xl md:text-2xl font-bold text-fg truncate mb-0.5 md:mb-1">{stats.weaknesses[0]?.name || 'N/A'}</h3>
                      <p className="text-muted font-medium text-xs md:text-sm">{stats.weaknesses[0]?.score || 0} pts</p>
                    </div>
                  </motion.div>
                </div>

                {/* MIDDLE CHARTS ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bar Chart */}
                  <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-6 shadow-sm h-[380px] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-base font-bold text-fg">
                        {stats.preVsPostData ? 'Pre-Test vs Post-Test Growth' : 'Performance vs Cohort Average'}
                      </h3>
                      <span className="text-xs font-medium text-muted bg-canvas px-3 py-1 rounded-full">Score</span>
                    </div>
                    <div className="flex-1">
                      {stats.preVsPostData ? (
                         <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.preVsPostData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F4F3ED' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#111827', paddingTop: '10px' }} />
                            <Bar dataKey="pre" name="Pre-Test" fill="#D1D5DB" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="post" name="Post-Test" fill="#123524" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.vsCohortData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F4F3ED' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#111827', paddingTop: '10px' }} />
                            <Bar dataKey="cohort" name="Cohort Average" fill="#D1D5DB" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="student" name={selectedStudent} fill="#123524" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </motion.div>

                  {/* Radar Chart */}
                  <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-6 shadow-sm h-[380px] flex flex-col">
                    <h3 className="text-base font-bold text-fg mb-2">Mastery Profile</h3>
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.radarData}>
                          <PolarGrid stroke="#E5E7EB" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} />
                          <Radar name={selectedStudent} dataKey="score" stroke="#123524" strokeWidth={2} fill="#123524" fillOpacity={0.15} />
                          <Tooltip content={<CustomTooltip />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </div>

                {/* BOTTOM SECTION: SUBJECT RANKINGS TABLE */}
                <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-white">
                    <h3 className="text-base font-bold text-fg">Subject Performance Breakdown</h3>
                    <span className="text-xs font-medium text-muted">Sorted by Score</span>
                  </div>
                  <div className="w-full">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-canvas/50">
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Subject</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Student Score</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Cohort Avg</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Gap</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                          {stats.subjectRankings.map((subj, idx) => (
                            <tr key={subj.name} className="hover:bg-canvas/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-muted w-4">{idx + 1}</span>
                                  <span className="font-semibold text-fg">{subj.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 font-bold text-fg">{subj.score}</td>
                              <td className="px-6 py-4 font-medium text-muted">{subj.cohortAvg}</td>
                              <td className="px-6 py-4">
                                <span className={cn("font-bold", subj.diff >= 0 ? "text-accentGreenFg" : "text-accentRedFg")}>
                                  {subj.diff >= 0 ? `+${subj.diff}` : subj.diff}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {subj.diff >= 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-accentGreen text-accentGreenFg">
                                    <TrendingUp className="w-3 h-3" /> Above Avg
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-accentRed text-accentRedFg">
                                    <AlertTriangle className="w-3 h-3" /> Needs Work
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="block md:hidden divide-y divide-border bg-white">
                      {stats.subjectRankings.map((subj, idx) => (
                        <div key={subj.name} className="p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-canvas flex items-center justify-center text-xs font-bold text-muted">{idx + 1}</span>
                              <span className="font-bold text-fg text-sm">{subj.name}</span>
                            </div>
                            {subj.diff >= 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-accentGreen text-accentGreenFg uppercase tracking-wider">
                                <TrendingUp className="w-3 h-3" /> Above
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-accentRed text-accentRedFg uppercase tracking-wider">
                                <AlertTriangle className="w-3 h-3" /> Below
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 bg-canvas/30 rounded-lg p-2.5 text-center">
                            <div>
                              <p className="text-[10px] text-muted font-semibold uppercase mb-0.5">Score</p>
                              <p className="font-bold text-fg text-sm">{subj.score}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted font-semibold uppercase mb-0.5">Avg</p>
                              <p className="font-medium text-muted text-sm">{subj.cohortAvg}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted font-semibold uppercase mb-0.5">Gap</p>
                              <p className={cn("font-bold text-sm", subj.diff >= 0 ? "text-accentGreenFg" : "text-accentRedFg")}>
                                {subj.diff >= 0 ? `+${subj.diff}` : subj.diff}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

              </motion.div>
            )}
          </div>
        </div>
          </>
        ) : currentView === 'calendar' ? (
          <CalendarView userRole={userRole} />
        ) : currentView === 'scholarships' ? (
          <ScholarshipsView userRole={userRole} />
        ) : currentView === 'settings' ? (
          <SettingsView 
            userEmail={userEmail} 
            userRole={userRole} 
            onUpdateUser={(user) => { 
              setProfilePicture(user.profilePicture || null); 
              localStorage.setItem('shore_user', JSON.stringify(user)); 
            }} 
          />
        ) : currentView === 'accounts' && userRole === 'admin' ? (
          <AccountsView />
        ) : currentView === 'manageclass' && userRole === 'admin' ? (
          <ManageClassView />
        ) : currentView === 'manageteam' && userRole === 'admin' ? (
          <ManageTeamView />
        ) : currentView === 'attendance' ? (
          userRole === 'admin' ? <AttendanceAdminView /> : <AttendanceStudentView userEmail={userEmail} userName={userName} />
        ) : currentView === 'announcements' ? (
          <AnnouncementsView userEmail={userEmail} userName={userName} userRole={userRole} profilePicture={profilePicture} onRead={fetchUnreadCounts} />
        ) : currentView === 'leaderboard' ? (
          <LeaderboardView />
        ) : currentView === 'recitations' ? (
          <RecitationsAdminView />
        ) : currentView === 'scholarships' ? (
          <ScholarshipsView />
        ) : (
          <ReportsView parsedData={parsedData} students={students} />
        )}
      </main>

      {/* MOBILE MENU ACTION SHEET */}
      <AnimatePresence>
        {isMenuSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuSheetOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[70] md:hidden flex flex-col max-h-[85vh] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            >
              <div className="flex-1 overflow-y-auto p-6 pb-8">
                 <div className="flex items-center gap-4 bg-white border border-border p-4 rounded-2xl shadow-sm mb-6">
                    <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
                       {profilePicture ? <img src={profilePicture} className="w-full h-full object-cover rounded-full" /> : (userRole === 'admin' ? 'A' : userEmail.charAt(0).toUpperCase())}
                    </div>
                    <div className="flex-1 min-w-0">
                       <h2 className="text-lg font-bold text-fg tracking-tight truncate">{userRole === 'admin' ? 'Admin' : userEmail.split('@')[0]}</h2>
                       <p className="text-sm text-muted capitalize truncate">{userRole} Account</p>
                    </div>
                 </div>
                 
                 <div>
                    <h3 className="text-[11px] font-bold text-muted uppercase tracking-widest mb-4 px-2">Classroom Tools</h3>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                       {[
                          { id: 'attendance',   icon: ClipboardCheck,  label: 'Attendance',    show: true },
                          { id: 'leaderboard',  icon: Star,            label: 'Leaderboard',   show: true },
                          { id: 'recitations',  icon: Target,          label: 'Recitations',   show: userRole === 'admin' },
                          { id: 'scholarships', icon: Award,           label: 'Scholarships',  show: true },
                          { id: 'reports',      icon: FileText,        label: 'Reports',       show: userRole === 'admin' },
                          { id: 'manageclass',  icon: GraduationCap,   label: 'Class',  show: userRole === 'admin' },
                          { id: 'manageteam',   icon: Shield,          label: 'Team',   show: userRole === 'admin' },
                          { id: 'accounts',     icon: Users,           label: 'Accounts',      show: userRole === 'admin' },
                       ].filter(i => i.show).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setCurrentView(item.id);
                              setIsMenuSheetOpen(false);
                            }}
                            className="bg-canvas border border-border rounded-2xl p-3 flex flex-col items-center justify-center gap-2 shadow-sm text-fg active:scale-[0.98] transition-transform"
                          >
                             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] mb-1">
                                <item.icon className="w-5 h-5" />
                             </div>
                             <span className="text-[10px] font-semibold">{item.label}</span>
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <button
                      onClick={() => {
                        setCurrentView('settings');
                        setIsMenuSheetOpen(false);
                      }}
                      className="w-full bg-canvas border border-border rounded-xl p-4 flex items-center justify-between text-fg active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-muted" />
                        <span className="font-semibold text-sm">Manage Account</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuSheetOpen(false);
                      }}
                      className="w-full bg-accentRed/5 border border-accentRed/10 rounded-xl p-4 flex items-center justify-between text-accentRedFg active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-center gap-3">
                        <LogOut className="w-5 h-5" />
                        <span className="font-semibold text-sm">Sign Out</span>
                      </div>
                    </button>
                 </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
        <div className="h-16 bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl flex items-center justify-around px-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative z-40">
        {[
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'announcements', icon: Megaphone, badge: unreadAnnouncements },
          { id: 'calendar', icon: Calendar },
          { id: 'menu', icon: Menu }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'menu') {
                setIsMenuSheetOpen(true);
              } else {
                setCurrentView(item.id);
                setIsMenuSheetOpen(false);
              }
            }}
            className={cn(
              "flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all relative z-10",
              (currentView === item.id && item.id !== 'menu')
                ? "text-primary scale-110"
                : "text-muted hover:text-fg hover:bg-black/5",
              item.id === 'menu' && isMenuSheetOpen ? "text-primary scale-110" : ""
            )}
          >
            {/* Active Background Pill */}
            {((currentView === item.id && item.id !== 'menu') || (item.id === 'menu' && isMenuSheetOpen)) && (
              <motion.div
                layoutId="bottomNavBg"
                className="absolute inset-0 bg-primary/10 rounded-xl z-[-1]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <div className="relative">
              <item.icon className="w-6 h-6" />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-accentRed text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                  {item.badge}
                </span>
              )}
            </div>
          </button>
        ))}
        </div>
      </div>

    </motion.div>
      )}
    </AnimatePresence>
  );
}
