import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Loader2, LayoutDashboard, TrendingUp, Trophy, Target,
  AlertTriangle, Flame, RefreshCw, X, Upload, GraduationCap, ChevronDown,
  ArrowUpRight
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../../utils';
import { AnimatedNumber, CustomTooltip } from './DashboardPrimitives';
import { LottieFire, getStreakTheme, StreakModalContent } from './StreakModal';
import { TotalScoreContent, CohortRankContent, TopPerformerContent, PriorityFocusContent } from './ExpandedCardPanels';
import { MATH_SUBJ, SCI_SUBJ } from '../../utils/analytics';
import { PageHeader, PageShell } from '../ui/page';

const REPORT_TYPES = [
  { id: 'pre', label: 'Pre-Test Only', shortLabel: 'Pre-Test' },
  { id: 'post', label: 'Post-Test Only', shortLabel: 'Post-Test' },
  { id: 'both', label: 'Progress Report', shortLabel: 'Progress' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 28 } },
};

/** Custom Radar Chart Tick to prevent clipping and add domain identity */
function renderCustomRadarTick({ payload, x, y, cx, cy }) {
  if (!payload || !payload.value) return null;
  const val = payload.value;
  const isMath = MATH_SUBJ.includes(val);
  const isSci = SCI_SUBJ.includes(val);
  const dotColor = isMath ? '#3B82F6' : isSci ? '#10B981' : '#8B5CF6';

  const isRight = x > cx + 6;
  const isLeft = x < cx - 6;
  const textAnchor = isRight ? 'start' : isLeft ? 'end' : 'middle';
  const offsetX = isRight ? 4 : isLeft ? -4 : 0;
  const offsetY = y > cy + 6 ? 3 : y < cy - 6 ? -3 : 0;

  return (
    <g transform={`translate(${x + offsetX},${y + offsetY})`}>
      <circle cx={isRight ? -3.5 : isLeft ? 3.5 : 0} cy={isRight || isLeft ? -2.5 : -8} r={2} fill={dotColor} />
      <text
        x={0}
        y={0}
        textAnchor={textAnchor}
        fill="#334155"
        fontSize={9.5}
        fontWeight={600}
        fontFamily="Inter, sans-serif"
      >
        {val}
      </text>
    </g>
  );
}

export default function DashboardView({
  userRole, userName,
  students, stats,
  selectedStudent, setSelectedStudent,
  reportType, setReportType,
  isGenerating, handleGenerate,
  studentStreak,
  expandedCard, handleSetExpandedCard,
  dataLoadState, dataLoadError, onRetryData,
  onUploadTracker, trackerFile,
}) {
  const { color: streakCardColor, filter: streakCardFilter } = getStreakTheme(studentStreak);
  const [domainFilter, setDomainFilter] = useState('all');

  const EXPANDED_TITLES = {
    total: 'Diagnostic Score Summary & Subject Benchmarks',
    rank: 'Cohort Ranking & Distribution',
    top: 'Strongest Academic Domains',
    priority: 'Priority Review & Improvement Areas',
  };

  useEffect(() => {
    if (!expandedCard) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleSetExpandedCard(null);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expandedCard, handleSetExpandedCard]);

  // Filter rankings by domain
  const filteredRankings = useMemo(() => {
    if (!stats?.subjectRankings) return [];

    if (domainFilter === 'math') return stats.subjectRankings.filter(s => MATH_SUBJ.includes(s.name));

    if (domainFilter === 'science') return stats.subjectRankings.filter(s => SCI_SUBJ.includes(s.name));

    if (domainFilter === 'humanities') return stats.subjectRankings.filter(s => !MATH_SUBJ.includes(s.name) && !SCI_SUBJ.includes(s.name));

    return stats.subjectRankings;
  }, [stats?.subjectRankings, domainFilter]);

  // Calculate cohort percentile tier
  const cohortPercentile = useMemo(() => {
    if (!stats?.rank || !stats?.totalStudents) return 100;

    return Math.max(1, Math.round((1 - (stats.rank - 1) / stats.totalStudents) * 100));
  }, [stats?.rank, stats?.totalStudents]);

  // Average growth calculation for header insight badge
  const averageGrowth = useMemo(() => {
    if (!stats?.preVsPostData?.length) return null;
    const totalDelta = stats.preVsPostData.reduce((acc, cur) => acc + (cur.post - cur.pre), 0);
    const avg = totalDelta / stats.preVsPostData.length;

    return {
      pts: avg.toFixed(1),
      isPositive: avg >= 0,
    };
  }, [stats?.preVsPostData]);

  // Cohort benchmark gap summary for header insight badge
  const benchmarkSummary = useMemo(() => {
    if (!stats?.vsCohortData?.length) return null;
    const totalDelta = stats.vsCohortData.reduce((acc, cur) => acc + (cur.student - cur.cohort), 0);
    const avg = totalDelta / stats.vsCohortData.length;

    return {
      pts: Math.abs(avg).toFixed(1),
      isAbove: avg >= 0,
    };
  }, [stats?.vsCohortData]);

  return (
    <>
      {/* Expanded Modal */}
      <AnimatePresence>
        {expandedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => handleSetExpandedCard(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={EXPANDED_TITLES[expandedCard] || 'Details'}
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className={cn(
                'w-full shadow-2xl max-h-[90vh] md:max-h-[85vh] relative',
                expandedCard === 'streak'
                  ? 'max-w-[360px] rounded-[2.5rem] bg-slate-900 border border-white/20 overflow-hidden'
                  : 'max-w-xl rounded-2xl bg-white overflow-hidden border border-border flex flex-col'
              )}
              onClick={e => e.stopPropagation()}
            >
              {expandedCard === 'streak' ? (
                <StreakModalContent studentStreak={studentStreak} setExpandedCard={handleSetExpandedCard} />
              ) : (
                <>
                  <div className="px-6 py-4 border-b border-border/80 flex justify-between items-center bg-white shrink-0">
                    <div>
                      <h2 id="expanded-card-title" className="text-lg font-extrabold text-fg tracking-tight">
                        {EXPANDED_TITLES[expandedCard] || 'Details'}
                      </h2>
                      <p className="text-xs text-muted">
                        Diagnostic assessment breakdown for <span className="font-semibold text-fg">{selectedStudent}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Close details modal"
                      onClick={() => handleSetExpandedCard(null)}
                      className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <X className="w-5 h-5" />
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

      {/* Main Dashboard Scrollable Viewport */}
      <PageShell width="wide" id="dashboard-scroll-viewport">
        <PageHeader
          title="Dashboard"
          description={
            selectedStudent
              ? `Diagnostic scores and progress for ${selectedStudent}`
              : 'Diagnostic assessment scores, cohort benchmarks, and academic growth'
          }
          actions={
            <>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!selectedStudent || isGenerating}
                aria-label="Export student performance report as PDF"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-card border border-border px-3.5 py-2 text-xs sm:text-sm font-semibold text-fg shadow-xs transition-all hover:bg-canvas hover:border-primary/40 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] shrink-0 touch-manipulation select-none"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Download className="w-4 h-4 text-primary" />}
                <span>Export PDF</span>
              </button>

              {userRole === 'admin' && onUploadTracker && (
                <button
                  type="button"
                  onClick={onUploadTracker}
                  aria-label="Upload or update tracker spreadsheet"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-card border border-border px-3.5 py-2 text-xs sm:text-sm font-semibold text-fg shadow-xs transition-all hover:bg-canvas hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] shrink-0 touch-manipulation select-none"
                >
                  <Upload className="w-4 h-4 text-primary" />
                  <span>{trackerFile ? 'Update Tracker' : 'Upload Tracker'}</span>
                </button>
              )}
            </>
          }
        />

        {/* Student and Report Selection Controls */}
        {students.length > 0 && (
          <section className="mt-5 mb-6 rounded-2xl border border-border bg-card p-3 sm:p-3.5 shadow-xs" aria-label="Dashboard controls">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Student selector */}
                {userRole === 'admin' || userRole === 'volunteer' ? (
                  <div className="relative w-full sm:w-auto sm:min-w-[220px]">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                      <GraduationCap className="w-4 h-4 text-primary" />
                    </div>
                    <select
                      value={selectedStudent}
                      onChange={e => setSelectedStudent(e.target.value)}
                      aria-label="Select student for analytics"
                      className="appearance-none w-full bg-canvas border border-border hover:border-slate-300 rounded-xl pl-10 pr-9 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-xs touch-manipulation"
                    >
                      <option value="" disabled>Select Student ({students.length})</option>
                      {students.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                  </div>
                ) : (
                  <div className="bg-canvas border border-border rounded-xl px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-bold text-primary flex items-center gap-2 shadow-xs">
                    <GraduationCap className="w-4 h-4" />
                    <span>{userName || selectedStudent}</span>
                  </div>
                )}

                {/* Segmented report switcher */}
                <div className="grid grid-cols-3 bg-canvas p-1 rounded-xl border border-border/80 shadow-inner w-full sm:w-auto" role="tablist" aria-label="Report mode">
                  {REPORT_TYPES.map(type => {
                    const isActive = reportType === type.id;

                    return (
                      <button
                        type="button"
                        key={type.id}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setReportType(type.id)}
                        className={cn(
                          'relative px-3 sm:px-3.5 py-2 min-h-[38px] text-xs font-bold rounded-lg transition-colors text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-manipulation select-none active:scale-[0.98]',
                          isActive ? 'text-primary' : 'text-muted hover:text-fg'
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="reportTypePill"
                            className="absolute inset-0 bg-card rounded-lg shadow-xs border border-border/60"
                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          />
                        )}
                        <span className="relative z-10 hidden sm:inline">{type.label}</span>
                        <span className="relative z-10 sm:hidden">{type.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="flex flex-col min-h-full space-y-5 sm:space-y-6">
          {dataLoadState === 'loading' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto py-16" role="status" aria-live="polite">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <h2 className="text-xl font-bold text-fg mb-1">Loading Dashboard Data</h2>
              <p className="text-muted text-sm">Fetching student performance and assessment records…</p>
            </div>
          ) : dataLoadState === 'error' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto py-16" role="alert">
              <div className="w-16 h-16 bg-accentRed border border-red-200 rounded-2xl flex items-center justify-center mb-5">
                <AlertTriangle className="w-8 h-8 text-accentRedFg" />
              </div>
              <h2 className="text-xl font-bold text-fg mb-2">Dashboard Data Unavailable</h2>
              <p className="text-muted text-sm leading-relaxed mb-5">{dataLoadError}</p>
              <button
                type="button"
                onClick={onRetryData}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primaryHover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          ) : !selectedStudent ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto py-16">
              <div className="w-20 h-20 bg-white border border-border rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <LayoutDashboard className="w-10 h-10 text-muted" />
              </div>
              <h2 className="text-2xl font-bold text-fg mb-3">No Student Selected</h2>
              <p className="text-muted text-sm leading-relaxed mb-6">
                {userRole === 'admin'
                  ? 'Select an enrolled student from the top menu, or upload a tracker Excel sheet to populate performance analytics.'
                  : userRole === 'volunteer'
                    ? 'Select a student from the menu to inspect their analytics.'
                    : 'Please wait for the teacher to publish assessment performance or select your name.'}
              </p>
              {userRole === 'admin' && onUploadTracker && (
                <button
                  type="button"
                  onClick={onUploadTracker}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primaryHover transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
                >
                  <Upload className="w-4 h-4" />
                  <span>{trackerFile ? 'Update Tracker (Excel)' : 'Upload Excel Tracker'}</span>
                </button>
              )}
            </div>
          ) : !stats ? (
            <div className="flex-1 flex items-center justify-center py-16 text-muted font-medium">
              No assessment records found for this student and report mode.
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
              {/* 5-Card Metrics Family — Bespoke Executive Metric Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4">
                {/* 1. Total Score */}
                <motion.button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label="Open total score details"
                  variants={itemVariants}
                  className="bg-white border border-slate-200/90 hover:border-blue-400/80 rounded-2xl p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative overflow-hidden active:scale-[0.98] min-h-[142px] sm:min-h-[148px] touch-manipulation select-none"
                  onClick={() => handleSetExpandedCard('total')}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted truncate">
                        Total Score
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                  </div>

                  <div className="my-1">
                    <div className="flex items-baseline gap-1.5">
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-fg font-mono tracking-tight tabular-nums">
                        <AnimatedNumber value={stats.total} />
                      </h3>
                      <span className="text-xs font-semibold text-muted">pts</span>
                    </div>
                  </div>

                  <div className="flex items-center pt-1 border-t border-slate-100">
                    {reportType === 'both' && stats.growth !== null ? (
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono border truncate tabular-nums',
                        stats.growth >= 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                          : 'bg-rose-50 text-rose-700 border-rose-200/70'
                      )}>
                        {stats.growth >= 0 ? `+${stats.growth}` : stats.growth} growth
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200/70 truncate">
                        {Math.round(stats.total / (stats.subjectRankings?.length || 1))} pts avg / domain
                      </span>
                    )}
                  </div>
                </motion.button>

                {/* 2. Attendance Streak */}
                <motion.button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label="Open attendance streak details"
                  variants={itemVariants}
                  className="bg-white border border-slate-200/90 hover:border-amber-400/80 rounded-2xl p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative overflow-hidden active:scale-[0.98] min-h-[142px] sm:min-h-[148px] touch-manipulation select-none"
                  onClick={() => handleSetExpandedCard('streak')}
                >
                  <div className="flex items-center justify-between gap-1 mb-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                        <Flame className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted truncate">
                        Streak
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                  </div>

                  <div className="my-1 relative z-10">
                    <div className="flex items-baseline gap-1.5">
                      <h3 className={cn('text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums', studentStreak === 0 ? 'text-fg' : '')} style={studentStreak > 0 ? { color: streakCardColor } : {}}>
                        <AnimatedNumber value={studentStreak} />
                      </h3>
                      <span className="text-xs font-semibold text-muted">
                        {studentStreak === 1 ? 'Day' : 'Days'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center pt-1 border-t border-slate-100 relative z-10">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border truncate',
                      studentStreak > 0
                        ? 'bg-amber-50 text-amber-700 border-amber-200/70'
                        : 'bg-slate-50 text-slate-600 border-slate-200/70'
                    )}>
                      {studentStreak > 0 ? 'Active Streak 🔥' : 'No streak logged'}
                    </span>
                  </div>

                  {/* Refined subtle flame accent */}
                  <div className={cn(
                    'absolute right-1 bottom-1 w-12 h-12 pointer-events-none transition-opacity',
                    studentStreak === 0 ? 'grayscale opacity-5' : 'opacity-25 group-hover:opacity-40'
                  )}>
                    <LottieFire style={studentStreak > 0 ? { filter: streakCardFilter, width: '100%', height: '100%' } : { width: '100%', height: '100%' }} />
                  </div>
                </motion.button>

                {/* 3. Cohort Rank */}
                <motion.button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label="Open cohort rank details"
                  variants={itemVariants}
                  className="bg-white border border-slate-200/90 hover:border-indigo-400/80 rounded-2xl p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative overflow-hidden active:scale-[0.98] min-h-[142px] sm:min-h-[148px] touch-manipulation select-none"
                  onClick={() => handleSetExpandedCard('rank')}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted truncate">
                        Cohort Rank
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                  </div>

                  <div className="my-1">
                    <div className="flex items-baseline gap-1.5">
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-fg font-mono tracking-tight tabular-nums">
                        #<AnimatedNumber value={stats.rank} />
                      </h3>
                      <span className="text-xs font-semibold text-muted">of {stats.totalStudents}</span>
                    </div>
                  </div>

                  <div className="flex items-center pt-1 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 truncate">
                      {100 - cohortPercentile < 10 ? 'Top 10% Standing' : `Top ${cohortPercentile}% Standing`}
                    </span>
                  </div>
                </motion.button>

                {/* 4. Strongest Domain */}
                <motion.button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label="Open top performer details"
                  variants={itemVariants}
                  className="bg-white border border-slate-200/90 hover:border-emerald-400/80 rounded-2xl p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative overflow-hidden active:scale-[0.98] min-h-[142px] sm:min-h-[148px] touch-manipulation select-none"
                  onClick={() => handleSetExpandedCard('top')}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                        <Target className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted truncate">
                        Top Domain
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                  </div>

                  <div className="my-1">
                    <h3 className="text-base sm:text-lg font-bold text-fg tracking-tight truncate" title={stats.strongest.name}>
                      {stats.strongest.name}
                    </h3>
                  </div>

                  <div className="flex items-center pt-1 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/70 truncate tabular-nums">
                      {stats.strongest.score} pts ({stats.strongest.diff >= 0 ? `+${stats.strongest.diff}` : stats.strongest.diff} vs avg)
                    </span>
                  </div>
                </motion.button>

                {/* 5. Priority Focus - Spans 2 columns on mobile */}
                <motion.button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label="Open priority focus details"
                  variants={itemVariants}
                  className="col-span-2 xl:col-span-1 bg-white border border-slate-200/90 hover:border-amber-400/80 rounded-2xl p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative overflow-hidden active:scale-[0.98] min-h-[142px] sm:min-h-[148px] touch-manipulation select-none"
                  onClick={() => handleSetExpandedCard('priority')}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted">
                        Priority Focus
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                  </div>

                  {/* Mobile/tablet row layout when spanning 2 columns */}
                  <div className="flex xl:hidden items-center justify-between gap-2 my-1">
                    <h3 className="text-base sm:text-lg font-bold text-fg tracking-tight truncate" title={stats.weaknesses[0]?.name || 'N/A'}>
                      {stats.weaknesses[0]?.name || 'N/A'}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200/70 shrink-0 tabular-nums">
                      {stats.weaknesses[0]?.score || 0} pts ({Math.abs(stats.weaknesses[0]?.diff || 0)} pts deficit)
                    </span>
                  </div>

                  {/* Desktop layout when in 5-column grid */}
                  <div className="hidden xl:block my-1">
                    <h3 className="text-base sm:text-lg font-bold text-fg tracking-tight truncate" title={stats.weaknesses[0]?.name || 'N/A'}>
                      {stats.weaknesses[0]?.name || 'N/A'}
                    </h3>
                  </div>

                  <div className="hidden xl:flex items-center pt-1 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200/70 truncate tabular-nums">
                      {stats.weaknesses[0]?.score || 0} pts ({Math.abs(stats.weaknesses[0]?.diff || 0)} pts deficit)
                    </span>
                  </div>
                </motion.button>
              </div>

              {/* Charts Section — Bespoke Visual Data Visualization */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                {/* 1. Bar Chart: Performance vs Cohort Benchmark */}
                <motion.div variants={itemVariants} className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col">
                  {/* Chart Header with Integrated Metrics & Legend */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-extrabold text-fg tracking-tight">
                        {stats.preVsPostData ? 'Pre-Test vs Post-Test Growth' : 'Performance vs Cohort Average'}
                      </h3>
                      <p className="text-xs text-muted mt-0.5">
                        {stats.preVsPostData ? 'Point changes across all 11 subject areas' : 'Subject scores compared with the class cohort average'}
                      </p>
                    </div>

                    {/* Integrated Legend & Metric Callout */}
                    <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                      {averageGrowth && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70 tabular-nums">
                          Avg: +{averageGrowth.pts} pts
                        </span>
                      )}
                      {benchmarkSummary && !stats.preVsPostData && (
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 rounded-md border tabular-nums',
                          benchmarkSummary.isAbove ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70' : 'bg-amber-50 text-amber-700 border-amber-200/70'
                        )}>
                          Avg: {benchmarkSummary.isAbove ? `+${benchmarkSummary.pts}` : `-${benchmarkSummary.pts}`} pts
                        </span>
                      )}

                      <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-slate-400" />
                          <span className="text-slate-600 font-medium text-[11px]">
                            {stats.preVsPostData ? 'Baseline' : 'Cohort'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                          <span className="text-slate-900 font-bold text-[11px]">
                            {stats.preVsPostData ? 'Post-Test' : 'Student'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BarChart Container */}
                  <div className="h-[270px] sm:h-[310px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.preVsPostData || stats.vsCohortData}
                        margin={{ top: 10, right: 10, left: -24, bottom: 25 }}
                      >
                        <defs>
                          <linearGradient id="barGradPost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                            <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.92} />
                          </linearGradient>
                          <linearGradient id="barGradPre" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#CBD5E1" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#94A3B8" stopOpacity={0.85} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#F1F5F9" vertical={false} />
                        <XAxis
                          dataKey="subject"
                          tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                          interval={0}
                          angle={-32}
                          textAnchor="end"
                          height={54}
                          dy={6}
                          dx={-2}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                        {stats.preVsPostData ? (
                          <>
                            <Bar dataKey="pre" name="Pre-Test Baseline" fill="url(#barGradPre)" radius={[5, 5, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="post" name="Post-Test Final" fill="url(#barGradPost)" radius={[5, 5, 0, 0]} maxBarSize={26} />
                          </>
                        ) : (
                          <>
                            <Bar dataKey="cohort" name="Cohort Average" fill="url(#barGradPre)" radius={[5, 5, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="student" name={selectedStudent || 'Student'} fill="url(#barGradPost)" radius={[5, 5, 0, 0]} maxBarSize={26} />
                          </>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* 2. Radar Chart: Domain Mastery Profile */}
                <motion.div variants={itemVariants} className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between mb-2 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-extrabold text-fg tracking-tight">Domain Breakdown</h3>
                      <p className="text-xs text-muted mt-0.5">Score balance across 11 subject areas</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                        11 Domains
                      </span>
                    </div>
                  </div>

                  {/* Clean Legend Subheader */}
                  <div className="flex items-center justify-between text-xs px-1 mb-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        <span className="text-fg font-bold text-[11px]">{selectedStudent || 'Student'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                        <span className="text-muted font-medium text-[11px]">Cohort Avg</span>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted">
                      <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Math</span>
                      <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Sci</span>
                      <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" />Hum</span>
                    </div>
                  </div>

                  {/* RadarChart Container with Safe Padding & Unclipped Labels */}
                  <div className="h-[250px] sm:h-[285px] w-full flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="46%"
                        margin={{ top: 8, right: 18, bottom: 8, left: 18 }}
                        data={stats.radarData}
                      >
                        <defs>
                          <radialGradient id="radarStudentGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#2563EB" stopOpacity={0.12} />
                          </radialGradient>
                        </defs>
                        <PolarGrid stroke="#E2E8F0" strokeDasharray="2 2" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={renderCustomRadarTick}
                        />
                        <Radar
                          name={selectedStudent || 'Student'}
                          dataKey="score"
                          stroke="#2563EB"
                          strokeWidth={2.5}
                          fill="url(#radarStudentGrad)"
                          dot={{ r: 3, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                        />
                        <Radar
                          name="Cohort Avg"
                          dataKey="cohort"
                          stroke="#94A3B8"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          fill="#94A3B8"
                          fillOpacity={0.04}
                          dot={{ r: 2.5, fill: '#94A3B8' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              {/* Subject rankings table with domain filter */}
              <motion.div variants={itemVariants} className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                  <div>
                    <h3 className="text-base font-extrabold text-fg tracking-tight">Subject Performance Breakdown</h3>
                    <p className="text-xs text-muted mt-0.5">Detailed domain scores, cohort benchmarks, and gap analysis</p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
                    {[
                      { id: 'all', label: 'All (11)' },
                      { id: 'math', label: 'Math (5)' },
                      { id: 'science', label: 'Science (4)' },
                      { id: 'humanities', label: 'Humanities (2)' },
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setDomainFilter(f.id)}
                        className={cn(
                          'px-3 py-1 text-xs font-semibold rounded-lg transition-all',
                          domainFilter === f.id
                            ? 'bg-white text-primary font-bold shadow-xs border border-border/40'
                            : 'text-muted hover:text-fg'
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-border/70">
                        <th className="px-5 py-3 text-[11px] font-bold text-muted uppercase tracking-wider w-12 text-center">#</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-muted uppercase tracking-wider">Subject & Domain</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-muted uppercase tracking-wider w-64">Diagnostic Score & Benchmark</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-muted uppercase tracking-wider text-center w-28">Cohort Avg</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-muted uppercase tracking-wider w-36">Benchmark Gap</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-muted uppercase tracking-wider text-right w-44">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 bg-white">
                      {filteredRankings.map((subj, idx) => {
                        const domain = MATH_SUBJ.includes(subj.name) ? 'Math' : SCI_SUBJ.includes(subj.name) ? 'Science' : 'Humanities';

                        const domainColor = domain === 'Math'
                          ? 'bg-blue-50 text-blue-700 border-blue-200/70'
                          : domain === 'Science'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                            : 'bg-purple-50 text-purple-700 border-purple-200/70';

                        const maxScale = Math.max(100, ...filteredRankings.map(s => Math.max(s.score, s.cohortAvg)));
                        const scorePercent = Math.min(100, Math.round((subj.score / maxScale) * 100));
                        const cohortPercent = Math.min(100, Math.round((subj.cohortAvg / maxScale) * 100));

                        return (
                          <tr key={subj.name} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-5 py-3.5 text-center">
                              <span className="font-mono text-xs font-semibold text-muted/70">{idx + 1}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <span className="font-bold text-sm text-fg tracking-tight">{subj.name}</span>
                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border', domainColor)}>
                                  {domain}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-extrabold text-sm text-fg w-8 tabular-nums">{subj.score}</span>
                                <div className="flex-1 max-w-[150px] bg-slate-100 rounded-full h-2 relative overflow-visible flex items-center">
                                  <div
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${scorePercent}%` }}
                                  />
                                  {/* Cohort average vertical tick mark */}
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-slate-500 rounded-full shadow-xs pointer-events-none"
                                    style={{ left: `${cohortPercent}%` }}
                                    title={`Cohort Avg: ${subj.cohortAvg} pts`}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="font-mono font-semibold text-sm text-slate-600 tabular-nums">
                                {subj.cohortAvg} pts
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={cn(
                                'inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded border tabular-nums',
                                subj.diff >= 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                                  : 'bg-rose-50 text-rose-700 border-rose-200/70'
                              )}>
                                {subj.diff >= 0 ? `+${subj.diff}` : subj.diff} pts
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              {subj.diff >= 0 ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Above Benchmark
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Needs Attention
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="block md:hidden divide-y divide-border/60 bg-white">
                  {filteredRankings.map((subj, idx) => {
                    const domain = MATH_SUBJ.includes(subj.name) ? 'Math' : SCI_SUBJ.includes(subj.name) ? 'Science' : 'Humanities';
                    const domainColor = domain === 'Math' ? 'bg-blue-50 text-blue-700 border-blue-200/60' : domain === 'Science' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-purple-50 text-purple-700 border-purple-200/60';

                    return (
                      <div key={subj.name} className="p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-mono font-bold text-muted">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-fg text-sm">{subj.name}</span>
                            <span className={cn('text-[9px] font-bold px-1.5 py-0.2 rounded border', domainColor)}>
                              {domain}
                            </span>
                          </div>
                          {subj.diff >= 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <TrendingUp className="w-3 h-3 text-emerald-600" /> Above
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Below
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center border border-slate-200/60">
                          <div>
                            <p className="text-[10px] text-muted font-bold uppercase mb-0.5">Score</p>
                            <p className="font-mono font-bold text-fg text-sm tabular-nums">{subj.score}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted font-bold uppercase mb-0.5">Cohort Avg</p>
                            <p className="font-mono font-medium text-muted text-sm tabular-nums">{subj.cohortAvg}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted font-bold uppercase mb-0.5">Gap</p>
                            <p className={cn('font-mono font-bold text-sm tabular-nums', subj.diff >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                              {subj.diff >= 0 ? `+${subj.diff}` : subj.diff}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </PageShell>
    </>
  );
}
