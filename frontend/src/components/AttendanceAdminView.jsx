import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, ChevronDown, Activity, ScanLine, CameraOff, Trash2,
  TrendingUp, TrendingDown, Minus, BarChart3, Users, ClipboardList,
  Download, Search, Lightbulb, RefreshCw, AlertCircle
} from 'lucide-react';
import { cn, downloadCsv } from '../utils';
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
  const [loadError, setLoadError] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const cameraReadyTimeoutRef = useRef(null);
  const processingRef = useRef(false);
  const selectedEventRef = useRef(selectedEvent);
  const selectedSessionRef = useRef(selectedSession);
  const selectedTypeRef = useRef(selectedType);
  const handleScanSuccessRef = useRef(null);

  useEffect(() => { selectedEventRef.current = selectedEvent; }, [selectedEvent]);
  useEffect(() => { selectedSessionRef.current = selectedSession; }, [selectedSession]);
  useEffect(() => { selectedTypeRef.current = selectedType; }, [selectedType]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [attendanceResponse, usersResponse] = await Promise.all([
        fetch('/api/attendance'),
        fetch('/api/users'),
      ]);
      if (!attendanceResponse.ok || !usersResponse.ok) throw new Error('Attendance data request failed.');
      const [attData, usrData] = await Promise.all([attendanceResponse.json(), usersResponse.json()]);
      setAttendance((attData.attendance || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      setUsers(usrData.users || []);
    } catch {
      setLoadError('Attendance data could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
      const assignTime = (key, timestamp, keepEarliest) => {
        if (!entry[key]) { entry[key] = timestamp; return; }
        const next = new Date(timestamp).getTime();
        const current = new Date(entry[key]).getTime();
        if ((keepEarliest && next < current) || (!keepEarliest && next > current)) entry[key] = timestamp;
      };
      if (sess === 'Morning') {
        if (log.type === 'Time In') assignTime('morning_in', log.timestamp, true);
        if (log.type === 'Time Out') assignTime('morning_out', log.timestamp, false);
      } else {
        if (log.type === 'Time In') assignTime('afternoon_in', log.timestamp, true);
        if (log.type === 'Time Out') assignTime('afternoon_out', log.timestamp, false);
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
    const header = "Name,Email,Role,Morning In,Morning Out,Afternoon In,Afternoon Out,Status";
    const rows = filteredTrackerData.map(r => 
      `"${r.name}","${r.email}","${r.role}","${fmtTime(r.morning_in)}","${fmtTime(r.morning_out)}","${fmtTime(r.afternoon_in)}","${fmtTime(r.afternoon_out)}","${r.status}"`
    );
    downloadCsv(`${selectedEvent}_Attendance.csv`, rows, header);
  };

  // ── CAMERA LOGIC ──────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (cameraReadyTimeoutRef.current) { clearTimeout(cameraReadyTimeoutRef.current); cameraReadyTimeoutRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      return true;
    } catch (err) {
      const msg = err.name === 'NotAllowedError' ? "Camera access denied. Please allow permissions."
                : err.name === 'NotFoundError'    ? "No camera found on your device."
                : "Could not start the camera. Please try again.";
      setCameraError(msg);
      setIsScannerActive(false);
      stopCamera();
      return false;
    }
  }, [stopCamera]);

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
    let cancelled = false;
    if (isScannerActive && activeTab === 'scanner') {
      startCamera().then(started => {
        if (!started || cancelled) return;
        const check = () => {
          if (cancelled || !streamRef.current) return;
          if (videoRef.current?.readyState >= 2) animFrameRef.current = requestAnimationFrame(scanLoop);
          else cameraReadyTimeoutRef.current = setTimeout(check, 100);
        };
        check();
      });
    } else {
      stopCamera();
    }
    return () => { cancelled = true; stopCamera(); };
  }, [isScannerActive, activeTab, scanLoop, startCamera, stopCamera]);

  const handleScanSuccess = async (email, event, session, type) => {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) { toast.error('Enter a valid email address.'); return false; }
    const payload = { email: normalizedEmail, event, session, type, timestamp: new Date().toISOString() };
    setIsSaving(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-sm">Attendance Logged ✓</span>
            <span className="text-xs opacity-80">{session} · {type} · {normalizedEmail.split('@')[0]}</span>
          </div>
        );
        await fetchAll();
        return true;
      } else {
        toast.error(data.error || "Failed to record.");
        return false;
      }
    } catch { toast.error("Network error."); return false; }
    finally { setIsSaving(false); }
  };

  handleScanSuccessRef.current = handleScanSuccess;

  const handleDeleteAll = async (logIds) => {
    if (!logIds || logIds.length === 0) return;
    if (!window.confirm(`Delete ${logIds.length} records?`)) return;
    try {
      const results = await Promise.all(logIds.map(logId => fetch(`/api/attendance/${logId}`, { method: 'DELETE' })));
      if (results.some(response => !response.ok)) throw new Error('Some records could not be deleted.');
      toast.success("Records deleted.");
      await fetchAll();
    } catch { toast.error("Error deleting multiple records."); }
  };

  const TABS = [
    { id: 'scanner', label: 'Live Scanner',   icon: ScanLine     },
    { id: 'sheet',   label: 'Session Sheet',  icon: ClipboardList },
    { id: 'general', label: 'General Report', icon: Users        },
    { id: 'stats',   label: 'Statistics',     icon: BarChart3    },
  ];

  const generateInsights = useCallback((data) => {
    if (!data || data.length === 0) return "Not enough data to form an insight yet.";
    if (data.length === 1) return `The program has kicked off with ${data[0].attendees} attendees in ${data[0].event}.`;
    
    const first = data[0].attendees;
    const last = data[data.length - 1].attendees;
    const max = Math.max(...data.map(d => d.attendees));
    const maxEvents = data.filter(d => d.attendees === max).map(d => d.event).join(' and ');
    
    let trendText = "";
    if (last > first) {
      trendText = "Overall attendance has shown positive growth compared to the initial session.";
    } else if (last < first) {
      trendText = "We are seeing a slight drop in attendance compared to the initial session. Consider reaching out to absent participants.";
    } else {
      trendText = "Attendance has remained highly stable across all sessions so far.";
    }
  
    return `${trendText} Peak attendance was reached during ${maxEvents} with ${max} participants.`;
  }, []);

  const showControls = activeTab === 'scanner' || activeTab === 'sheet';

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="max-w-7xl mx-auto pb-32 px-4 sm:px-6 lg:px-8 space-y-5">

        {/* HEADER */}
        <header className="pt-6 sm:pt-8 pb-1">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg">Event Attendance</h1>
          <p className="mt-1 text-sm text-muted">Scan attendees, review sessions, and track participation.</p>
        </header>

        {loadError && (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-accentRedFg/20 bg-accentRed px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-accentRedFg">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="font-semibold">{loadError}</span>
            </div>
            <button type="button" onClick={fetchAll} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 font-bold text-fg shadow-sm hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        )}

        {/* CONTROLS */}
        {showControls && (
          <section aria-label="Attendance setup" className="bg-white rounded-2xl border border-border p-3 sm:p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Event */}
            <label className="relative block">
              <span className="mb-1.5 block text-[11px] font-bold tracking-wider text-muted uppercase">Event</span>
              <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}
                className="min-h-11 w-full appearance-none bg-white border border-border hover:border-borderHover rounded-xl pl-3.5 pr-10 text-sm font-bold text-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors cursor-pointer">
                {EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>
              <ChevronDown className="absolute right-3 bottom-3.5 w-4 h-4 text-muted pointer-events-none" />
            </label>
            {/* Session */}
            <label className="relative block">
              <span className="mb-1.5 block text-[11px] font-bold tracking-wider text-muted uppercase">Session</span>
              <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}
                className="min-h-11 w-full appearance-none bg-white border border-border hover:border-borderHover rounded-xl pl-3.5 pr-10 text-sm font-bold text-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors cursor-pointer">
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
              </select>
              <ChevronDown className="absolute right-3 bottom-3.5 w-4 h-4 text-muted pointer-events-none" />
            </label>
            {/* Action */}
            <label className="relative block">
              <span className="mb-1.5 block text-[11px] font-bold tracking-wider text-muted uppercase">Action</span>
              <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
                className="min-h-11 w-full appearance-none bg-white border border-border hover:border-borderHover rounded-xl pl-3.5 pr-10 text-sm font-bold text-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors cursor-pointer">
                <option value="Time In">Time In</option>
                <option value="Time Out">Time Out</option>
              </select>
              <ChevronDown className="absolute right-3 bottom-3.5 w-4 h-4 text-muted pointer-events-none" />
            </label>
          </section>
        )}

        {/* TAB BAR */}
        <div role="tablist" aria-label="Attendance views" className="grid grid-cols-4 gap-1 p-1 bg-white border border-border rounded-xl shadow-sm">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-label={label} aria-selected={activeTab === id} aria-controls={`attendance-panel-${id}`} onClick={() => setActiveTab(id)}
              className={cn("relative min-h-11 flex items-center justify-center gap-2 px-2 sm:px-4 text-xs sm:text-sm font-bold rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeTab === id ? "text-primary" : "text-muted hover:bg-canvas hover:text-fg")}>
              {activeTab === id && (
                <motion.div layoutId="adminTabPill"
                  className="absolute inset-0 bg-primary/10 rounded-lg"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{ zIndex: -1 }} />
              )}
              <Icon aria-hidden="true" className="w-4 h-4" />
              <span className="hidden min-[520px]:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <AnimatePresence mode="wait">

          {/* ══════════════ SCANNER TAB ══════════════ */}
          {activeTab === 'scanner' && (
            <motion.div id="attendance-panel-scanner" role="tabpanel" key="scanner" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              <div className="bg-white rounded-2xl border border-border shadow-sm mx-auto max-w-3xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border">
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

                  <div className="min-h-[300px] p-5 sm:p-6 flex flex-col items-center justify-center">
                    {cameraError ? (
                      <div className="text-center flex flex-col items-center gap-4">
                        <CameraOff className="w-12 h-12 text-muted opacity-50" />
                        <p className="text-sm text-muted max-w-xs">{cameraError}</p>
                        <button onClick={() => { setCameraError(null); setIsScannerActive(true); }}
                          className="min-h-11 px-5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primaryHover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                          Try Again
                        </button>
                      </div>
                    ) : !isScannerActive ? (
                      <div className="flex flex-col items-center gap-4 text-center">
                        <button onClick={() => setIsScannerActive(true)}
                          className="group min-h-12 inline-flex items-center gap-2.5 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-sm hover:bg-primaryHover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                          <Camera className="w-5 h-5" />
                          Start scanner
                        </button>
                        <div>
                          <p className="text-sm font-semibold text-fg">Ready to scan QR attendance</p>
                          <p className="mt-1 text-xs text-muted">Camera permission is requested only after you start.</p>
                        </div>
                        <p className="text-xs font-medium text-muted">{selectedEvent} · {selectedSession} · {selectedType}</p>
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
                          className="min-h-11 px-5 bg-canvas hover:bg-border/50 text-fg text-sm font-bold rounded-xl transition-colors">
                          Deactivate
                        </button>
                      </div>
                    )}
                  </div>
                  <form
                    onSubmit={async event => {
                      event.preventDefault();
                      const saved = await handleScanSuccess(manualEmail, selectedEvent, selectedSession, selectedType);
                      if (saved) setManualEmail('');
                    }}
                    className="border-t border-border bg-canvas/50 px-5 py-4 sm:px-6"
                  >
                    <label htmlFor="manual-attendance-email" className="mb-1.5 block text-xs font-bold text-fg">Camera unavailable? Record manually</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        id="manual-attendance-email"
                        type="email"
                        autoComplete="off"
                        value={manualEmail}
                        onChange={event => setManualEmail(event.target.value)}
                        placeholder="student@example.com"
                        className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-white px-3.5 text-sm text-fg outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                      <button type="submit" disabled={isSaving || !manualEmail.trim()} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                        {isSaving ? 'Recording…' : `Record ${selectedType}`}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-muted">Uses {selectedEvent} · {selectedSession} · {selectedType}.</p>
                  </form>
              </div>
            </motion.div>
          )}

          {/* ══════════════ SESSION SHEET TAB ══════════════ */}
          {activeTab === 'sheet' && (
            <motion.div id="attendance-panel-sheet" role="tabpanel" key="sheet" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white">
                  <div>
                    <h3 className="font-bold text-lg text-fg mb-1">
                      {selectedEvent} Attendance
                    </h3>
                    <p className="text-sm text-muted">Total Records: {filteredTrackerData.length}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-h-11 bg-canvas border border-border rounded-xl px-3 flex items-center hover:border-borderHover transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                      <Search className="w-4 h-4 text-muted mr-2" />
                      <input 
                        type="text" 
                        aria-label="Search attendance"
                        placeholder="Search name or email..." 
                        className="bg-transparent border-none outline-none text-sm text-fg placeholder-muted w-32 md:w-48"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <div className="relative">
                      <select 
                        aria-label="Filter by role"
                        value={roleFilter} 
                        onChange={e => setRoleFilter(e.target.value)}
                        className="min-h-11 appearance-none bg-canvas border border-border hover:border-borderHover rounded-xl pl-3 pr-8 text-sm font-medium text-fg focus:outline-none focus:border-primary transition-colors cursor-pointer"
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
                        aria-label="Filter by status"
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value)}
                        className="min-h-11 appearance-none bg-canvas border border-border hover:border-borderHover rounded-xl pl-3 pr-8 text-sm font-medium text-fg focus:outline-none focus:border-primary transition-colors cursor-pointer"
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
                      className="min-h-11 flex items-center gap-2 bg-primary hover:bg-primaryHover text-white px-4 rounded-xl text-sm font-bold transition-colors shadow-sm"
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
                    <div className="hidden xl:block overflow-x-auto">
                      <table className="w-full min-w-[900px] table-fixed text-left border-collapse">
                        <thead>
                          <tr className="bg-canvas/50">
                            <th className="w-[26%] px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Attendee</th>
                            <th className="w-[11%] px-4 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Role</th>
                            <th className="w-[17%] px-4 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider text-center">Morning</th>
                            <th className="w-[17%] px-4 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider text-center">Afternoon</th>
                            <th className="w-[17%] px-4 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider text-center">Status</th>
                            <th className="sticky right-0 z-10 w-[12%] border-l border-border bg-canvas px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                          {filteredTrackerData.map(row => (
                            <tr key={row.email} className="group hover:bg-canvas/30 transition-colors">
                              <td className="px-5 py-4">
                                <div className="text-sm font-semibold text-fg">{row.name}</div>
                                <div className="mt-0.5 truncate text-xs text-muted" title={row.email}>{row.email}</div>
                              </td>
                              <td className="px-4 py-4">
                                <RoleBadge role={row.role} />
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="text-sm font-semibold text-fg">{fmtTime(row.morning_in)} – {fmtTime(row.morning_out)}</div>
                                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">In · Out</div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="text-sm font-semibold text-fg">{fmtTime(row.afternoon_in)} – {fmtTime(row.afternoon_out)}</div>
                                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">In · Out</div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="sticky right-0 z-[1] border-l border-border bg-white px-3 py-4 text-center group-hover:bg-canvas">
                                <button onClick={() => handleDeleteAll(row.logIds)}
                                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-accentRedFg transition-colors hover:bg-accentRed/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                  title="Delete records" aria-label={`Delete attendance records for ${row.name}`}>
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="block divide-y divide-border bg-white xl:hidden">
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
                            <button onClick={() => handleDeleteAll(row.logIds)}
                              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-bold text-accentRedFg transition-colors hover:bg-accentRed/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label={`Delete attendance records for ${row.name}`}>
                              <Trash2 className="h-4 w-4" /> Delete
                            </button>
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
            <motion.div id="attendance-panel-general" role="tabpanel" key="general" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
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
            <motion.div id="attendance-panel-stats" role="tabpanel" key="stats" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-6">

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

                  {/* Insights Section */}
                  {statsData.length > 0 && (
                    <div className="mx-6 mt-2 mb-6 bg-primary/5 border border-primary/20 rounded-xl p-5 flex gap-4 items-start">
                      <div className="bg-primary/20 p-2.5 rounded-lg shrink-0">
                        <Lightbulb className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-fg mb-1 text-sm">Key Insights & Trends</h4>
                        <p className="text-sm text-fg/80 leading-relaxed">
                          {generateInsights(statsData)}
                        </p>
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
