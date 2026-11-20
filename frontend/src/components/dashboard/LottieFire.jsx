import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web/build/player/lottie_light';
import fireAnimation from '../../../public/fire.json';

export default function LottieFire({ style = { width: '100%', height: '100%' }, className = 'w-full h-full' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const animationItem = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      animationData: JSON.parse(JSON.stringify(fireAnimation)),
      loop: true,
      autoplay: false,
    });

    let visible = true;

    const syncPlayback = () => {
      if (visible && !document.hidden) animationItem.play();
      else animationItem.pause();
    };

    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    });

    if (containerRef.current) observer?.observe(containerRef.current);
    document.addEventListener('visibilitychange', syncPlayback);
    syncPlayback();

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      animationItem.destroy();
    };
  }, []);

  return <div ref={containerRef} aria-hidden="true" className={className} style={style} />;
}
