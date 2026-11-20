import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FileSpreadsheet, Loader2, Trophy, TrendingUp, AlertTriangle, Target, Medal, Star, BookOpen, Brain, FlaskConical } from 'lucide-react';
import { cn } from '../utils';
import { ALL_SUBJ, MATH_SUBJ, SCI_SUBJ, ENGLISH_SUBJ, REASONING_SUBJ } from '../utils/analytics';
import { PRETEST_SUBJECT_MAX, PRETEST_TOTAL_ITEMS } from '../utils/assessmentBlueprint';
import { PageHeader, PageShell } from './ui/page';

const MAX_TOTAL = PRETEST_TOTAL_ITEMS;

const MAX_MATH = PRETEST_SUBJECT_MAX.Mathematics;

const MAX_SCI = PRETEST_SUBJECT_MAX.Science;

const MAX_ENG = PRETEST_SUBJECT_MAX['English Proficiency'];

const MAX_LOGIC = PRETEST_SUBJECT_MAX['Abstract Reasoning'];

export default function ReportsView({ parsedData, trackerLoadState, onRetry, onUploadTracker }) {
  const [activeSubjectTab, setActiveSubjectTab] = useState('math');
  const reduceMotion = useReducedMotion();

  const analytics = useMemo(() => {
    const pre = parsedData?.pre || {};
    const post = parsedData?.post || {};
    
    // We prefer post-test data for final awards and rankings, fallback to pre
    const activeData = Object.keys(post).length > 0 ? post : pre;

    if (Object.keys(activeData).length === 0) return null;

    // 1. Leaderboards
    const studentList = Object.keys(activeData).map(name => ({
      name,
      total: activeData[name].total,
      max: activeData[name].totalMax || MAX_TOTAL,
      subjects: activeData[name].subjects || {}
    }));

    const sorted = [...studentList].sort((a, b) => b.total / b.max - a.total / a.max || a.name.localeCompare(b.name));
    let rank = 0;

    const topOverall = sorted.map((student, index) => {
      const previous = sorted[index - 1];

      if (!previous || previous.total / previous.max !== student.total / student.max) rank = index + 1;

      return { ...student, rank };
    }).slice(0, 10);

    // 2. Growth Leaderboard (only if both pre and post exist)
    let mostImproved = [];

    if (Object.keys(pre).length > 0 && Object.keys(post).length > 0) {
      const growthList = Object.keys(post)
        .filter(name => pre[name] && (pre[name].totalMax || MAX_TOTAL) === (post[name].totalMax || MAX_TOTAL))
        .map(name => ({
          name,
          growth: post[name].total - pre[name].total
        }))
        .filter(s => s.growth > 0)
        .sort((a, b) => b.growth - a.growth)
        .slice(0, 10);

      mostImproved = growthList;
    }

    // 3. Class-Wide Weaknesses
    const subjectAverages = ALL_SUBJ.flatMap(subject => {
      const scores = studentList.flatMap(student => student.subjects[subject] == null ? [] : [student.subjects[subject]]);

      return scores.length ? [{ name: subject, average: scores.reduce((sum, score) => sum + score, 0) / scores.length }] : [];
    }).sort((a, b) => a.average - b.average);

    const weaknesses = subjectAverages.slice(0, 3);

    // 4. Awardees
    const valedictorian = topOverall.find(student => student.rank === 1);
    const salutatorian = topOverall.find(student => student.rank === 2);
    const tiedFirst = topOverall[1]?.rank === 1;

    // Helper to find top N of specific subjects
    const findTopIn = (subjectGroup, topN = 10) => {
      return studentList.filter(student => subjectGroup.some(subject => student.subjects[subject] != null)).map(s => {
        const sum = subjectGroup.reduce((acc, curr) => acc + (s.subjects[curr] || 0), 0);

        return { name: s.name, score: sum };
      }).sort((a, b) => b.score - a.score).slice(0, topN);
    };

    const topMath = findTopIn(MATH_SUBJ);
    const topScience = findTopIn(SCI_SUBJ);
    const topEnglish = findTopIn(ENGLISH_SUBJ);
    const topLogic = findTopIn(REASONING_SUBJ);

    const bestMath = topMath.length > 0 ? topMath[0] : null;
    const bestScience = topScience.length > 0 ? topScience[0] : null;
    const bestEnglish = topEnglish.length > 0 ? topEnglish[0] : null;
    const bestLogic = topLogic.length > 0 ? topLogic[0] : null;

    return {
      topOverall,
      mostImproved,
      weaknesses,
      valedictorian,
      salutatorian,
      tiedFirst,
      assessmentLabel: activeData === post ? "Post-test" : "Pre-test",
      bestMath,
      bestScience,
      bestEnglish,
      bestLogic,
      topMath,
      topScience,
      topEnglish,
      topLogic,
      totalStudents: studentList.length
    };

  }, [parsedData]);

  if (!analytics && trackerLoadState !== 'success') {
    const failed = trackerLoadState === 'error';

    return (
      <PageShell width="wide" contentClassName="space-y-5">
        <PageHeader title="Cohort Analytics" />
        <section className="rounded-2xl border border-border bg-card p-6 text-center" role={failed ? 'alert' : 'status'}>
          {failed ? (
            <>
              <p className="text-sm font-semibold text-slate-900">Couldn’t load the pre-test results.</p>
              <button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-lg border border-border px-4 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Try again</button>
            </>
          ) : (
            <p className="inline-flex items-center gap-2 text-sm text-slate-700">
              <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Loading pre-test results…
            </p>
          )}
        </section>
      </PageShell>
    );
  }

  if (!analytics) {
    return (
      <PageShell width="wide" contentClassName="space-y-5">
        <PageHeader title="Cohort Analytics" description="Class results from the current 160-item diagnostic." />
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center sm:py-10" aria-labelledby="empty-report-title">
          <FileSpreadsheet className="mx-auto h-8 w-8 text-blue-700" aria-hidden="true" />
          <h2 id="empty-report-title" className="mt-3 text-lg font-bold text-slate-950">No cohort data yet</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-slate-600">Upload the scored S5 monitoring sheet, or open Saved versions to restore a previous S5 upload.</p>
          {onUploadTracker && (
            <button type="button" onClick={onUploadTracker} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 px-4 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              Import score sheet
            </button>
          )}
        </section>
      </PageShell>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <PageShell width="wide">
      <motion.div variants={containerVariants} initial={reduceMotion ? false : "hidden"} animate="show" className="space-y-6 min-h-full">
        
        {/* HEADER */}
        <PageHeader
          title="Cohort Analytics"
          description={`Performance summary and cohort rankings for ${analytics.totalStudents} students · ${analytics.assessmentLabel} standings`}
        />

        {/* TOP AWARDS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Valedictorian */}
          <motion.div variants={itemVariants} className="bg-primary text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-center">
            <div className="relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shrink-0">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm uppercase tracking-wider mb-1">Valedictorian</p>
                <p className="text-2xl sm:text-3xl font-bold [overflow-wrap:anywhere]">{analytics.valedictorian?.name || 'N/A'}</p>
                <p className="text-white text-sm mt-1 font-medium">{analytics.valedictorian?.total ?? '—'} / {analytics.valedictorian?.max || MAX_TOTAL} pts{analytics.tiedFirst && ' · Tied for first'}</p>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          </motion.div>

          {/* Salutatorian */}
          <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-center">
            <div className="relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 bg-accentBlue rounded-full flex items-center justify-center shrink-0">
                <Medal className="w-7 h-7 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-muted font-semibold text-sm uppercase tracking-wider mb-1">Salutatorian</p>
                <p className="text-2xl sm:text-3xl font-bold text-fg [overflow-wrap:anywhere]">{analytics.salutatorian?.name || (analytics.tiedFirst ? 'First place is tied' : 'Pending')}</p>
                {analytics.salutatorian && <p className="text-fg font-medium text-sm mt-1">{analytics.salutatorian.total} / {analytics.salutatorian.max} pts</p>}
              </div>
            </div>
          </motion.div>
        </div>

        {/* SUBJECT AWARDS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-accentGreen rounded-lg flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5 text-accentGreenFg" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-0.5">Best in Science</p>
              <p className="text-sm font-bold text-fg truncate">{analytics.bestScience?.name || 'N/A'}</p>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-accentBlue rounded-lg flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-0.5">Best in Math</p>
              <p className="text-sm font-bold text-fg truncate">{analytics.bestMath?.name || 'N/A'}</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-accentRed rounded-lg flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-accentRedFg" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-0.5">Best in English</p>
              <p className="text-sm font-bold text-fg truncate">{analytics.bestEnglish?.name || 'N/A'}</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-muted/10 rounded-lg flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-muted" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-0.5">Best in Abstract Reasoning</p>
              <p className="text-sm font-bold text-fg truncate">{analytics.bestLogic?.name || 'N/A'}</p>
            </div>
          </motion.div>
        </div>

        {/* ANALYTICS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Class Weaknesses */}
          <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-accentRedFg" />
              <h2 className="font-bold text-fg">Cohort Vulnerabilities</h2>
            </div>
            <div className="p-5 flex-1 space-y-4">
              <p className="text-sm text-muted mb-4">
                The cohort is struggling the most with these subjects. Consider allocating more review time here.
              </p>
              {analytics.weaknesses.map((w, idx) => (
                <div key={idx} className="bg-accentRed/50 border border-accentRed rounded-lg p-3 flex justify-between items-center">
                  <span className="font-semibold text-fg text-sm">{w.name}</span>
                  <span className="text-accentRedFg font-bold text-sm">{Math.round(w.average)} / {PRETEST_SUBJECT_MAX[w.name]} avg</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top 10 Leaderboard */}
          <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden min-w-0 lg:col-span-1">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <Star className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-fg">Top 10 Overall</h2>
            </div>
            <div className="divide-y divide-border">
              {analytics.topOverall.map(s => (
                <div key={s.name} className="px-5 py-3 flex items-center justify-between hover:bg-canvas/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted w-4 text-center">{s.rank}</span>
                    <span className="font-semibold text-sm text-fg truncate max-w-[150px]">{s.name}</span>
                  </div>
                  <span className="font-bold text-sm text-primary">{s.total} <span className="text-muted font-medium text-xs">/ {s.max} pts</span></span>
                </div>
              ))}
              {analytics.topOverall.length === 0 && (
                <div className="p-5 text-center text-sm text-muted">No data available</div>
              )}
            </div>
          </motion.div>

          {/* Most Improved Leaderboard */}
          <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden min-w-0 lg:col-span-1">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-accentGreenFg" />
              <h2 className="font-bold text-fg">Most Improved</h2>
            </div>
            {analytics.mostImproved.length > 0 ? (
              <div className="divide-y divide-border">
                {analytics.mostImproved.map((s, idx) => (
                  <div key={idx} className="px-5 py-3 flex items-center justify-between hover:bg-canvas/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted w-4 text-center">{idx + 1}</span>
                      <span className="font-semibold text-sm text-fg truncate max-w-[150px]">{s.name}</span>
                    </div>
                    <span className="font-bold text-sm text-accentGreenFg">+{s.growth}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 flex flex-col items-center justify-center text-center h-full">
                <p className="text-sm text-muted">Growth appears after both tests are published.</p>
              </div>
            )}
          </motion.div>

        </div>

        {/* SUBJECT LEADERBOARDS */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 mt-8">
            <h2 className="text-xl font-bold text-fg tracking-tight">Subject Leaderboards</h2>
            <div className="flex bg-canvas border border-border rounded-lg p-1 max-w-full overflow-x-auto">
              {[
                { id: 'math', label: 'Math', icon: Target, colorClass: 'text-primary' },
                { id: 'science', label: 'Science', icon: FlaskConical, colorClass: 'text-accentGreenFg' },
                { id: 'english', label: 'English', icon: BookOpen, colorClass: 'text-accentRedFg' },
                { id: 'logic', label: 'Reasoning', icon: Brain, colorClass: 'text-muted' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={activeSubjectTab === tab.id}
                  onClick={() => setActiveSubjectTab(tab.id)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap",
                    activeSubjectTab === tab.id ? "bg-card shadow-sm text-fg" : "text-muted hover:text-fg"
                  )}
                >
                  <tab.icon className={cn("w-4 h-4", activeSubjectTab === tab.id ? tab.colorClass : "opacity-70")} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {(() => {
                const activeList = 
                  activeSubjectTab === 'math' ? analytics.topMath :
                  activeSubjectTab === 'science' ? analytics.topScience :
                  activeSubjectTab === 'english' ? analytics.topEnglish :
                  analytics.topLogic;

                return activeList.map((s, idx) => (
                  <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-canvas/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-bold text-muted w-6 text-center">{idx + 1}</span>
                      <span className="font-semibold text-base text-fg [overflow-wrap:anywhere]">{s.name}</span>
                    </div>
                    <span className="shrink-0 font-bold text-base text-fg">
                      {s.score} <span className="text-muted font-medium text-sm">/ {
                        activeSubjectTab === 'math' ? MAX_MATH :
                        activeSubjectTab === 'science' ? MAX_SCI :
                        activeSubjectTab === 'english' ? MAX_ENG :
                        MAX_LOGIC
                      } pts</span>
                    </span>
                  </div>
                ));
              })()}
            </div>
          </motion.div>
        </div>

      </motion.div>
    </PageShell>
  );
}
