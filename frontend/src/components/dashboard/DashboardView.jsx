import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Loader2, LayoutDashboard, TrendingUp, Trophy, Target, AlertTriangle, Flame, RefreshCw, X } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../../utils';
import { AnimatedNumber, CustomTooltip } from './DashboardPrimitives';
import { LottieFire, getStreakTheme, StreakModalContent } from './StreakModal';
import { TotalScoreContent, CohortRankContent, TopPerformerContent, PriorityFocusContent } from './ExpandedCardPanels';

const REPORT_TYPES = [
  { id: 'pre', label: 'Pre-Test Only' },
  { id: 'post', label: 'Post-Test Only' },
  { id: 'both', label: 'Progress Report' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export default function DashboardView({
  userRole, userName,
  students, stats,
  selectedStudent, setSelectedStudent,
  reportType, setReportType,
  isGenerating, handleGenerate,
  studentStreak,
  expandedCard, handleSetExpandedCard,
  dataLoadState, dataLoadError, onRetryData,
}) {
  const { color: streakCardColor, filter: streakCardFilter } = getStreakTheme(studentStreak);

  const EXPANDED_TITLES = {
    total: 'Total Score Details',
    rank: 'Cohort Rank Details',
    top: 'Top Performer Breakdown',
    priority: 'Priority Focus Area',
  };

  useEffect(() => {
    if (!expandedCard) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleSetExpandedCard(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expandedCard, handleSetExpandedCard]);

  return (
    <>
      {/* Top header */}
      <header className="px-4 pb-4 pt-6 sm:px-6 md:px-8 shrink-0 z-10">
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Dashboard</h1>
        <p className="mt-1.5 text-sm text-muted">
          Welcome back, {userRole === 'admin' ? 'Admin' : (userName || 'student')}.
        </p>
      </header>

      {/* Action bar */}
      {students.length > 0 && (
        <div className="bg-card/50 border-y border-border px-4 sm:px-6 md:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 z-10">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {userRole === 'admin' || userRole === 'volunteer' ? (
              <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="appearance-none w-full bg-white border border-border hover:border-borderHover rounded-xl pl-4 pr-10 py-2.5 sm:py-2 text-sm font-medium text-fg focus:outline-none focus:border-primary transition-colors cursor-pointer shadow-sm">
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
            <div className="flex bg-white border border-border rounded-xl p-1 shadow-sm w-full sm:w-auto">
              {REPORT_TYPES.map(type => (
                <button type="button" key={type.id} onClick={() => setReportType(type.id)} className={cn('flex-1 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', reportType === type.id ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-fg')}>
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={handleGenerate} disabled={!selectedStudent || isGenerating} className="w-full sm:w-auto bg-white border border-border hover:bg-canvas disabled:opacity-50 text-fg px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-primary" />}
            Export PDF
          </button>
        </div>
      )}

      {/* Expanded card modal */}
      <AnimatePresence>
        {expandedCard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => handleSetExpandedCard(null)}>
            <motion.div role="dialog" aria-modal="true" aria-label={EXPANDED_TITLES[expandedCard] || (expandedCard === 'streak' ? 'Attendance streak details' : 'Details')} initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={cn('w-full shadow-2xl max-h-[90vh] md:max-h-[85vh] relative', expandedCard === 'streak' ? 'max-w-[360px] rounded-[2.5rem] bg-slate-900 border border-white/20 overflow-hidden' : 'max-w-lg rounded-3xl bg-card overflow-y-auto')} onClick={e => e.stopPropagation()}>
              {expandedCard === 'streak' ? (
                <StreakModalContent studentStreak={studentStreak} setExpandedCard={handleSetExpandedCard} />
              ) : (
                <>
                  <div className="p-6 border-b border-border flex justify-between items-center bg-card">
                    <h2 id="expanded-card-title" className="text-xl font-bold text-fg capitalize">{EXPANDED_TITLES[expandedCard] || 'Details'}</h2>
                    <button type="button" aria-label="Close details" onClick={() => handleSetExpandedCard(null)} className="p-2 hover:bg-muted/10 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <X className="w-5 h-5 text-muted hover:text-fg" />
                    </button>
                  </div>
                  {expandedCard === 'rank' && stats && <CohortRankContent stats={stats} />}
                  {expandedCard === 'top' && stats && <TopPerformerContent stats={stats} />}
                  {expandedCard === 'priority' && stats && <PriorityFocusContent stats={stats} />}
                  {expandedCard === 'total' && stats && <TotalScoreContent stats={stats} />}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable dashboard content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-28 md:pb-10">
        <div className="max-w-7xl mx-auto flex flex-col min-h-full">
          {dataLoadState === 'loading' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto" role="status" aria-live="polite">
              <Loader2 className="w-9 h-9 text-primary animate-spin mb-4" />
              <h2 className="text-xl font-bold text-fg mb-2">Loading dashboard data</h2>
              <p className="text-muted text-sm">Fetching the latest student records and attendance…</p>
            </div>
          ) : dataLoadState === 'error' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto" role="alert">
              <div className="w-16 h-16 bg-accentRed border border-red-200 rounded-2xl flex items-center justify-center mb-5">
                <AlertTriangle className="w-8 h-8 text-accentRedFg" />
              </div>
              <h2 className="text-xl font-bold text-fg mb-2">Dashboard data is unavailable</h2>
              <p className="text-muted text-sm leading-relaxed mb-5">{dataLoadError}</p>
              <button type="button" onClick={onRetryData} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primaryHover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <RefreshCw className="w-4 h-4" /> Try again
              </button>
            </div>
          ) : !selectedStudent ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-70">
              <div className="w-20 h-20 bg-card border border-border rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <LayoutDashboard className="w-10 h-10 text-muted" />
              </div>
              <h2 className="text-2xl font-bold text-fg mb-3">No Data Active</h2>
              <p className="text-muted text-sm leading-relaxed">
                {userRole === 'admin' ? 'Upload an Excel tracker using the button in the bottom left, then select a student from the top menu to view analytics.'
                  : userRole === 'volunteer' ? 'Select a student from the top menu to view analytics.'
                  : 'Please wait for the admin to upload the performance data or select your name if available.'}
              </p>
            </div>
          ) : !stats ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-muted">No data available for this report type.</div>
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
              {/* Metrics row */}
              <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 md:gap-6">
                <motion.button type="button" aria-haspopup="dialog" aria-label="Open total score details" variants={itemVariants} className="col-span-2 xl:col-span-1 bg-primary text-white rounded-3xl p-5 md:p-6 shadow-md relative overflow-hidden flex flex-row items-center justify-between xl:flex-col xl:items-start text-left hover:ring-2 hover:ring-primary/50 transition-[box-shadow,transform] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" onClick={() => handleSetExpandedCard('total')}>
                  <div className="relative z-10">
                    <p className="text-white/80 font-medium text-sm mb-1">Total Score</p>
                    <h3 className="text-4xl md:text-5xl font-bold tracking-tight"><AnimatedNumber value={stats.total} /></h3>
                    {stats.growth !== null && (
                      <div className="mt-2 md:mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span>{stats.growth > 0 ? '+' : ''}<AnimatedNumber value={stats.growth} /> since Pre-Test</span>
                      </div>
                    )}
                  </div>
                  <div className="relative z-10 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 xl:hidden shrink-0 ml-4">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                </motion.button>

                {/* Streak card */}
                <motion.button type="button" aria-haspopup="dialog" aria-label="Open attendance streak details" variants={itemVariants} className="col-span-2 xl:col-span-1 bg-card border border-border rounded-3xl p-4 md:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden text-left hover:ring-2 hover:ring-primary/50 transition-[box-shadow,transform] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" onClick={() => handleSetExpandedCard('streak')}>
                  <div className="flex items-center justify-between mb-3 md:mb-4 relative z-10">
                    <p className="text-fg font-semibold text-xs md:text-sm leading-tight mr-2">Attendance<br />Streak</p>
                    <div className={cn('w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0', studentStreak === 0 && 'bg-muted/20')} style={studentStreak > 0 ? { backgroundColor: `${streakCardColor}33` } : {}}>
                      <Flame className={cn('w-3 h-3 md:w-4 md:h-4', studentStreak === 0 && 'text-muted')} style={studentStreak > 0 ? { color: streakCardColor } : {}} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-baseline gap-1 md:gap-2">
                      <h3 className={cn('text-2xl md:text-4xl font-bold tracking-tight', studentStreak === 0 && 'text-muted')} style={studentStreak > 0 ? { color: streakCardColor } : {}}>
                        <AnimatedNumber value={studentStreak} />
                      </h3>
                      <span className="text-muted font-medium text-xs md:text-base">Days</span>
                    </div>
                  </div>
                  <div className={cn('absolute right-0 bottom-0 w-24 h-24 md:w-32 md:h-32 translate-y-4 translate-x-4 opacity-50', studentStreak === 0 && 'grayscale opacity-10')}>
                    <LottieFire style={studentStreak > 0 ? { filter: streakCardFilter, width: '100%', height: '100%' } : { width: '100%', height: '100%' }} />
                  </div>
                </motion.button>

                {/* Rank card */}
                <motion.button type="button" aria-haspopup="dialog" aria-label="Open cohort rank details" variants={itemVariants} className="col-span-1 bg-card border border-border rounded-3xl p-4 md:p-6 shadow-sm flex flex-col justify-between text-left hover:ring-2 hover:ring-primary/50 transition-[box-shadow,transform] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" onClick={() => handleSetExpandedCard('rank')}>
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <p className="text-fg font-semibold text-xs md:text-sm leading-tight mr-2">Cohort<br />Rank</p>
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-accentBlue/50 flex items-center justify-center shrink-0">
                      <Trophy className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 md:gap-2">
                    <h3 className="text-2xl md:text-4xl font-bold text-fg tracking-tight">#<AnimatedNumber value={stats.rank} /></h3>
                    <span className="text-muted font-medium text-xs md:text-base">/ {stats.totalStudents}</span>
                  </div>
                </motion.button>

                {/* Top performer card */}
                <motion.button type="button" aria-haspopup="dialog" aria-label="Open top performer details" variants={itemVariants} className="col-span-1 bg-card border border-border rounded-3xl p-4 md:p-6 shadow-sm flex flex-col justify-between text-left hover:ring-2 hover:ring-primary/50 transition-[box-shadow,transform] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" onClick={() => handleSetExpandedCard('top')}>
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <p className="text-fg font-semibold text-xs md:text-sm leading-tight mr-2">Top<br />Performer</p>
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-accentGreen flex items-center justify-center shrink-0">
                      <Target className="w-3 h-3 md:w-4 md:h-4 text-accentGreenFg" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-fg truncate mb-0.5 md:mb-1" title={stats.strongest.name}>{stats.strongest.name}</h3>
                    <p className="text-muted font-medium text-xs md:text-sm"><AnimatedNumber value={stats.strongest.score} /> pts</p>
                  </div>
                </motion.button>

                {/* Priority focus card */}
                <motion.button type="button" aria-haspopup="dialog" aria-label="Open priority focus details" variants={itemVariants} className="col-span-2 xl:col-span-1 bg-card border border-border rounded-3xl p-4 md:p-6 shadow-sm flex flex-col justify-between text-left hover:ring-2 hover:ring-primary/50 transition-[box-shadow,transform] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" onClick={() => handleSetExpandedCard('priority')}>
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <p className="text-fg font-semibold text-xs md:text-sm leading-tight mr-2 text-left">Priority<br />Focus</p>
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-accentRed flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 text-accentRedFg" />
                    </div>
                  </div>
                  <div className="text-left overflow-hidden">
                    <h3 className="text-sm md:text-base font-bold text-fg truncate mb-0.5 md:mb-1" title={stats.weaknesses[0]?.name || 'N/A'}>{stats.weaknesses[0]?.name || 'N/A'}</h3>
                    <p className="text-muted font-medium text-xs md:text-sm"><AnimatedNumber value={stats.weaknesses[0]?.score || 0} /> pts</p>
                  </div>
                </motion.button>
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-6 shadow-sm h-[380px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-fg">{stats.preVsPostData ? 'Pre-Test vs Post-Test Growth' : 'Performance vs Cohort Average'}</h3>
                    <span className="text-xs font-medium text-muted bg-canvas px-3 py-1 rounded-full">Score</span>
                  </div>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.preVsPostData || stats.vsCohortData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F4F3ED' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#111827', paddingTop: '10px' }} />
                        {stats.preVsPostData ? (
                          <>
                            <Bar dataKey="pre" name="Pre-Test" fill="#94A3B8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="post" name="Post-Test" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </>
                        ) : (
                          <>
                            <Bar dataKey="cohort" name="Cohort Average" fill="#94A3B8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="student" name={selectedStudent} fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-6 shadow-sm h-[380px] flex flex-col">
                  <h3 className="text-base font-bold text-fg mb-2">Mastery Profile</h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.radarData}>
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} />
                        <Radar name={selectedStudent} dataKey="score" stroke="#2563EB" strokeWidth={2} fill="#2563EB" fillOpacity={0.15} />
                        <Tooltip content={<CustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              {/* Subject rankings table */}
              <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-white">
                  <h3 className="text-base font-bold text-fg">Subject Performance Breakdown</h3>
                  <span className="text-xs font-medium text-muted">Sorted by Score</span>
                </div>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-canvas/50">
                        {['Subject', 'Student Score', 'Cohort Avg', 'Gap', 'Status'].map((h, i) => (
                          <th key={h} className={cn('px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider', i === 4 && 'text-right')}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white">
                      {stats.subjectRankings.map((subj, idx) => (
                        <tr key={subj.name} className="hover:bg-canvas/30 transition-colors">
                          <td className="px-6 py-4"><div className="flex items-center gap-3"><span className="text-xs font-bold text-muted w-4">{idx + 1}</span><span className="font-semibold text-fg">{subj.name}</span></div></td>
                          <td className="px-6 py-4 font-bold text-fg">{subj.score}</td>
                          <td className="px-6 py-4 font-medium text-muted">{subj.cohortAvg}</td>
                          <td className="px-6 py-4"><span className={cn('font-bold', subj.diff >= 0 ? 'text-accentGreenFg' : 'text-accentRedFg')}>{subj.diff >= 0 ? `+${subj.diff}` : subj.diff}</span></td>
                          <td className="px-6 py-4 text-right">
                            {subj.diff >= 0
                              ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-accentGreen text-accentGreenFg"><TrendingUp className="w-3 h-3" /> Above Avg</span>
                              : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-accentRed text-accentRedFg"><AlertTriangle className="w-3 h-3" /> Needs Work</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile */}
                <div className="block md:hidden divide-y divide-border bg-white">
                  {stats.subjectRankings.map((subj, idx) => (
                    <div key={subj.name} className="p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-canvas flex items-center justify-center text-xs font-bold text-muted">{idx + 1}</span>
                          <span className="font-bold text-fg text-sm">{subj.name}</span>
                        </div>
                        {subj.diff >= 0
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-accentGreen text-accentGreenFg uppercase tracking-wider"><TrendingUp className="w-3 h-3" /> Above</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-accentRed text-accentRedFg uppercase tracking-wider"><AlertTriangle className="w-3 h-3" /> Below</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-2 bg-canvas/30 rounded-lg p-2.5 text-center">
                        <div><p className="text-xs text-muted font-semibold uppercase mb-0.5">Score</p><p className="font-bold text-fg text-sm">{subj.score}</p></div>
                        <div><p className="text-xs text-muted font-semibold uppercase mb-0.5">Avg</p><p className="font-medium text-muted text-sm">{subj.cohortAvg}</p></div>
                        <div><p className="text-xs text-muted font-semibold uppercase mb-0.5">Gap</p><p className={cn('font-bold text-sm', subj.diff >= 0 ? 'text-accentGreenFg' : 'text-accentRedFg')}>{subj.diff >= 0 ? `+${subj.diff}` : subj.diff}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
