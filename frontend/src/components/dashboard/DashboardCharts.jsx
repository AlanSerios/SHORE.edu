import { motion } from 'framer-motion';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CustomTooltip } from './DashboardPrimitives';
import { MATH_SUBJ, SCI_SUBJ } from '../../utils/analytics';

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 28 } },
};

const subjectTick = (name) => ({
  Mathematics: 'Math',
  'English Proficiency': 'English',
  'Abstract Reasoning': 'Reasoning',
})[name] || name;

function renderCustomRadarTick({ payload, x, y, cx, cy }) {
  if (!payload || !payload.value) return null;

  const subject = payload.value;
  const isMath = MATH_SUBJ.includes(subject);
  const isScience = SCI_SUBJ.includes(subject);
  const dotColor = isMath ? '#3B82F6' : isScience ? '#10B981' : '#8B5CF6';
  const isRight = x > cx + 6;
  const isLeft = x < cx - 6;
  const textAnchor = isRight ? 'start' : isLeft ? 'end' : 'middle';
  const offsetX = isRight ? 4 : isLeft ? -4 : 0;
  const offsetY = y > cy + 6 ? 3 : y < cy - 6 ? -3 : 0;

  return (
    <g transform={'translate(' + (x + offsetX) + ',' + (y + offsetY) + ')'}>
      <circle
        cx={isRight ? -3.5 : isLeft ? 3.5 : 0}
        cy={isRight || isLeft ? -2.5 : -8}
        r={2}
        fill={dotColor}
      />
      <text
        x={0}
        y={0}
        textAnchor={textAnchor}
        fill="#334155"
        fontSize={9.5}
        fontWeight={600}
        fontFamily="Inter, sans-serif"
      >
        {subjectTick(subject)}
      </text>
    </g>
  );
}

export default function DashboardCharts({
  stats,
  isAdmin,
  selectedStudent,
  averageGrowth,
  benchmarkSummary,
  reduceMotion,
}) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12">
      <motion.div
        variants={itemVariants}
        className="flex min-w-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6 lg:col-span-7"
      >
        <div className="mb-4 flex flex-col justify-between gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-fg">
              {stats.preVsPostData
                ? 'Pre-Test vs Post-Test Growth'
                : isAdmin
                  ? 'Performance vs Cohort Average'
                  : 'Subject Performance'}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {stats.preVsPostData
                ? 'Percent correct in each subject'
                : isAdmin
                  ? 'Subject scores compared with the class cohort average'
                  : 'Percent correct in each subject'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {averageGrowth && (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-emerald-700">
                Avg: {averageGrowth.isPositive ? '+' : ''}{averageGrowth.pts} pp
              </span>
            )}
            {benchmarkSummary && !stats.preVsPostData && (
              <span
                className={[
                  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums',
                  benchmarkSummary.isAbove
                    ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200/70 bg-amber-50 text-amber-700',
                ].join(' ')}
              >
                Avg: {benchmarkSummary.isAbove ? '+' : '-'}{benchmarkSummary.pts} pp
              </span>
            )}

            <div className="flex items-center gap-2.5 rounded-lg border border-slate-200/60 bg-slate-50 px-2.5 py-1 text-xs">
              {(isAdmin || stats.preVsPostData) && (
                <div className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-slate-400" />
                  <span className="text-[11px] font-medium text-slate-600">
                    {stats.preVsPostData ? 'Baseline' : 'Cohort'}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
                <span className="text-[11px] font-bold text-slate-900">
                  {stats.preVsPostData ? 'Post-Test' : 'Student'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="h-[270px] w-full sm:h-[310px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stats.preVsPostData || stats.vsCohortData}
              margin={{ top: 10, right: 12, left: 0, bottom: 16 }}
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
                tickFormatter={subjectTick}
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
                domain={[0, 100]}
                unit="%"
                width={40}
                tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
              {stats.preVsPostData ? (
                <>
                  <Bar
                    isAnimationActive={!reduceMotion}
                    dataKey="pre"
                    name="Pre-Test Baseline"
                    fill="url(#barGradPre)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={26}
                  />
                  <Bar
                    isAnimationActive={!reduceMotion}
                    dataKey="post"
                    name="Post-Test Final"
                    fill="url(#barGradPost)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={26}
                  />
                </>
              ) : (
                <>
                  {isAdmin && (
                    <Bar
                      isAnimationActive={!reduceMotion}
                      dataKey="cohort"
                      name="Cohort Average"
                      fill="url(#barGradPre)"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={26}
                    />
                  )}
                  <Bar
                    isAnimationActive={!reduceMotion}
                    dataKey="student"
                    name={selectedStudent || 'Student'}
                    fill="url(#barGradPost)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={26}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="flex min-w-0 flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6 lg:col-span-5"
      >
        <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-fg">Domain Breakdown</h2>
            <p className="mt-0.5 text-xs text-muted">Percent correct across four subjects</p>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
            4 Subjects
          </span>
        </div>

        <div className="mb-1 flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span className="text-[11px] font-bold text-fg">{selectedStudent || 'Student'}</span>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                <span className="text-[11px] font-medium text-muted">Cohort Avg</span>
              </div>
            )}
          </div>
          <div className="hidden items-center gap-2 text-[10px] text-muted sm:flex">
            <span className="inline-flex items-center gap-1"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-blue-500" />Math</span>
            <span className="inline-flex items-center gap-1"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Sci</span>
            <span className="inline-flex items-center gap-1"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-purple-500" />Hum</span>
          </div>
        </div>

        <div className="h-[250px] w-full flex-none sm:h-[285px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="48%"
              margin={{ top: 8, right: 18, bottom: 8, left: 18 }}
              data={stats.radarData}
            >
              <defs>
                <radialGradient id="radarStudentGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0.12} />
                </radialGradient>
              </defs>
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <PolarGrid stroke="#E2E8F0" strokeDasharray="2 2" />
              <PolarAngleAxis dataKey="subject" tick={renderCustomRadarTick} />
              <Radar
                isAnimationActive={!reduceMotion}
                name={selectedStudent || 'Student'}
                dataKey="score"
                stroke="#2563EB"
                strokeWidth={2.5}
                fill="url(#radarStudentGrad)"
                dot={{ r: 3, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 1.5 }}
              />
              {isAdmin && (
                <Radar
                  isAnimationActive={!reduceMotion}
                  name="Cohort Avg"
                  dataKey="cohort"
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="#94A3B8"
                  fillOpacity={0.04}
                  dot={{ r: 2.5, fill: '#94A3B8' }}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
