import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, AlertTriangle, Target, Medal, Star, Award, BookOpen, Brain, FlaskConical } from 'lucide-react';
import { cn } from '../utils';

const ALL_SUBJ = ["Arithmetic", "Algebra", "Geometry", "Calculus", "Trigonometry", "Logic", "Chemistry", "Biology", "Earth Science", "Physics", "English"];
const MATH_SUBJ = ["Arithmetic", "Algebra", "Geometry", "Calculus", "Trigonometry"];
const SCI_SUBJ = ["Chemistry", "Biology", "Earth Science", "Physics"];

const MAX_PER_SUBJ = 100;
const MAX_TOTAL = ALL_SUBJ.length * MAX_PER_SUBJ;
const MAX_MATH = MATH_SUBJ.length * MAX_PER_SUBJ;
const MAX_SCI = SCI_SUBJ.length * MAX_PER_SUBJ;
const MAX_ENG = 100;
const MAX_LOGIC = 100;

export default function ReportsView({ parsedData, students }) {
  const [activeSubjectTab, setActiveSubjectTab] = useState('math');

  const analytics = useMemo(() => {
    if (!students || students.length === 0) return null;

    const pre = parsedData.pre || {};
    const post = parsedData.post || {};
    
    // We prefer post-test data for final awards and rankings, fallback to pre
    const activeData = Object.keys(post).length > 0 ? post : pre;
    if (Object.keys(activeData).length === 0) return null;

    // 1. Leaderboards
    const studentList = Object.keys(activeData).map(name => ({
      name,
      total: activeData[name].total,
      subjects: activeData[name].subjects
    }));

    const topOverall = [...studentList].sort((a, b) => b.total - a.total).slice(0, 10);

    // 2. Growth Leaderboard (only if both pre and post exist)
    let mostImproved = [];
    if (Object.keys(pre).length > 0 && Object.keys(post).length > 0) {
      const growthList = Object.keys(post)
        .filter(name => pre[name])
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
    const subjectAverages = ALL_SUBJ.map(subj => {
      let sum = 0;
      let count = 0;
      Object.values(activeData).forEach(s => {
        if (s.subjects[subj] !== undefined) {
          sum += s.subjects[subj];
          count++;
        }
      });
      return {
        name: subj,
        average: count > 0 ? (sum / count) : 0
      };
    }).sort((a, b) => a.average - b.average);

    const weaknesses = subjectAverages.slice(0, 3); // Bottom 3 subjects

    // 4. Awardees
    const valedictorian = topOverall.length > 0 ? topOverall[0] : null;
    const salutatorian = topOverall.length > 1 ? topOverall[1] : null;

    // Helper to find top N of specific subjects
    const findTopIn = (subjectGroup, topN = 10) => {
      return [...studentList].map(s => {
        const sum = subjectGroup.reduce((acc, curr) => acc + (s.subjects[curr] || 0), 0);
        return { name: s.name, score: sum };
      }).sort((a, b) => b.score - a.score).slice(0, topN);
    };

    const topMath = findTopIn(MATH_SUBJ);
    const topScience = findTopIn(SCI_SUBJ);
    const topEnglish = findTopIn(["English"]);
    const topLogic = findTopIn(["Logic"]);

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

  }, [parsedData, students]);

  if (!analytics) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 h-full p-10">
        <div className="w-20 h-20 bg-card border border-border rounded-3xl flex items-center justify-center mb-6 shadow-sm">
          <Trophy className="w-10 h-10 text-muted" />
        </div>
        <h2 className="text-2xl font-bold text-fg mb-3">No Cohort Data</h2>
        <p className="text-muted text-sm leading-relaxed max-w-md">
          Upload an Excel tracker to view cohort-wide analytics, leaderboards, and awardees.
        </p>
      </div>
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
    <div className="flex-1 overflow-y-auto p-10 bg-canvas">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8 min-h-full">
        
        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-fg tracking-tight">Cohort Analytics</h1>
          <p className="text-muted text-sm mt-1">Analyzing {analytics.totalStudents} students across the entire cohort.</p>
        </div>

        {/* TOP AWARDS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Valedictorian */}
          <motion.div variants={itemVariants} className="bg-primary text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-center">
            <div className="relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shrink-0">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white/80 font-semibold text-sm uppercase tracking-wider mb-1">Valedictorian</p>
                <h3 className="text-3xl font-bold truncate">{analytics.valedictorian?.name || 'N/A'}</h3>
                <p className="text-white/90 text-sm mt-1 font-medium">{analytics.valedictorian?.total || 0} / {MAX_TOTAL} pts</p>
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
                <h3 className="text-3xl font-bold text-fg truncate">{analytics.salutatorian?.name || 'N/A'}</h3>
                <p className="text-fg font-medium text-sm mt-1">{analytics.salutatorian?.total || 0} / {MAX_TOTAL} pts</p>
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
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-0.5">Best in Logic</p>
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
              <h3 className="font-bold text-fg">Cohort Vulnerabilities</h3>
            </div>
            <div className="p-5 flex-1 space-y-4">
              <p className="text-sm text-muted mb-4">
                The cohort is struggling the most with these subjects. Consider allocating more review time here.
              </p>
              {analytics.weaknesses.map((w, idx) => (
                <div key={idx} className="bg-accentRed/50 border border-accentRed rounded-lg p-3 flex justify-between items-center">
                  <span className="font-semibold text-fg text-sm">{w.name}</span>
                  <span className="text-accentRedFg font-bold text-sm">{Math.round(w.average)} pts avg</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top 10 Leaderboard */}
          <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden lg:col-span-1">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <Star className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-fg">Top 10 Overall</h3>
            </div>
            <div className="divide-y divide-border">
              {analytics.topOverall.map((s, idx) => (
                <div key={idx} className="px-5 py-3 flex items-center justify-between hover:bg-canvas/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted w-4 text-center">{idx + 1}</span>
                    <span className="font-semibold text-sm text-fg truncate max-w-[150px]">{s.name}</span>
                  </div>
                  <span className="font-bold text-sm text-primary">{s.total} <span className="text-muted font-medium text-xs">/ {MAX_TOTAL} pts</span></span>
                </div>
              ))}
              {analytics.topOverall.length === 0 && (
                <div className="p-5 text-center text-sm text-muted">No data available</div>
              )}
            </div>
          </motion.div>

          {/* Most Improved Leaderboard */}
          <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden lg:col-span-1">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-accentGreenFg" />
              <h3 className="font-bold text-fg">Most Improved</h3>
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
                <p className="text-sm text-muted">Require both Pre-Test and Post-Test data to calculate growth.</p>
              </div>
            )}
          </motion.div>

        </div>

        {/* SUBJECT LEADERBOARDS */}
        <div>
          <div className="flex items-center justify-between mb-4 mt-8">
            <h3 className="text-xl font-bold text-fg tracking-tight">Subject Leaderboards</h3>
            <div className="flex bg-canvas border border-border rounded-lg p-1 overflow-x-auto">
              {[
                { id: 'math', label: 'Math', icon: Target, colorClass: 'text-primary' },
                { id: 'science', label: 'Science', icon: FlaskConical, colorClass: 'text-accentGreenFg' },
                { id: 'english', label: 'English', icon: BookOpen, colorClass: 'text-accentRedFg' },
                { id: 'logic', label: 'Logic', icon: Brain, colorClass: 'text-muted' },
              ].map(tab => (
                <button
                  key={tab.id}
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
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-bold text-muted w-6 text-center">{idx + 1}</span>
                      <span className="font-semibold text-base text-fg">{s.name}</span>
                    </div>
                    <span className="font-bold text-base text-fg">
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
    </div>
  );
}
