import React, { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock, AlertTriangle, CheckCircle2, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../utils';
import QRPassModal from './settings/QRPassModal';
import { PageHeader } from './ui/page';

const AttendanceStudentView = ({ userEmail, userName }) => {
  const [attendance, setAttendance] = useState([]);
  const [globalEvents, setGlobalEvents] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showQRPopout, setShowQRPopout] = useState(false);
  const reduceMotion = useReducedMotion();

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const response = await fetch('/api/attendance');
      const data = await response.json();

      if (!response.ok || !Array.isArray(data.attendance)) throw new Error('Could not load attendance. Check your connection and try again.');

      setGlobalEvents(new Set(data.attendance.map(log => log.event)));
      setAttendance(data.attendance.filter(log => log.email === userEmail).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch {
      setLoadError('Could not load attendance. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

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
    <div tabIndex="0" role="region" aria-label="Attendance details" className="h-full overflow-y-auto bg-canvas overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <div className="shore-page-content max-w-7xl mx-auto">
      
      <PageHeader
        title="My Attendance"
        description="Show your pass at sessions and review your check-ins."
      />

      {/* MAIN GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mt-6 lg:items-start">
        
        {/* LEFT COLUMN: DIGITAL PASS */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-8">
          
          {!loadError && !loading && absences >= 2 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-[2rem] p-6 flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]"
            >
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-lg font-black text-red-900 mb-1">Attendance Warning</h2>
                <p className="text-sm font-medium text-red-800/80 leading-relaxed">
                  You have <strong className="text-red-900">{absences} absences</strong> for mandatory events. Perfect attendance is required to maintain scholarship eligibility.
                </p>
              </div>
            </motion.div>
          )}

          <motion.section
            aria-labelledby="attendance-pass-title"
            initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(6px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden rounded-2xl border border-border bg-white"
          >
            <div className="flex items-center gap-3 bg-primary px-4 py-3 text-white sm:px-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15">
                <QrCode aria-hidden="true" className="h-5 w-5" />
              </span>
              <h2 id="attendance-pass-title" className="text-base font-semibold">Attendance Pass</h2>
            </div>
            <div className="flex flex-col items-center gap-4 p-4 sm:p-5">
              <button type="button" onClick={() => setShowQRPopout(true)} aria-label="Enlarge QR attendance pass" aria-haspopup="dialog" className="group rounded-2xl bg-accentBlue p-2 hover:bg-blue-100 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <span className="block rounded-xl bg-white p-2">
                  <QRCodeSVG title="Your attendance QR pass" value={userEmail} size={160} bgColor="#ffffff" fgColor="#000000" level="H" includeMargin={false} />
                </span>
                <span className="mt-2 block text-center text-xs font-semibold text-primary">Enlarge QR</span>
              </button>
              <div className="max-w-full text-center">
                <p className="break-words text-base font-semibold text-fg">{userName || userEmail?.split('@')[0] || 'Account'}</p>
                <p className="mt-1 break-all text-xs leading-5 text-muted">{userEmail}</p>
              </div>
            </div>
          </motion.section>
        </div>

        {/* RIGHT COLUMN: RECENT LOGS TIMELINE */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl font-bold text-fg">Activity Log</h2>
            <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full text-xs font-bold text-fg border border-border/50 shadow-sm">
              {attendedEvents.size} <span className="text-muted font-medium">{attendedEvents.size === 1 ? 'Event Recorded' : 'Events Recorded'}</span>
            </div>
          </div>

          <div className="min-w-0 flex flex-col">
            <div className="bg-white rounded-2xl border border-border p-4 sm:p-6 flex flex-col">
              {loading ? (
                <div className="py-12 flex flex-1 items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : loadError ? (
                <div className="py-8 text-sm">
                  <p role="alert" className="text-red-800">{loadError}</p>
                  <button type="button" onClick={loadAttendance} className="mt-3 min-h-11 rounded-lg border border-border px-4 font-semibold text-primary focus-visible:ring-2 focus-visible:ring-primary">Retry</button>
                </div>
              ) : attendance.length === 0 ? (
                <div className="py-16 flex flex-1 flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-canvas rounded-[2rem] border border-border/50 flex items-center justify-center mb-6">
                    <Clock className="w-8 h-8 text-muted" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-fg mb-2">History is Empty</h3>
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
                            log.type === 'Time In' ? "bg-green-50 text-green-800" : "bg-orange-50 text-orange-800"
                          )}>
                            {log.type === 'Time In' ? <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> : <Clock className="w-3 h-3" strokeWidth={2} />}
                            {log.type}
                          </span>
                          <span className="text-xs font-bold text-fg">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-fg mb-0.5">{log.event}</h3>
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
        <QRPassModal
          isOpen={showQRPopout}
          onClose={() => setShowQRPopout(false)}
          userEmail={userEmail}
          userRole="student"
        />
      </div>
    </div>
  );
};

export default AttendanceStudentView;
