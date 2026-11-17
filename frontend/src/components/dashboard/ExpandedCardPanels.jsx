import React from 'react';
import { AlertTriangle, Target } from 'lucide-react';

function ScoreBar({ percent, label }) {
  const value = Math.max(0, Math.min(100, percent || 0));

  return <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${label}: ${Math.round(value)} percent`}><div className="h-full rounded-full bg-blue-700" style={{ width: `${value}%` }} /></div>;
}

export function TotalScoreContent({ stats }) {
  return (
    <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5 sm:p-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-600">Current pre-test score</p>
        <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-950">{stats.total}/{stats.totalMax} <span className="text-sm font-medium text-slate-600">· {Math.round(stats.totalPercent)}%</span></p>
      </div>
      <div className="space-y-3">
        {stats.subjectRankings.map(domain => <div key={domain.name} className="rounded-xl border border-slate-200 p-4">
          <div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-900">{domain.name}</p><span className="font-mono text-sm font-semibold tabular-nums">{domain.score}/{domain.max}</span></div>
          <ScoreBar percent={domain.percent} label={domain.name} />
          <p className="mt-2 text-xs text-slate-600">{Math.round(domain.percent)}% correct{domain.cohortAvg !== null ? ` · cohort ${Math.round(domain.cohortAvg)}%` : ''}</p>
        </div>)}
      </div>
    </div>
  );
}

export function CohortRankContent({ stats }) {
  if (!stats.rank) return <div className="p-8 text-center text-sm text-slate-600">Cohort ranking is only available to administrators.</div>;
  const percentile = Math.max(1, Math.round((1 - (stats.rank - 1) / stats.totalStudents) * 100));

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Class ranking</p>
        <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-slate-950">#{stats.rank}<span className="text-lg font-medium text-slate-500"> / {stats.totalStudents}</span></p>
        <p className="mt-2 text-sm text-slate-600">Based on published pre-test totals.</p>
      </div>
      <div><div className="mb-2 flex justify-between text-xs text-slate-600"><span>Relative position</span><span>Top {percentile}%</span></div><ScoreBar percent={percentile} label="Class ranking position" /></div>
    </div>
  );
}

export function TopPerformerContent({ stats }) {
  return (
    <div className="space-y-4 p-5 sm:p-6">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <Target className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
        <div><p className="text-xs font-semibold text-emerald-800">Strongest domain</p><p className="mt-1 font-bold text-emerald-950">{stats.strongest.name}</p><p className="mt-1 text-sm text-emerald-800">{stats.strongest.score}/{stats.strongest.max} · {Math.round(stats.strongest.percent)}% correct</p></div>
      </div>
      <div className="space-y-2">
        {stats.subjectRankings.slice().sort((a, b) => b.percent - a.percent).map((domain, index) => <div key={domain.name} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3"><span className="font-mono text-xs text-slate-500">{index + 1}</span><span className="truncate text-sm font-semibold text-slate-900">{domain.name}</span></div>
          <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-slate-800">{domain.score}/{domain.max}</span>
        </div>)}
      </div>
    </div>
  );
}

export function PriorityFocusContent({ stats }) {
  const areas = [...(stats.subtopicRankings || [])].sort((a, b) => a.percent - b.percent).slice(0, 5);

  return (
    <div className="space-y-4 p-5 sm:p-6">
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div><p className="font-semibold text-amber-950">Sections to review</p><p className="mt-1 text-sm leading-5 text-amber-900">These are the lowest-scoring printed sections in this student’s diagnostic. Use them to guide review.</p></div>
      </div>
      <div className="space-y-2">
        {areas.map(topic => <div key={`${topic.subject}-${topic.name}`} className="rounded-lg border border-slate-200 px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{topic.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{topic.subject}</p></div><span className="font-mono text-xs font-semibold tabular-nums text-slate-700">{topic.score}/{topic.max}</span></div>
          <ScoreBar percent={topic.percent} label={topic.name} />
        </div>)}
      </div>
    </div>
  );
}
