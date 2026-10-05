import React from 'react';
import anime from 'animejs';

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
  const hasDelta = typeof val1 === 'number' && typeof val2 === 'number';
  const diff = hasDelta ? val1 - val2 : null;

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-border p-3.5 shadow-xl rounded-xl min-w-[160px] text-xs">
      <p className="font-bold text-fg text-sm mb-2 pb-1 border-b border-border/60">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3 font-medium">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}</span>
            </span>
            <span className="font-bold text-fg">{entry.value} pts</span>
          </div>
        ))}
      </div>
      {diff !== null && (
        <div className="mt-2 pt-1.5 border-t border-border/60 flex items-center justify-between font-semibold">
          <span className="text-muted">Gap</span>
          <span className={diff >= 0 ? 'text-accentGreenFg font-bold' : 'text-accentRedFg font-bold'}>
            {diff >= 0 ? `+${diff}` : diff} pts
          </span>
        </div>
      )}
    </div>
  );
}
