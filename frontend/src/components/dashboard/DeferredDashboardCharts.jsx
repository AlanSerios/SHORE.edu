import React, { Suspense, useEffect, useRef, useState } from 'react';

const DashboardCharts = React.lazy(() => import('./DashboardCharts'));

function DashboardChartsPlaceholder() {
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading performance charts…</span>
      <div className="min-h-[388px] rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:min-h-[428px] sm:p-6 lg:col-span-7">
        <div aria-hidden="true" className="space-y-3">
          <div className="h-5 w-48 rounded bg-slate-100 motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="h-3 w-64 max-w-full rounded bg-slate-100 motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="mt-8 h-[270px] rounded-lg bg-slate-50 sm:h-[310px]" />
        </div>
      </div>
      <div className="min-h-[388px] rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:min-h-[428px] sm:p-6 lg:col-span-5">
        <div aria-hidden="true" className="space-y-3">
          <div className="h-5 w-40 rounded bg-slate-100 motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="h-3 w-56 max-w-full rounded bg-slate-100 motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="mt-8 h-[250px] rounded-full bg-slate-50 sm:h-[285px]" />
        </div>
      </div>
    </div>
  );
}

export default function DeferredDashboardCharts(props) {
  const sectionRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return undefined;

    const section = sectionRef.current;

    if (!section || typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);

      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <section ref={sectionRef} aria-label="Performance charts" aria-busy={!shouldLoad}>
      {shouldLoad ? (
        <Suspense fallback={<DashboardChartsPlaceholder />}>
          <DashboardCharts {...props} />
        </Suspense>
      ) : (
        <DashboardChartsPlaceholder />
      )}
    </section>
  );
}
