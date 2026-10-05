import React from 'react';
import { Award, AlertTriangle, Target, Zap } from 'lucide-react';
import { AnimatedNumber } from './DashboardPrimitives';
import { cn } from '../../utils';
import { MATH_SUBJ, SCI_SUBJ } from '../../utils/analytics';

/**
 * Total Score & Subject Breakdown Modal
 * Replaces fake spline AreaChart with a clean, high-density academic score benchmark list.
 */
export function TotalScoreContent({ stats }) {
  const { total, growth, subjectRankings = [], mostImproved } = stats;
  const aboveAvgCount = subjectRankings.filter(s => s.diff >= 0).length;
  const totalSubj = subjectRankings.length || 1;
  const avgScore = Math.round(total / totalSubj);

  return (
    <div className="p-5 sm:p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
      {/* Executive Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-canvas border border-border/80 rounded-xl p-3">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Total Score</p>
          <h4 className="text-xl font-extrabold text-fg">
            <AnimatedNumber value={total} /> <span className="text-xs font-normal text-muted">pts</span>
          </h4>
        </div>
        <div className="bg-canvas border border-border/80 rounded-xl p-3">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Net Growth</p>
          <h4 className="text-xl font-extrabold text-accentGreenFg">
            {growth !== null ? (growth >= 0 ? `+${growth}` : `${growth}`) : '—'}
          </h4>
        </div>
        <div className="bg-canvas border border-border/80 rounded-xl p-3">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Subject Mean</p>
          <h4 className="text-xl font-extrabold text-fg">
            {avgScore} <span className="text-xs font-normal text-muted">pts</span>
          </h4>
        </div>
        <div className="bg-canvas border border-border/80 rounded-xl p-3">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Above Benchmark</p>
          <h4 className="text-xl font-extrabold text-primary">
            {aboveAvgCount} <span className="text-xs font-normal text-muted">/ {totalSubj}</span>
          </h4>
        </div>
      </div>

      {/* Most Improved Callout (if active) */}
      {mostImproved && mostImproved.diff > 0 && (
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-sm">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-950">
              Highest Growth: {mostImproved.name}
            </p>
            <p className="text-[11px] text-emerald-700">
              Gained +{mostImproved.diff} points compared to the pre-test diagnostic baseline.
            </p>
          </div>
        </div>
      )}

      {/* Subject by Subject Performance Table */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
            Individual Score vs Cohort Average
          </h4>
          <span className="text-[11px] text-muted font-medium">Ranked by Score</span>
        </div>

        <div className="flex flex-col gap-2">
          {subjectRankings.map(subj => {
            const domain = MATH_SUBJ.includes(subj.name) ? 'Math' : SCI_SUBJ.includes(subj.name) ? 'Science' : 'Humanities';
            const domainColor = domain === 'Math' ? 'bg-blue-50 text-blue-700' : domain === 'Science' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700';
            const scorePercent = Math.min(100, Math.round((subj.score / 100) * 100));
            const avgPercent = Math.min(100, Math.round((subj.cohortAvg / 100) * 100));

            return (
              <div key={subj.name} className="bg-canvas/50 border border-border/70 rounded-xl p-3 flex flex-col gap-2 hover:bg-canvas transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-fg">{subj.name}</span>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.2 rounded', domainColor)}>
                      {domain}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-extrabold text-fg">
                      {subj.score} <span className="font-normal text-muted">pts</span>
                    </span>
                    <span className="text-muted font-medium">
                      Avg: {subj.cohortAvg}
                    </span>
                    <span className={cn('font-bold', subj.diff >= 0 ? 'text-accentGreenFg' : 'text-accentRedFg')}>
                      {subj.diff >= 0 ? `+${subj.diff}` : subj.diff}
                    </span>
                  </div>
                </div>

                {/* Score vs Benchmark Visual Indicator */}
                <div className="relative w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${scorePercent}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-slate-900/60 rounded"
                    style={{ left: `${avgPercent}%` }}
                    title={`Class average: ${subj.cohortAvg} pts`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Academic Cohort Standing Modal
 * Replaces fake "Bronze/Diamond video game tiers" with genuine percentile and class distribution metrics.
 */
export function CohortRankContent({ stats }) {
  const { rank, totalStudents, total, subjectRankings = [] } = stats;
  if (!rank || !totalStudents) return <div className="p-8 text-center text-muted">Data not available</div>;

  const percentile = Math.max(1, Math.round((1 - (rank - 1) / totalStudents) * 100));
  const isTopDecile = percentile >= 90;
  const isTopQuartile = percentile >= 75;

  return (
    <div className="p-5 sm:p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
      {/* Rank Hero Header */}
      <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/50 border border-indigo-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md shrink-0">
            #{rank}
          </div>
          <div>
            <h3 className="text-base font-extrabold text-fg">Academic Cohort Standing</h3>
            <p className="text-xs text-muted">Ranked #{rank} out of {totalStudents} review cohort students</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white text-indigo-700 border border-indigo-200 shadow-sm self-start sm:self-auto shrink-0">
          <Award className="w-3.5 h-3.5" />
          <span>{isTopDecile ? 'Top 10% (Upper Decile)' : isTopQuartile ? 'Top 25% (First Quartile)' : `Top ${percentile}% of Cohort`}</span>
        </div>
      </div>

      {/* Cohort Distribution Spectrum */}
      <div className="bg-canvas border border-border/70 rounded-xl p-4 flex flex-col gap-2.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-fg">Cohort Percentile Position</span>
          <span className="text-primary font-extrabold">Top {100 - percentile < 10 ? '10%' : `${100 - percentile + 1}%`}</span>
        </div>
        <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-700"
            style={{ width: `${percentile}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-semibold text-muted">
          <span>Lower 50%</span>
          <span>Median</span>
          <span>Top 25%</span>
          <span>Top 10%</span>
        </div>
      </div>

      {/* Academic Standing Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-border/80 rounded-xl p-3.5 bg-white">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Total Score</p>
          <p className="text-2xl font-extrabold text-fg">{total} <span className="text-xs font-semibold text-muted">pts</span></p>
          <p className="text-[11px] text-muted mt-1">Sum of diagnostic assessment scores across all 11 subject areas</p>
        </div>
        <div className="border border-border/80 rounded-xl p-3.5 bg-white">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Subjects Leading Cohort</p>
          <p className="text-2xl font-extrabold text-accentGreenFg">
            {subjectRankings.filter(s => s.diff > 0).length} <span className="text-xs font-semibold text-muted">/ {subjectRankings.length}</span>
          </p>
          <p className="text-[11px] text-muted mt-1">Subjects outperforming the review class cohort benchmark</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Strongest Domains & Mastery Modal
 * Highlights top areas of strength with exact benchmark differentials.
 */
export function TopPerformerContent({ stats }) {
  const { strongest, subjectRankings = [] } = stats;
  if (!strongest || !strongest.name) return <div className="p-8 text-center text-muted">Data not available</div>;

  const topSubjects = subjectRankings.slice(0, 4);

  return (
    <div className="p-5 sm:p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
      {/* Strongest Domain Hero Card */}
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
              Strongest Subject
            </span>
            <h3 className="text-lg font-extrabold text-emerald-950 mt-1">{strongest.name}</h3>
            <p className="text-xs text-emerald-700">
              +{strongest.diff} pts above cohort benchmark ({strongest.cohortAvg} pts avg)
            </p>
          </div>
        </div>
        <div className="bg-white border border-emerald-200 rounded-xl px-4 py-2 text-right self-start sm:self-auto shadow-sm">
          <p className="text-[10px] font-bold text-muted uppercase">Student Score</p>
          <p className="text-2xl font-extrabold text-emerald-700">{strongest.score} <span className="text-xs font-semibold text-muted">pts</span></p>
        </div>
      </div>

      {/* Top 4 Strongest Subjects */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5">
          Top Performing Subject Areas
        </h4>
        <div className="flex flex-col gap-2.5">
          {topSubjects.map((subj, idx) => {
            const domain = MATH_SUBJ.includes(subj.name) ? 'Math' : SCI_SUBJ.includes(subj.name) ? 'Science' : 'Humanities';
            const domainColor = domain === 'Math' ? 'bg-blue-50 text-blue-700' : domain === 'Science' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700';

            return (
              <div key={subj.name} className="border border-border/80 rounded-xl p-3.5 bg-white flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-muted flex items-center justify-center font-bold text-xs shrink-0">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-fg">{subj.name}</span>
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.2 rounded', domainColor)}>
                        {domain}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted">Class avg: {subj.cohortAvg} pts</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-base text-fg">
                    {subj.score} <span className="text-xs font-normal text-muted">pts</span>
                  </p>
                  <p className="text-[11px] font-bold text-accentGreenFg">
                    {subj.diff >= 0 ? `+${subj.diff}` : subj.diff} pts vs avg
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Priority Focus & Deficit Areas Modal
 * Replaces fake "30% Mastery" placeholder with dynamic point deficits from actual assessment data.
 */
export function PriorityFocusContent({ stats }) {
  const { weaknesses = [], subjectRankings = [] } = stats;
  const focusAreas = subjectRankings.filter(s => s.diff < 0).length > 0
    ? subjectRankings.filter(s => s.diff < 0)
    : weaknesses;

  if (!focusAreas.length) {
    return (
      <div className="p-8 text-center text-muted">
        All subjects are performing at or above class benchmark.
      </div>
    );
  }

  const primary = focusAreas[0];

  return (
    <div className="p-5 sm:p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
      {/* Primary Deficit Hero Alert */}
      <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
              Primary Focus Area
            </span>
            <h3 className="text-lg font-extrabold text-amber-950 mt-1">{primary.name}</h3>
            <p className="text-xs text-amber-800">
              {Math.abs(primary.diff)} pts below cohort average ({primary.cohortAvg} pts benchmark)
            </p>
          </div>
        </div>
        <div className="bg-white border border-amber-200 rounded-xl px-4 py-2 text-right self-start sm:self-auto shadow-sm">
          <p className="text-[10px] font-bold text-muted uppercase">Target Deficit</p>
          <p className="text-2xl font-extrabold text-amber-600">
            +{Math.abs(primary.diff)} <span className="text-xs font-semibold text-muted">pts</span>
          </p>
        </div>
      </div>

      {/* Focus Areas List */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5">
          Subjects Requiring Study & Review ({focusAreas.length})
        </h4>
        <div className="flex flex-col gap-2.5">
          {focusAreas.map(subj => {
            const domain = MATH_SUBJ.includes(subj.name) ? 'Math' : SCI_SUBJ.includes(subj.name) ? 'Science' : 'Humanities';
            const domainColor = domain === 'Math' ? 'bg-blue-50 text-blue-700' : domain === 'Science' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700';

            return (
              <div key={subj.name} className="border border-border/80 rounded-xl p-3.5 bg-white flex flex-col gap-2 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-fg">{subj.name}</span>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.2 rounded', domainColor)}>
                      {domain}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-extrabold text-fg">{subj.score} pts</span>
                    <span className="text-muted">Target: {subj.cohortAvg} pts</span>
                    <span className="font-bold text-amber-600">
                      {subj.diff} pts deficit
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-border/40">
                  <span>Recommendation: Complete topic practice tests and review session notes.</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
