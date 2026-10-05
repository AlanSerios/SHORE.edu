import React from 'react';
import { Trophy, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, BarChart, Bar,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { AnimatedNumber, CustomTooltip } from './DashboardPrimitives';

export function TotalScoreContent({ stats }) {
  const data = stats.radarData || [];
  return (
    <div className="p-4 flex flex-col w-full">
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4">
        <h3 className="text-primary font-bold text-base mb-0.5">Total Score Progression</h3>
        <p className="text-xs text-fg/80 mb-3">A breakdown of your score distribution across all subjects compared to the class average.</p>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              <Area type="monotone" dataKey="avg" name="Class Average" stroke="#94a3b8" fillOpacity={1} fill="url(#colorAvg)" />
              <Area type="monotone" dataKey="score" name="Your Score" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-canvas border border-border rounded-xl p-3">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Total Score</p>
          <h4 className="text-2xl font-bold text-fg"><AnimatedNumber value={stats.total} /></h4>
        </div>
        <div className="bg-canvas border border-border rounded-xl p-3">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Growth</p>
          <h4 className="text-2xl font-bold text-accentGreenFg">
            {stats.growth !== null ? <>{stats.growth > 0 ? '+' : ''}<AnimatedNumber value={stats.growth} /></> : 'N/A'}
          </h4>
        </div>
      </div>
    </div>
  );
}

export function CohortRankContent({ stats }) {
  const { rank, totalStudents } = stats;
  if (!rank || !totalStudents) return <div className="p-8 text-center text-muted">Data not available</div>;

  const percentile = Math.round((1 - rank / totalStudents) * 100);
  let tier = 'Bronze', tierColor = '#cd7f32';
  if (percentile >= 90) { tier = 'Diamond'; tierColor = '#0ea5e9'; }
  else if (percentile >= 75) { tier = 'Platinum'; tierColor = '#10b981'; }
  else if (percentile >= 50) { tier = 'Gold'; tierColor = '#fbbf24'; }
  else if (percentile >= 25) { tier = 'Silver'; tierColor = '#94a3b8'; }

  return (
    <div className="p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-2xl relative" style={{ background: `radial-gradient(circle, ${tierColor} 0%, transparent 70%)` }}>
        <Trophy className="w-12 h-12 md:w-16 md:h-16" style={{ color: tierColor, filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' }} />
      </div>
      <h3 className="text-2xl md:text-3xl font-extrabold mb-2" style={{ color: tierColor }}>{tier} Tier</h3>
      <p className="text-base md:text-lg text-fg font-medium text-center mb-4 md:mb-6">You are in the top <span className="font-bold text-primary">{100 - percentile}%</span> of your cohort!</p>
      <div className="w-full bg-canvas rounded-full h-4 mb-2 overflow-hidden border border-border">
        <div className="h-full rounded-full" style={{ width: `${percentile}%`, backgroundColor: tierColor }} />
      </div>
      <p className="text-xs text-muted font-medium w-full text-right">Percentile: {percentile}</p>
    </div>
  );
}

export function TopPerformerContent({ stats }) {
  const { vsCohortData } = stats;
  if (!vsCohortData) return <div className="p-8 text-center text-muted">Data not available</div>;
  return (
    <div className="p-4 md:p-6 flex flex-col items-center justify-center">
      <h3 className="text-base md:text-lg font-bold text-fg mb-4 md:mb-6">Subject Mastery: You vs Average</h3>
      <div className="w-full h-[200px] md:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={vsCohortData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={val => val.substring(0, 3)} />
            <YAxis tick={{ fill: '#888', fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Bar dataKey="student" name="Your Score" fill="#1cb0f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cohort" name="Class Average" fill="#88888840" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PriorityFocusContent({ stats }) {
  const { weaknesses } = stats;
  if (!weaknesses?.length) return <div className="p-8 text-center text-muted">Data not available</div>;
  const primary = weaknesses[0];
  return (
    <div className="p-4 md:p-6 flex flex-col w-full">
      <div className="bg-accentRed/10 border border-accentRed/20 rounded-2xl p-4 md:p-5 mb-4 md:mb-6">
        <h3 className="text-accentRedFg font-bold text-base md:text-lg mb-1">Priority Focus: {primary.name}</h3>
        <p className="text-xs md:text-sm text-fg/80 mb-3 md:mb-4">Your score is {Math.abs(primary.diff)} points below the cohort average. Let's fix this!</p>
        <div className="w-full bg-black/20 rounded-full h-3 mb-2 overflow-hidden">
          <div className="h-full rounded-full bg-accentRedFg" style={{ width: '30%' }} />
        </div>
        <p className="text-[10px] md:text-xs font-bold text-accentRedFg w-full text-right mb-3 md:mb-4">30% Mastery - Needs Review</p>
        <div className="bg-black/20 rounded-xl p-2 md:p-3 flex items-center gap-2 md:gap-3">
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-accentRedFg text-white flex items-center justify-center font-bold text-xs md:text-sm shrink-0">1</div>
          <p className="text-xs md:text-sm font-medium text-fg">Next Step: Review core concepts in {primary.name}.</p>
        </div>
      </div>
      <h4 className="text-[10px] md:text-sm font-bold text-muted uppercase tracking-wider mb-2 md:mb-3 px-1">Other Areas for Improvement</h4>
      <div className="flex flex-col gap-2">
        {weaknesses.slice(1).map(w => (
          <div key={w.name} className="flex items-center justify-between bg-canvas rounded-xl p-2 md:p-3 border border-border">
            <span className="font-semibold text-fg text-xs md:text-sm">{w.name}</span>
            <span className="text-[10px] md:text-xs font-bold text-accentRedFg px-2 py-1 bg-accentRed/10 rounded-lg">{w.score} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
