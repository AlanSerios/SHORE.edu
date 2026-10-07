import React from 'react';
import anime from 'animejs';
import { MATH_SUBJ, SCI_SUBJ } from '../../utils/analytics';
import { cn } from '../../utils';

/** Animated counting number — shared by all dashboard cards. */
export function AnimatedNumber({ value }) {
  const nodeRef = React.useRef();
  React.useEffect(() => {
    if (!nodeRef.current) return;
    const obj = { val: 0 };
    anime({
      targets: obj,
      val: value,
      round: 1,
      duration: 1500,
      easing: 'easeOutExpo',
      update() {
        if (nodeRef.current) nodeRef.current.innerHTML = obj.val;
      },
    });
  }, [value]);

  return <span ref={nodeRef}>0</span>;
}

/** Shared tooltip used by all Recharts charts. */
export function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const val1 = payload[0]?.value;
  const val2 = payload[1]?.value;
  const hasDelta = Number.isFinite(val1) && Number.isFinite(val2);
  const diff = hasDelta ? val1 - val2 : null;

  const domain = label
    ? (MATH_SUBJ.includes(label) ? 'Math' : SCI_SUBJ.includes(label) ? 'Science' : 'Humanities')
    : null;

  const domainColor = domain === 'Math'
    ? 'bg-blue-50 text-blue-700 border-blue-200/70'
    : domain === 'Science'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
      : 'bg-purple-50 text-purple-700 border-purple-200/70';

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 p-3.5 shadow-xl rounded-xl min-w-[180px] text-xs transition-all">
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
        <p className="font-bold text-fg text-sm tracking-tight">{label}</p>
        {domain && (
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', domainColor)}>
            {domain}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-muted font-medium">
              <span className="w-2.5 h-2.5 rounded-sm shadow-xs" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}</span>
            </span>
            <span className="font-mono font-bold text-fg tabular-nums">{entry.value} pts</span>
          </div>
        ))}
      </div>
      {diff !== null && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-muted font-medium">Net Delta</span>
          <span className={cn(
            'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold font-mono tabular-nums border',
            diff >= 0
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
              : 'bg-rose-50 text-rose-700 border-rose-200/70'
          )}>
            {diff >= 0 ? `+${diff}` : diff} pts
          </span>
        </div>
      )}
    </div>
  );
}
