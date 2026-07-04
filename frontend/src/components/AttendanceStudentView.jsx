import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, CheckCircle2, QrCode, X } from 'lucide-react';
import anime from 'animejs';
import { cn } from '../utils';

const AttendanceStudentView = ({ userEmail }) => {
  const [attendance, setAttendance] = useState([]);
  const [globalEvents, setGlobalEvents] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showQRPopout, setShowQRPopout] = useState(false);
  const qrModalRef = React.useRef(null);

  useEffect(() => {
    if (showQRPopout && qrModalRef.current) {
      anime({
        targets: qrModalRef.current,
        scale: [0.5, 1],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutElastic(1, .8)'
      });
    }
  }, [showQRPopout]);

  useEffect(() => {
    fetch('/api/attendance')
      .then(res => res.json())
      .then(data => {
        const allLogs = data.attendance || [];
        const occurredEvents = new Set(allLogs.map(log => log.event));
        setGlobalEvents(occurredEvents);
        
        const studentLogs = allLogs.filter(log => log.email === userEmail);
        studentLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setAttendance(studentLogs);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load attendance", err);
        setLoading(false);
      });
  }, [userEmail]);

  const mandatoryEvents = [
    "Onboarding", 
    "Session 1", "Session 2", "Session 3", "Session 4", 
    "Session 5", "Session 6", "Session 7", "Session 8", 
    "Graduation"
  ];
  const attendedEvents = new Set(
    attendance.filter(log => log.type === 'Time In').map(log => log.event)
  );
  
  const absences = mandatoryEvents.filter(ev => globalEvents.has(ev) && !attendedEvents.has(ev)).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto pb-32 px-4 sm:px-6 lg:px-8">
      
      {/* MACRO-WHITESPACE HEADER */}
      <div className="pt-16 pb-8 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-canvas border border-border/50 text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Digital Pass
        </div>
        <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-fg mb-4">My Attendance</h1>
        <p className="text-base text-muted font-medium leading-relaxed max-w-lg mx-auto">
          Present your digital pass at mandatory events. Your personal check-in history is securely logged below.
        </p>
      </div>

      {/* MAIN GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-12">
        
        {/* LEFT COLUMN: DIGITAL PASS */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-8">
          
          {absences >= 2 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-[2rem] p-6 flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]"
            >
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-lg font-black text-red-900 mb-1">Attendance Warning</h3>
                <p className="text-sm font-medium text-red-800/80 leading-relaxed">
                  You have <strong className="text-red-900">{absences} absences</strong> for mandatory events. Perfect attendance is required to maintain scholarship eligibility.
                </p>
              </div>
            </motion.div>
          )}

          {/* DIGITAL PASS (MAGNETIC DOUBLE BEZEL) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="group bg-canvas p-2 rounded-[3rem] border border-border/50 shadow-xl shadow-black/5 w-full hover:scale-[1.02] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          >
            <div className="bg-white rounded-[2.5rem] shadow-[inset_0_1px_2px_rgba(255,255,255,1)] border border-border/20 overflow-hidden relative">
              
              <div className="h-32 bg-primary relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                <QrCode className="w-16 h-16 text-white/30 absolute -bottom-4 -right-2 rotate-12 scale-150 mix-blend-overlay" />
              </div>
              
              <div className="px-8 pb-10 pt-2 flex flex-col items-center relative z-10">
                <div 
                  className="bg-white p-5 rounded-[2rem] shadow-xl shadow-black/10 border border-black/5 -mt-16 mb-8 group-hover:-translate-y-2 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
                  onClick={() => setShowQRPopout(true)}
                  title="Click to enlarge"
                >
                  <QRCodeSVG 
                    value={userEmail} 
                    size={160} 
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                    includeMargin={false}
                  />
                  <p className="text-[10px] text-center font-bold text-muted uppercase mt-3">Click to enlarge</p>
                </div>
                
                <h2 className="text-2xl font-black text-fg text-center mb-1">{userEmail ? userEmail.split('@')[0] : ''}</h2>
                <div className="flex items-center gap-1.5 justify-center mb-8">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-[0.15em]">Scholar Account</span>
                </div>
                
                <div className="w-full bg-canvas rounded-2xl p-4 flex items-center justify-between border border-border/50">
                  <div className="overflow-hidden w-full">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Email Identifier</p>
                    <p className="text-xs font-bold text-fg truncate">{userEmail}</p>
                  </div>
                </div>
              </div>

              <div className="absolute top-32 left-0 w-6 h-6 bg-canvas rounded-r-full -translate-x-3 -translate-y-1/2 shadow-[inset_-1px_0_2px_rgba(0,0,0,0.05)] border border-border/50 border-l-0" />
              <div className="absolute top-32 right-0 w-6 h-6 bg-canvas rounded-l-full translate-x-3 -translate-y-1/2 shadow-[inset_1px_0_2px_rgba(0,0,0,0.05)] border border-border/50 border-r-0" />
            </div>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: RECENT LOGS TIMELINE */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-fg">Activity Log</h3>
            <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full text-xs font-bold text-fg border border-border/50 shadow-sm">
              {attendedEvents.size} <span className="text-muted font-medium">Events Recorded</span>
            </div>
          </div>

          <div className="bg-canvas p-2.5 rounded-[2.5rem] border border-border/50 shadow-sm flex-1 flex flex-col">
            <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-[inset_0_1px_2px_rgba(255,255,255,1)] border border-border/20 flex-1 flex flex-col">
              {loading ? (
                <div className="py-12 flex flex-1 items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : attendance.length === 0 ? (
                <div className="py-16 flex flex-1 flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-canvas rounded-[2rem] border border-border/50 flex items-center justify-center mb-6">
                    <Clock className="w-8 h-8 text-muted" strokeWidth={1.5} />
                  </div>
                  <h4 className="text-lg font-bold text-fg mb-2">History is Empty</h4>
                  <p className="text-muted text-sm max-w-xs font-medium">
                    You haven't scanned into any events yet. Present your digital pass to begin tracking.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[600px] pr-2 space-y-4">
                  {attendance.map((log, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, ease: [0.32, 0.72, 0, 1] }}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-canvas hover:bg-white border border-transparent hover:border-border/60 rounded-2xl transition-all duration-300 hover:shadow-sm gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                            log.type === 'Time In' ? "bg-green-500/10 text-green-700" : "bg-orange-500/10 text-orange-700"
                          )}>
                            {log.type === 'Time In' ? <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> : <Clock className="w-3 h-3" strokeWidth={2} />}
                            {log.type}
                          </span>
                          <span className="text-xs font-bold text-fg">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-fg mb-0.5">{log.event}</h4>
                        <p className="text-xs text-muted font-medium">
                          {new Date(log.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* QR Code Popout Modal */}
      <AnimatePresence>
        {showQRPopout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg/60 backdrop-blur-sm p-4">
            <div 
              className="absolute inset-0"
              onClick={() => setShowQRPopout(false)}
            />
            <div 
              ref={qrModalRef}
              className="relative bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center max-w-sm w-full"
            >
              <button 
                onClick={() => setShowQRPopout(false)}
                className="absolute top-4 right-4 p-2 bg-canvas text-muted hover:text-fg rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="bg-canvas p-4 rounded-2xl mb-6 shadow-inner border border-border/50">
                <QRCodeSVG 
                  value={userEmail} 
                  size={250} 
                  bgColor="transparent"
                  fgColor="#000000"
                  level="H"
                  includeMargin={false}
                />
              </div>
              
              <h2 className="text-2xl font-black text-fg text-center mb-1 tracking-tight">
                {userEmail.split('@')[0]}
              </h2>
              <div className="flex items-center gap-1.5 justify-center">
                <span className="text-xs font-bold text-primary uppercase tracking-[0.15em] bg-primary/10 px-3 py-1 rounded-full">
                  SHORE 5.0 Student
                </span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default AttendanceStudentView;
