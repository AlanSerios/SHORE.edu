import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, CheckCircle2, Clock, ChevronDown, Activity, ScanLine, CameraOff, Trash2,
  TrendingUp, TrendingDown, Minus, BarChart3, Users, ClipboardList,
  Download, Search, Filter
} from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';
import jsQR from 'jsqr';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const EVENTS = [
  "Onboarding",
  "Session 1", "Session 2", "Session 3", "Session 4",
  "Session 5", "Session 6", "Session 7", "Session 8",
  "Graduation"
];

const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const StatusBadge = ({ status }) => {
  const styles = {
    'Full Day':       'bg-green-500/10 text-green-700',
    'Morning Only':   'bg-blue-500/10 text-blue-700',
    'Afternoon Only': 'bg-orange-500/10 text-orange-700',
    'No Record':      'bg-gray-100 text-gray-400',
  };
  return (
    <span className={cn('px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap', styles[status] || styles['No Record'])}>
      {status}
    </span>
  );
};

const RoleBadge = ({ role }) => {
  const styles = {
    'Student':   'bg-primary/10 text-primary',
    'Volunteer': 'bg-purple-500/10 text-purple-700',
    'Admin':     'bg-gray-200 text-gray-600',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap', styles[role] || styles['Student'])}>
      {role}
    </span>
  );
};

const AttendanceAdminView = () => {
  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('Onboarding');
  const [selectedSession, setSelectedSession] = useState('Morning');
  const [selectedType, setSelectedType] = useState('Time In');
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [activeTab, setActiveTab] = useState('scanner');
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const processingRef = useRef(false);
  const selectedEventRef = useRef(selectedEvent);
  const selectedSessionRef = useRef(selectedSession);
  const selectedTypeRef = useRef(selectedType);
  const handleScanSuccessRef = useRef(null);

  useEffect(() => { selectedEventRef.current = selectedEvent; }, [selectedEvent]);
  useEffect(() => { selectedSessionRef.current = selectedSession; }, [selectedSession]);
  useEffect(() => { selectedTypeRef.current = selectedType; }, [selectedType]);

  const fetchAll = () => {
    Promise.all([
      fetch('/api/attendance').then(r => r.json()),
      fetch('/api/users').then(r => r.json())
    ]).then(([attData, usrData]) => {
      setAttendance((attData.attendance || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      setUsers(usrData.users || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const getUserInfo = useCallback((email) => {
    const u = users.find(u => u.email === email);
    const roleMap = { admin: 'Admin', volunteer: 'Volunteer', student: 'Student' };
    return {
      role: roleMap[u?.role] || 'Student',
      name: u?.name || email.split('@')[0]
    };
  }, [users]);

  // ── TRACKER DATA ──────────────────────────────────────────
  const trackerData = useMemo(() => {
    const byEmail = {};
    attendance.filter(l => l.event === selectedEvent).forEach(log => {
      if (!byEmail[log.email]) {
        const { role, name } = getUserInfo(log.email);
        byEmail[log.email] = {
          email: log.email, name, role,
          morning_in: null, morning_out: null,
          afternoon_in: null, afternoon_out: null,
          logIds: []
        };
      }
      const entry = byEmail[log.email];
      if (log.id) entry.logIds.push(log.id);
      const sess = log.session || 'Morning';
      if (sess === 'Morning') {
        if (log.type === 'Time In' && !entry.morning_in) entry.morning_in = log.timestamp;
        if (log.type === 'Time Out' && !entry.morning_out) entry.morning_out = log.timestamp;
      } else {
        if (log.type === 'Time In' && !entry.afternoon_in) entry.afternoon_in = log.timestamp;
        if (log.type === 'Time Out' && !entry.afternoon_out) entry.afternoon_out = log.timestamp;
      }
    });
    return Object.values(byEmail).map(e => ({
      ...e,
      status: (e.morning_in && e.afternoon_in) ? 'Full Day'
            : e.morning_in   ? 'Morning Only'
            : e.afternoon_in ? 'Afternoon Only' : 'No Record'
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [attendance, selectedEvent, getUserInfo]);

  const filteredTrackerData = useMemo(() => {
    return trackerData.filter(row => {
      const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            row.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "All" || row.role === roleFilter;
      const matchesStatus = statusFilter === "All" || row.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [trackerData, searchTerm, roleFilter, statusFilter]);

  // ── GENERAL REPORT DATA ──────────────────────────────────
  const generalData = useMemo(() => {
    const happenedEvents = [...new Set(attendance.map(l => l.event))];
    return [...new Set(attendance.map(l => l.email))].map(email => {
      const { role, name } = getUserInfo(email);
      const attended = happenedEvents.filter(ev =>
        attendance.some(l => l.email === email && l.event === ev && l.type === 'Time In')
      ).length;
      const absent = happenedEvents.length - attended;
      const rate = happenedEvents.length > 0 ? Math.round(attended / happenedEvents.length * 100) : 0;
      return { email, name, role, attended, absent, total: happenedEvents.length, rate };
    }).sort((a, b) => b.rate - a.rate);
  }, [attendance, getUserInfo]);

  // ── STATISTICS DATA ──────────────────────────────────────
  const statsData = useMemo(() => {
    const happened = EVENTS.filter(ev => attendance.some(l => l.event === ev));
    return happened.map((ev, idx) => {
      const logs = attendance.filter(l => l.event === ev);
      const uniq     = new Set(logs.filter(l => l.type === 'Time In').map(l => l.email));
      const morn     = new Set(logs.filter(l => (l.session || 'Morning') === 'Morning' && l.type === 'Time In').map(l => l.email));
      const aftn     = new Set(logs.filter(l => l.session === 'Afternoon' && l.type === 'Time In').map(l => l.email));
      const fullDay  = [...morn].filter(e => aftn.has(e)).length;
      let trend = null;
      if (idx > 0) {
        const prev = new Set(attendance.filter(l => l.event === happened[idx - 1] && l.type === 'Time In').map(l => l.email)).size;
        trend = uniq.size > prev ? 'up' : uniq.size < prev ? 'down' : 'same';
      }
      return { event: ev, attendees: uniq.size, morning: morn.size, afternoon: aftn.size, fullDay, trend };
    });
  }, [attendance]);

  const downloadCSV = () => {
    if (filteredTrackerData.length === 0) {
      toast.error("No data to download");
      return;
    }
    const headers = ["Name,Email,Role,Morning In,Morning Out,Afternoon In,Afternoon Out,Status"];
    const rows = filteredTrackerData.map(r => 
      `"${r.name}","${r.email}","${r.role}","${fmtTime(r.morning_in)}","${fmtTime(r.morning_out)}","${fmtTime(r.afternoon_in)}","${fmtTime(r.afternoon_out)}","${r.status}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedEvent}_Attendance.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── CAMERA LOGIC ──────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch (err) {
      const msg = err.name === 'NotAllowedError' ? "Camera access denied. Please allow permissions."
                : err.name === 'NotFoundError'    ? "No camera found on your device."
                : "Could not start the camera. Please try again.";
      setCameraError(msg);
      setIsScannerActive(false);
    }
  }, []);

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
    if (code && !processingRef.current) {
      processingRef.current = true;
      handleScanSuccessRef.current(
        code.data,
        selectedEventRef.current,
        selectedSessionRef.current,
        selectedTypeRef.current
      ).finally(() => {
        setTimeout(() => { processingRef.current = false; }, 2500);
      });
    }
    animFrameRef.current = requestAnimationFrame(scanLoop);
  }, []);

  useEffect(() => {
    if (isScannerActive && activeTab === 'scanner') {
      startCamera().then(() => {
        const check = () => {
          if (videoRef.current?.readyState >= 2) animFrameRef.current = requestAnimationFrame(scanLoop);
          else setTimeout(check, 100);
        };
        check();
      });
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isScannerActive, activeTab]);

  const handleScanSuccess = async (email, event, session, type) => {
    if (!email?.includes('@')) { toast.error(`Invalid QR: ${email}`); return; }
    const payload = { email, event, session, type, timestamp: new Date().toISOString() };
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-sm">Attendance Logged ✓</span>
            <span className="text-xs opacity-80">{session} · {type} · {email.split('@')[0]}</span>
          </div>
        );
        fetchAll();
      } else {
        toast.error(data.error || "Failed to record.");
      }
    } catch { toast.error("Network error."); }
  };

  handleScanSuccessRef.current = handleScanSuccess;

  const handleDelete = async (logId) => {
    if (!logId) { toast.error("Cannot delete: missing ID."); return; }
    try {
      const res = await fetch(`/api/attendance/${logId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { toast.success("Record deleted."); fetchAll(); }
      else toast.error(data.error || "Failed to delete.");
    } catch (err) { toast.error("Error deleting."); }
  };

  const handleDeleteAll = async (logIds) => {
    if (!logIds || logIds.length === 0) return;
    if (!window.confirm(`Delete ${logIds.length} records?`)) return;
    try {
      for (const logId of logIds) {
        await fetch(`/api/attendance/${logId}`, { method: 'DELETE' });
      }
      toast.success("Records deleted.");
      fetchAll();
    } catch (err) { toast.error("Error deleting multiple records."); }
  };

  const TABS = [
    { id: 'scanner', label: 'Live Scanner',   icon: ScanLine     },
    { id: 'sheet',   label: 'Session Sheet',  icon: ClipboardList },
    { id: 'general', label: 'General Report', icon: Users        },
    { id: 'stats',   label: 'Statistics',     icon: BarChart3    },
  ];

  const showControls = activeTab === 'scanner' || activeTab === 'sheet';

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto pb-32 px-4 sm:px-6 space-y-8">

        {/* HEADER */}
        <div className="pt-12 pb-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-canvas border border-border/50 text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
            Administration Mode
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-fg mb-2">Event Attendance</h1>
          <p className="text-sm text-muted max-w-lg mx-auto">Track, review, and analyze attendance across all sessions and events.</p>
        </div>

        {/* CONTROLS */}
        {showControls && (
          <div className="bg-white rounded-2xl border border-border/60 p-4 shadow-sm flex flex-wrap gap-4">
            {/* Event */}
            <div className="relative flex-1 min-w-[160px]">
              <div className="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold tracking-wider text-muted uppercase">Event</div>
              <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}
                className="w-full appearance-none bg-canvas/30 border border-border/60 hover:border-border rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-fg focus:outline-none focus:border-primary transition-all cursor-pointer">
                {EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
            {/* Session */}
            <div className="relative flex-1 min-w-[140px]">
              <div className="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold tracking-wider text-muted uppercase">Session</div>
              <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}
                className="w-full appearance-none bg-canvas/30 border border-border/60 hover:border-border rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-fg focus:outline-none focus:border-primary transition-all cursor-pointer">
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
            {/* Action */}
            <div className="relative flex-1 min-w-[140px]">
              <div className="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold tracking-wider text-muted uppercase">Action</div>
              <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
                className="w-full appearance-none bg-canvas/30 border border-border/60 hover:border-border rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-fg focus:outline-none focus:border-primary transition-all cursor-pointer">
                <option value="Time In">Time In</option>
                <option value="Time Out">Time Out</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
          </div>
        )}

        {/* TAB BAR */}
        <div className="flex gap-1 p-1.5 bg-canvas border border-border/50 rounded-full w-fit mx-auto shadow-sm flex-wrap justify-center">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={cn("relative flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-colors duration-200",
                activeTab === id ? "text-fg" : "text-muted hover:text-fg/80")}>
              {activeTab === id && (
                <motion.div layoutId="adminTabPill"
                  className="absolute inset-0 bg-white rounded-full shadow-sm border border-black/5"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{ zIndex: -1 }} />
              )}
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <AnimatePresence mode="wait">

          {/* ══════════════ SCANNER TAB ══════════════ */}
          {activeTab === 'scanner' && (
            <motion.div key="scanner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              <div className="bg-canvas p-2.5 rounded-[2rem] border border-border/50 shadow-xl mx-auto max-w-2xl">
                <div className="bg-white rounded-[1.75rem] p-8 min-h-[400px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-fg flex items-center gap-2">
                      <ScanLine className="w-5 h-5 text-primary" /> Viewfinder
                    </h3>
                    {isScannerActive && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-500/10 px-3 py-1.5 rounded-full uppercase tracking-wider">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Live
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center">
                    {cameraError ? (
                      <div className="text-center flex flex-col items-center gap-4">
                        <CameraOff className="w-12 h-12 text-muted opacity-50" />
                        <p className="text-sm text-muted max-w-xs">{cameraError}</p>
                        <button onClick={() => { setCameraError(null); setIsScannerActive(true); }}
                          className="px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-full hover:bg-primary/90 transition-colors">
                          Try Again
                        </button>
                      </div>
                    ) : !isScannerActive ? (
                      <div className="flex flex-col items-center gap-6">
                        <button onClick={() => setIsScannerActive(true)}
                          className="group w-36 h-36 rounded-[2rem] bg-canvas border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-black/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Camera className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-sm font-bold text-fg group-hover:text-primary transition-colors">Start Scanner</span>
                        </button>
                        <p className="text-[11px] text-muted uppercase tracking-widest font-bold">Requires Camera Permission</p>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center gap-5">
                        <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border-2 border-black/10 shadow-2xl relative">
                          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover block scale-x-[-1]" />
                          <canvas ref={canvasRef} className="hidden" />
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/60 shadow-[0_0_12px_4px_rgba(59,130,246,0.4)] animate-[scan_2s_ease-in-out_infinite]" />
                        </div>
                          <div className="text-center space-y-1">
                            <p className="text-xs text-muted font-medium">
                              <span className="font-bold text-fg">{selectedEvent}</span> • <span className="font-bold text-fg">{selectedSession}</span> • <span className="font-bold text-fg">{selectedType}</span>
                            </p>
                            <p className="text-sm font-bold text-fg">
                              Position the QR code within the frame to scan automatically.
                            </p>
                          </div>
                        <button onClick={() => setIsScannerActive(false)}
                          className="px-8 py-3 bg-canvas hover:bg-border/50 text-fg text-sm font-bold rounded-full transition-colors">
                          Deactivate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════════ SESSION SHEET TAB ══════════════ */}
          {activeTab === 'sheet' && (
            <motion.div key="sheet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white">
                  <div>
                    <h3 className="font-bold text-lg text-fg mb-1">
                      {selectedEvent} Attendance
                    </h3>
                    <p className="text-sm text-muted">Total Records: {filteredTrackerData.length}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative bg-canvas border border-border rounded-lg px-3 py-2 flex items-center hover:border-borderHover transition-colors">
                      <Search className="w-4 h-4 text-muted mr-2" />
                      <input 
                        type="text" 
                        placeholder="Search name or email..." 
                        className="bg-transparent border-none outline-none text-sm text-fg placeholder-muted w-32 md:w-48"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <div className="relative">
                      <select 
                        value={roleFilter} 
                        onChange={e => setRoleFilter(e.target.value)}
                        className="appearance-none bg-canvas border border-border hover:border-borderHover rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-fg focus:outline-none focus:border-primary transition-colors cursor-pointer"
                      >
                        <option value="All">All Roles</option>
                        <option value="Student">Student</option>
                        <option value="Volunteer">Volunteer</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                    </div>

                    <div className="relative">
                      <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value)}
                        className="appearance-none bg-canvas border border-border hover:border-borderHover rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-fg focus:outline-none focus:border-primary transition-colors cursor-pointer"
                      >
                        <option value="All">All Status</option>
                        <option value="Full Day">Full Day</option>
                        <option value="Morning Only">Morning</option>
                        <option value="Afternoon Only">Afternoon</option>
                        <option value="No Record">No Record</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                    </div>

                    <button 
                      onClick={downloadCSV}
                      className="flex items-center gap-2 bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" /> Export CSV
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="p-16 text-center text-muted text-sm font-medium flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/> Loading data...
                  </div>
                ) : filteredTrackerData.length === 0 ? (
                  <div className="p-16 text-center border-t border-border bg-canvas/30">
                    <ClipboardList className="w-12 h-12 text-muted/50 mx-auto mb-3" />
                    <p className="text-fg font-semibold">No matching records found.</p>
                    <p className="text-sm text-muted mt-1">Try adjusting your filters or search term.</p>
                  </div>
                ) : (
                  <div className="w-full">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-canvas/50">
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Name / Email</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Morning In</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Morning Out</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Afternoon In</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Afternoon Out</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Status</th>
                            <th className="px-4 py-4 w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                          {filteredTrackerData.map(row => (
                            <tr key={row.email} className="hover:bg-canvas/30 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="text-sm font-semibold text-fg">{row.name}</div>
                                <div className="text-xs text-muted mt-0.5">{row.email}</div>
                              </td>
                              <td className="px-6 py-4">
                                <RoleBadge role={row.role} />
                              </td>
                              <td className="px-6 py-4 text-center text-sm font-medium text-fg">
                                {fmtTime(row.morning_in)}
                              </td>
                              <td className="px-6 py-4 text-center text-sm font-medium text-fg">
                                {fmtTime(row.morning_out)}
                              </td>
                              <td className="px-6 py-4 text-center text-sm font-medium text-fg">
                                {fmtTime(row.afternoon_in)}
                              </td>
                              <td className="px-6 py-4 text-center text-sm font-medium text-fg">
                                {fmtTime(row.afternoon_out)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                                  <button onClick={() => handleDeleteAll(row.logIds)}
                                    className="p-1.5 text-muted hover:text-accentRedFg hover:bg-accentRed/10 rounded-md transition-colors"
                                    title="Delete Record">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="block md:hidden divide-y divide-border bg-white">
                      {filteredTrackerData.map(row => (
                        <div key={row.email} className="p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-bold text-fg">{row.name}</div>
                              <div className="text-xs text-muted">{row.email}</div>
                            </div>
                            <RoleBadge role={row.role} />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 bg-canvas/30 p-2.5 rounded-lg">
                            <div className="text-center">
                              <p className="text-[10px] uppercase font-bold text-muted mb-0.5">Morning</p>
                              <p className="text-xs font-semibold text-fg">{fmtTime(row.morning_in)} - {fmtTime(row.morning_out)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] uppercase font-bold text-muted mb-0.5">Afternoon</p>
                              <p className="text-xs font-semibold text-fg">{fmtTime(row.afternoon_in)} - {fmtTime(row.afternoon_out)}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-1">
                            <StatusBadge status={row.status} />
                            <div className="flex gap-2">
                              {row.logIds.map(id => (
                                <button key={id} onClick={() => handleDelete(id)}
                                  className="p-1.5 bg-accentRed/10 text-accentRedFg hover:bg-accentRed/20 rounded-md transition-colors"
                                  title="Delete Record">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ══════════════ GENERAL REPORT TAB ══════════════ */}
          {activeTab === 'general' && (
            <motion.div key="general" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border bg-white flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-fg mb-1">
                      General Attendance Report
                    </h3>
                    <p className="text-sm text-muted">Summary across all events.</p>
                  </div>
                </div>
                {loading ? (
                  <div className="p-16 text-center text-muted text-sm font-medium flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/> Loading data...
                  </div>
                ) : generalData.length === 0 ? (
                  <div className="p-16 text-center border-t border-border bg-canvas/30">
                    <ClipboardList className="w-12 h-12 text-muted/50 mx-auto mb-3" />
                    <p className="text-fg font-semibold">No general data available.</p>
                  </div>
                ) : (
                  <div className="w-full">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-canvas/50">
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Name / Email</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Attended</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Absent</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Total Events</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider min-w-[180px]">Attendance Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                          {generalData.map(row => (
                            <tr key={row.email} className="hover:bg-canvas/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="text-sm font-semibold text-fg">{row.name}</div>
                                <div className="text-xs text-muted mt-0.5">{row.email}</div>
                              </td>
                              <td className="px-6 py-4">
                                <RoleBadge role={row.role} />
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-semibold text-fg">{row.attended}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={cn("font-semibold", row.absent > 0 ? "text-accentRedFg" : "text-muted")}>{row.absent}</span>
                              </td>
                              <td className="px-6 py-4 text-center font-medium text-muted">{row.total}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2 bg-canvas rounded-full overflow-hidden">
                                    <div
                                      className={cn("h-full rounded-full transition-all", row.rate >= 80 ? "bg-accentGreen" : row.rate >= 50 ? "bg-orange-400" : "bg-accentRed")}
                                      style={{ width: `${row.rate}%` }}
                                    />
                                  </div>
                                  <span className="font-bold text-xs text-fg w-9 text-right">{row.rate}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="block md:hidden divide-y divide-border bg-white">
                      {generalData.map(row => (
                        <div key={row.email} className="p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-bold text-fg">{row.name}</div>
                              <div className="text-xs text-muted">{row.email}</div>
                            </div>
                            <RoleBadge role={row.role} />
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 bg-canvas/30 p-2.5 rounded-lg text-center">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted mb-0.5">Attended</p>
                              <p className="text-sm font-bold text-fg">{row.attended}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted mb-0.5">Absent</p>
                              <p className={cn("text-sm font-bold", row.absent > 0 ? "text-accentRedFg" : "text-muted")}>{row.absent}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted mb-0.5">Total</p>
                              <p className="text-sm font-bold text-muted">{row.total}</p>
                            </div>
                          </div>

                          <div className="mt-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold uppercase text-muted">Attendance Rate</span>
                              <span className="text-xs font-bold text-fg">{row.rate}%</span>
                            </div>
                            <div className="w-full h-2 bg-canvas rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all", row.rate >= 80 ? "bg-accentGreen" : row.rate >= 50 ? "bg-orange-400" : "bg-accentRed")}
                                style={{ width: `${row.rate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ══════════════ STATISTICS TAB ══════════════ */}
          {activeTab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="space-y-6">

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Events',  value: statsData.length,                                                                   color: 'text-fg' },
                  { label: 'Unique Attendees', value: new Set(attendance.filter(l => l.type === 'Time In').map(l => l.email)).size,       color: 'text-fg' },
                  { label: 'Total Logs',value: attendance.length,                                                                color: 'text-fg' },
                  { label: 'Avg Attendees',  value: statsData.length > 0 ? Math.round(statsData.reduce((s, e) => s + e.attendees, 0) / statsData.length) : 0, color: 'text-primary' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-card border border-border p-5 rounded-2xl shadow-sm">
                    <p className={cn("text-3xl font-black tracking-tight", color)}>{value}</p>
                    <p className="text-sm font-medium text-muted mt-1">{label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border bg-white flex flex-col gap-8">
                  <div>
                    <h3 className="font-bold text-lg text-fg mb-1">
                      Event Breakdown
                    </h3>
                    <p className="text-sm text-muted">Attendance trends by session.</p>
                  </div>

                  {statsData.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-2">
                      <div className="h-72 w-full pr-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={statsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis dataKey="event" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 500 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 500 }} dx={-10} />
                            <Tooltip 
                              cursor={{ fill: '#F8FAFC' }} 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: '1px solid #E2E8F0', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(8px)',
                                padding: '12px 16px',
                                fontWeight: 600
                              }} 
                              itemStyle={{ color: '#0F172A', fontWeight: 700 }}
                            />
                            <Bar dataKey="attendees" name="Total Attendees" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="h-72 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statsData}
                              dataKey="attendees"
                              nameKey="event"
                              cx="40%"
                              cy="50%"
                              innerRadius={65}
                              outerRadius={95}
                              paddingAngle={4}
                              stroke="none"
                            >
                              {statsData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#84cc16', '#14b8a6', '#6366f1'][index % 10]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: '1px solid #E2E8F0', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)',
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(8px)',
                                padding: '12px 16px',
                                fontWeight: 600
                              }} 
                              itemStyle={{ color: '#0F172A', fontWeight: 700 }}
                            />
                            <Legend 
                              layout="vertical" 
                              verticalAlign="middle" 
                              align="right"
                              wrapperStyle={{
                                paddingLeft: '20px',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: '#475569'
                              }}
                              iconType="circle"
                              iconSize={10}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
                {statsData.length === 0 ? (
                  <div className="p-16 text-center border-t border-border bg-canvas/30">
                    <Activity className="w-12 h-12 text-muted/50 mx-auto mb-3" />
                    <p className="text-fg font-semibold">No event statistics available.</p>
                  </div>
                ) : (
                  <div className="w-full">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-canvas/50">
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Event Name</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Attendees</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Morning</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Afternoon</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Full Day</th>
                            <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-center">Trend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                          {statsData.map(row => (
                            <tr key={row.event} className="hover:bg-canvas/30 transition-colors">
                              <td className="px-6 py-4 font-bold text-fg text-sm">{row.event}</td>
                              <td className="px-6 py-4 text-center font-bold text-fg">{row.attendees}</td>
                              <td className="px-6 py-4 text-center text-muted font-medium">{row.morning}</td>
                              <td className="px-6 py-4 text-center text-muted font-medium">{row.afternoon}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-bold text-fg">{row.fullDay}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {row.trend === null   ? <span className="text-muted text-xs font-bold px-2 py-1 rounded bg-canvas">INIT</span>
                                : row.trend === 'up'  ? <span className="text-accentGreenFg font-bold text-xs px-2 py-1 rounded bg-accentGreen flex items-center gap-1 justify-center w-fit mx-auto"><TrendingUp className="w-3 h-3"/> UP</span>
                                : row.trend === 'down'? <span className="text-accentRedFg font-bold text-xs px-2 py-1 rounded bg-accentRed flex items-center gap-1 justify-center w-fit mx-auto"><TrendingDown className="w-3 h-3"/> DOWN</span>
                                :                       <span className="text-muted text-xs font-bold px-2 py-1 rounded bg-canvas flex items-center gap-1 justify-center w-fit mx-auto"><Minus className="w-3 h-3"/> STABLE</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="block md:hidden divide-y divide-border bg-white">
                      {statsData.map(row => (
                        <div key={row.event} className="p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-fg text-sm">{row.event}</span>
                            {row.trend === null   ? <span className="text-muted text-[10px] font-bold px-2 py-0.5 rounded bg-canvas uppercase">Init</span>
                            : row.trend === 'up'  ? <span className="text-accentGreenFg font-bold text-[10px] px-2 py-0.5 rounded bg-accentGreen flex items-center gap-1 uppercase"><TrendingUp className="w-3 h-3"/> Up</span>
                            : row.trend === 'down'? <span className="text-accentRedFg font-bold text-[10px] px-2 py-0.5 rounded bg-accentRed flex items-center gap-1 uppercase"><TrendingDown className="w-3 h-3"/> Down</span>
                            :                       <span className="text-muted text-[10px] font-bold px-2 py-0.5 rounded bg-canvas flex items-center gap-1 uppercase"><Minus className="w-3 h-3"/> Stable</span>}
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 bg-canvas/30 p-2.5 rounded-lg text-center">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted mb-0.5">Total</p>
                              <p className="text-sm font-bold text-primary">{row.attendees}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted mb-0.5">Morn</p>
                              <p className="text-sm font-semibold text-muted">{row.morning}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted mb-0.5">Aftn</p>
                              <p className="text-sm font-semibold text-muted">{row.afternoon}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted mb-0.5">Full</p>
                              <p className="text-sm font-semibold text-fg">{row.fullDay}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default AttendanceAdminView;
