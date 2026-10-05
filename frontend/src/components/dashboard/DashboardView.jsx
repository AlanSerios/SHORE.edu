import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Loader2, LayoutDashboard, TrendingUp, Trophy, Target,
  AlertTriangle, Flame, RefreshCw, X, Upload, GraduationCap, ChevronDown,
  ArrowUpRight
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../../utils';
import { AnimatedNumber, CustomTooltip } from './DashboardPrimitives';
import { LottieFire, getStreakTheme, StreakModalContent } from './StreakModal';
import { TotalScoreContent, CohortRankContent, TopPerformerContent, PriorityFocusContent } from './ExpandedCardPanels';
import { MATH_SUBJ, SCI_SUBJ } from '../../utils/analytics';

const REPORT_TYPES = [
  { id: 'pre', label: 'Pre-Test Only', shortLabel: 'Pre-Test' },
  { id: 'post', label: 'Post-Test Only', shortLabel: 'Post-Test' },
  { id: 'both', label: 'Progress Report', shortLabel: 'Progress' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
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
                      <h2 id="expanded-card-title" className="text-lg font-extrabold text-fg">
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
      <div id="dashboard-scroll-viewport" className="flex-1 min-h-0 overflow-y-auto pb-28 md:pb-12">
        {/* Top Header */}
        <header className="px-3 sm:px-6 md:px-8 pb-2 pt-4 sm:pt-6 sm:pb-3 max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-end justify-between gap-1 sm:gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-fg">Dashboard</h1>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted">
              Performance analytics & progress report for <span className="font-semibold text-fg">{selectedStudent || 'selected student'}</span>
            </p>
          </div>
        </header>

        {/* Control Toolbar */}
        {students.length > 0 && (
          <div className="bg-card/85 backdrop-blur-md border-y border-border px-3 sm:px-6 md:px-8 py-2 sm:py-2.5 sm:sticky sm:top-0 z-20 shadow-xs mb-3 sm:mb-4">
            <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2 sm:gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                {/* Student selector */}
                {userRole === 'admin' || userRole === 'volunteer' ? (
                  <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                      <GraduationCap className="w-4 h-4 text-primary" />
                    </div>
                    <select
                      value={selectedStudent}
                      onChange={e => setSelectedStudent(e.target.value)}
                      aria-label="Select student for analytics"
                      className="appearance-none w-full bg-white border border-border hover:border-borderHover rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm font-semibold text-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                    >
                      <option value="" disabled>Select Student ({students.length})</option>
                      {students.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                  </div>
                ) : (
                  <div className="bg-white border border-border rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-primary text-center shadow-sm flex items-center justify-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    <span>{userName || selectedStudent}</span>
                  </div>
                )}

                {/* Segmented report switcher */}
                <div className="grid grid-cols-3 bg-slate-100/90 p-1 rounded-xl border border-border/60 shadow-inner w-full sm:w-auto">
                  {REPORT_TYPES.map(type => {
                    const isActive = reportType === type.id;
                    return (
                      <button
                        type="button"
                        key={type.id}
                        onClick={() => setReportType(type.id)}
                        className={cn(
                          'relative px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-colors text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          isActive ? 'text-primary' : 'text-muted hover:text-fg'
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="reportTypePill"
                            className="absolute inset-0 bg-white rounded-lg shadow-sm border border-border/40"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          />
                        )}
                        <span className="relative z-10 hidden sm:inline">{type.label}</span>
                        <span className="relative z-10 sm:hidden">{type.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!selectedStudent || isGenerating}
                  aria-label="Export student performance report as PDF"
                  className="flex-1 xl:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-border px-3 py-2 text-xs font-bold text-fg shadow-sm transition-all hover:bg-slate-50 hover:border-primary/40 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] shrink-0"
                >
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Download className="w-3.5 h-3.5 text-primary" />}
                  <span>Export PDF</span>
                </button>

                {userRole === 'admin' && onUploadTracker && (
                  <button
                    type="button"
                    onClick={onUploadTracker}
                    aria-label="Upload or update tracker spreadsheet"
                    className="flex-1 xl:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-border px-3 py-2 text-xs font-bold text-fg shadow-sm transition-all hover:bg-slate-50 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span className="hidden sm:inline">{trackerFile ? 'Update Tracker' : 'Upload Tracker'}</span>
                    <span className="sm:hidden">Tracker</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 flex flex-col min-h-full space-y-4 sm:space-y-6">
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
              <div className="w-20 h-20 bg-card border border-border rounded-3xl flex items-center justify-center mb-6 shadow-sm">
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
              {/* 5-Card Metrics Family */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4">
                {/* 1. Total Score */}
                <motion.button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label="Open total score details"
                  variants={itemVariants}
                  className="bg-white border border-border/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all text-left flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative overflow-hidden active:scale-[0.99] min-h-0 sm:min-h-[142px]"
                  onClick={() => handleSetExpandedCard('total')}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted truncate">
                        Total Score
                      </span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted/40 group-hover:text-primary shrink-0 transition-transform" />
                  </div>

                  <div className="my-1 sm:my-auto sm:py-1">
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                        <AnimatedNumber value={stats.total} />
                      </h3>
                      <span className="text-xs font-semibold text-muted">pts</span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    {reportType === 'both' && stats.growth !== null ? (
                      <span className={cn(
                        'inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold border truncate',
                        stats.growth >= 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                          : 'bg-red-50 text-red-700 border-red-200/70'
                      )}>
                        {stats.growth >= 0 ? `+${stats.growth}` : stats.growth} growth
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200/70 truncate">
                        {Math.round(stats.total / (stats.subjectRankings?.length || 1))} pts avg
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
                  className="bg-white border border-border/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all text-left flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative overflow-hidden active:scale-[0.99] min-h-0 sm:min-h-[142px]"
                  onClick={() => handleSetExpandedCard('streak')}
                >
                  <div className="flex items-center justify-between gap-1 mb-1 relative z-10">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted truncate">
                        Streak
                      </span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted/40 group-hover:text-primary shrink-0 transition-transform" />
                  </div>

                  <div className="my-1 sm:my-auto sm:py-1 relative z-10">
                    <div className="flex items-baseline gap-1">
                      <h3 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', studentStreak === 0 ? 'text-fg' : '')} style={studentStreak > 0 ? { color: streakCardColor } : {}}>
                        <AnimatedNumber value={studentStreak} />
                      </h3>
                      <span className="text-xs font-semibold text-muted">
                        {studentStreak === 1 ? 'Day' : 'Days'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center relative z-10">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold border truncate',
                      studentStreak > 0
                        ? 'bg-amber-50 text-amber-700 border-amber-200/70'
                        : 'bg-slate-50 text-slate-600 border-slate-200/70'
                    )}>
                      {studentStreak > 0 ? 'Active 🔥' : 'No streak'}
                    </span>
                  </div>

                  {/* Animated Lottie Fire Watermark */}
                  <div className={cn(
                    'absolute right-0 bottom-0 w-14 h-14 sm:w-20 sm:h-20 translate-y-1 translate-x-1 pointer-events-none transition-opacity',
                    studentStreak === 0 ? 'grayscale opacity-10' : 'opacity-40 group-hover:opacity-60'
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
                  className="bg-white border border-border/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all text-left flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative overflow-hidden active:scale-[0.99] min-h-0 sm:min-h-[142px]"
                  onClick={() => handleSetExpandedCard('rank')}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted truncate">
                        Cohort Rank
                      </span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted/40 group-hover:text-primary shrink-0 transition-transform" />
                  </div>

                  <div className="my-1 sm:my-auto sm:py-1">
                    <div className="flex items-baseline gap-1">
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                        #<AnimatedNumber value={stats.rank} />
                      </h3>
                      <span className="text-xs font-semibold text-muted">of {stats.totalStudents}</span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 truncate">
                      {100 - cohortPercentile < 10 ? 'Top 10%' : `Top ${cohortPercentile}%`}
                    </span>
                  </div>
                </motion.button>

                {/* 4. Strongest Domain */}
                <motion.button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label="Open top performer details"
                  variants={itemVariants}
                  className="bg-white border border-border/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all text-left flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative overflow-hidden active:scale-[0.99] min-h-0 sm:min-h-[142px]"
                  onClick={() => handleSetExpandedCard('top')}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted truncate">
                        Top Subject
                      </span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted/40 group-hover:text-primary shrink-0 transition-transform" />
                  </div>

                  <div className="my-1 sm:my-auto sm:py-1">
                    <h3 className="text-base sm:text-xl font-extrabold text-fg tracking-tight truncate" title={stats.strongest.name}>
                      {stats.strongest.name}
                    </h3>
                  </div>

                  <div className="flex items-center">
                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 truncate">
                      {stats.strongest.score} pts ({stats.strongest.diff >= 0 ? `+${stats.strongest.diff}` : stats.strongest.diff})
                    </span>
                  </div>
                </motion.button>

                {/* 5. Priority Focus - Spans 2 columns on mobile */}
                <motion.button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label="Open priority focus details"
                  variants={itemVariants}
                  className="col-span-2 xl:col-span-1 bg-white border border-border/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all text-left flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative overflow-hidden active:scale-[0.99] min-h-0 sm:min-h-[142px]"
                  onClick={() => handleSetExpandedCard('priority')}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted">
                        Priority Review
                      </span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted/40 group-hover:text-primary shrink-0 transition-transform" />
                  </div>

                  {/* Mobile/tablet row layout when spanning 2 columns */}
                  <div className="flex xl:hidden items-center justify-between gap-2 my-1">
                    <h3 className="text-base sm:text-lg font-extrabold text-fg tracking-tight truncate" title={stats.weaknesses[0]?.name || 'N/A'}>
                      {stats.weaknesses[0]?.name || 'N/A'}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/70 shrink-0">
                      {stats.weaknesses[0]?.score || 0} pts ({Math.abs(stats.weaknesses[0]?.diff || 0)} pts deficit)
                    </span>
                  </div>

                  {/* Desktop layout when in 5-column grid */}
                  <div className="hidden xl:block my-auto py-1">
                    <h3 className="text-xl font-extrabold text-fg tracking-tight truncate" title={stats.weaknesses[0]?.name || 'N/A'}>
                      {stats.weaknesses[0]?.name || 'N/A'}
                    </h3>
                  </div>

                  <div className="hidden xl:flex items-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/70 truncate">
                      {stats.weaknesses[0]?.score || 0} pts ({Math.abs(stats.weaknesses[0]?.diff || 0)} pts deficit)
                    </span>
                  </div>
                </motion.button>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Performance vs Cohort Benchmark */}
                <motion.div variants={itemVariants} className="lg:col-span-7 bg-white border border-border/80 rounded-2xl p-6 shadow-sm flex flex-col">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-fg">
                        {stats.preVsPostData ? 'Pre-Test vs Post-Test Growth' : 'Performance vs Cohort Benchmark'}
                      </h3>
                      <p className="text-xs text-muted mt-0.5">
                        {stats.preVsPostData ? 'Comparing individual progress across all 11 subject areas' : 'Individual domain performance compared against class cohort average'}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-muted bg-canvas border border-border/60 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                      Score (pts)
                    </span>
                  </div>

                  <div className="h-[330px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.preVsPostData || stats.vsCohortData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 45 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                          dataKey="subject"
                          tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                          interval={0}
                          angle={-28}
                          textAnchor="end"
                          height={50}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                        <Legend
                          iconType="circle"
                          wrapperStyle={{ fontSize: '12px', color: '#0F172A', paddingTop: '10px' }}
                        />
                        {stats.preVsPostData ? (
                          <>
                            <Bar dataKey="pre" name="Pre-Test Baseline" fill="#94A3B8" radius={[5, 5, 0, 0]} maxBarSize={32} />
                            <Bar dataKey="post" name="Post-Test Final" fill="#2563EB" radius={[5, 5, 0, 0]} maxBarSize={32} />
                          </>
                        ) : (
                          <>
                            <Bar dataKey="cohort" name="Cohort Average" fill="#94A3B8" radius={[5, 5, 0, 0]} maxBarSize={32} />
                            <Bar dataKey="student" name={selectedStudent || 'Student'} fill="#2563EB" radius={[5, 5, 0, 0]} maxBarSize={32} />
                          </>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Domain Mastery Profile Radar Chart */}
                <motion.div variants={itemVariants} className="lg:col-span-5 bg-white border border-border/80 rounded-2xl p-6 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-base font-bold text-fg">Domain Mastery Profile</h3>
                      <p className="text-xs text-muted mt-0.5">Holistic academic balance map</p>
                    </div>
                    <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                      11 Domains
                    </span>
                  </div>

                  <div className="h-[330px] w-full flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="68%" data={stats.radarData}>
                        <PolarGrid stroke="#E2E8F0" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: '#475569', fontSize: 10.5, fontWeight: 500 }}
                        />
                        <Radar
                          name={selectedStudent || 'Student'}
                          dataKey="score"
                          stroke="#2563EB"
                          strokeWidth={2.5}
                          fill="#2563EB"
                          fillOpacity={0.16}
                        />
                        <Radar
                          name="Cohort Avg"
                          dataKey="cohort"
                          stroke="#94A3B8"
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                          fill="#94A3B8"
                          fillOpacity={0.06}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#0F172A', paddingTop: '6px' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              {/* Subject rankings table with domain filter */}
              <motion.div variants={itemVariants} className="bg-white border border-border/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                  <div>
                    <h3 className="text-base font-bold text-fg">Subject Performance Breakdown</h3>
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
                          'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                          domainFilter === f.id
                            ? 'bg-white text-primary font-bold shadow-sm border border-border/40'
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
                      <tr className="bg-canvas/50 border-b border-border/60">
                        <th className="px-6 py-3.5 text-[11px] font-bold text-muted uppercase tracking-wider w-16">#</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-muted uppercase tracking-wider">Subject & Domain</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-muted uppercase tracking-wider w-56">Student Score</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-muted uppercase tracking-wider">Cohort Avg</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-muted uppercase tracking-wider">Benchmark Gap</th>
                        <th className="px-6 py-3.5 text-[11px] font-bold text-muted uppercase tracking-wider text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 bg-white">
                      {filteredRankings.map((subj, idx) => {
                        const domain = MATH_SUBJ.includes(subj.name) ? 'Math' : SCI_SUBJ.includes(subj.name) ? 'Science' : 'Humanities';
                        const domainColor = domain === 'Math' ? 'bg-blue-50 text-blue-700 border-blue-200/60' : domain === 'Science' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-purple-50 text-purple-700 border-purple-200/60';
                        const scorePercent = Math.min(100, Math.round((subj.score / 50) * 100));

                        return (
                          <tr key={subj.name} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-muted">{idx + 1}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2.5">
                                <span className="font-bold text-sm text-fg">{subj.name}</span>
                                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', domainColor)}>
                                  {domain}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="font-extrabold text-sm text-fg w-8">{subj.score}</span>
                                <div className="flex-1 max-w-[130px] bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-primary h-full rounded-full transition-all duration-500"
                                    style={{ width: `${scorePercent}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-sm text-muted">
                              {subj.cohortAvg} pts
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn('text-sm font-extrabold', subj.diff >= 0 ? 'text-accentGreenFg' : 'text-accentRedFg')}>
                                {subj.diff >= 0 ? `+${subj.diff}` : subj.diff} pts
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {subj.diff >= 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-accentGreen text-accentGreenFg border border-green-200/60">
                                  <TrendingUp className="w-3 h-3" /> Above Benchmark
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                                  <AlertTriangle className="w-3 h-3" /> Needs Attention
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
                            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-muted">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-fg text-sm">{subj.name}</span>
                            <span className={cn('text-[9px] font-bold px-1.5 py-0.2 rounded border', domainColor)}>
                              {domain}
                            </span>
                          </div>
                          {subj.diff >= 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-accentGreen text-accentGreenFg border border-green-200/60">
                              <TrendingUp className="w-3 h-3" /> Above
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                              <AlertTriangle className="w-3 h-3" /> Below
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 bg-canvas p-2.5 rounded-xl text-center border border-border/40">
                          <div>
                            <p className="text-[10px] text-muted font-bold uppercase mb-0.5">Score</p>
                            <p className="font-bold text-fg text-sm">{subj.score}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted font-bold uppercase mb-0.5">Cohort Avg</p>
                            <p className="font-medium text-muted text-sm">{subj.cohortAvg}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted font-bold uppercase mb-0.5">Gap</p>
                            <p className={cn('font-bold text-sm', subj.diff >= 0 ? 'text-accentGreenFg' : 'text-accentRedFg')}>
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
      </div>
    </>
  );
}
