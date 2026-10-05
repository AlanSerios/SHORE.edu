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
  return (
    <div className="bg-card border border-border p-3 shadow-sm rounded-lg">
      <p className="font-semibold text-fg text-sm mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="text-sm font-medium">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}
