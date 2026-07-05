import React, { useEffect, useRef } from 'react';
import anime from 'animejs';

export default function AvatarBorder({ borderId, children, className = '' }) {
  const containerRef = useRef(null);
  
  const isFire = borderId === 'border_fire';
  const isCyber = borderId === 'border_cyber';
  const isGold = borderId === 'border_gold';
  const isShore = borderId === 'border_shore';
  const isNebula = borderId === 'border_nebula';
  
  useEffect(() => {
    if (!borderId || !containerRef.current) return;
    
    // Clear previous animations to prevent overlap
    anime.remove(containerRef.current.querySelectorAll('.anim-element'));
    
    if (isFire) {
      anime({
        targets: containerRef.current.querySelector('.fire-ring'),
        rotate: '1turn',
        duration: 8000,
        easing: 'linear',
        loop: true
      });
      anime({
        targets: containerRef.current.querySelector('.fire-ring-inner'),
        rotate: '-1turn',
        duration: 6000,
        easing: 'linear',
        loop: true
      });
      anime({
        targets: containerRef.current.querySelectorAll('.fire-spark'),
        translateY: [0, -20],
        translateX: () => anime.random(-10, 10),
        scale: [0, 1.5, 0],
        opacity: [0, 1, 0],
        duration: () => anime.random(1000, 2000),
        delay: anime.stagger(300),
        easing: 'easeOutSine',
        loop: true
      });
    } else if (isCyber) {
      anime({
        targets: containerRef.current.querySelector('.cyber-ring'),
        rotate: '1turn',
        duration: 10000,
        easing: 'linear',
        loop: true
      });
      anime({
        targets: containerRef.current.querySelector('.cyber-pulse'),
        scale: [1, 1.05, 1],
        opacity: [0.5, 1, 0.5],
        duration: 2000,
        easing: 'easeInOutSine',
        loop: true
      });
      anime({
        targets: containerRef.current.querySelectorAll('.cyber-node'),
        opacity: [0.2, 1, 0.2],
        scale: [0.8, 1.2, 0.8],
        duration: () => anime.random(800, 1500),
        delay: anime.stagger(200),
        easing: 'steps(5)',
        loop: true
      });
    } else if (isGold) {
      anime({
        targets: containerRef.current.querySelector('.gold-shimmer'),
        rotate: '1turn',
        duration: 4000,
        easing: 'linear',
        loop: true
      });
      anime({
        targets: containerRef.current.querySelectorAll('.gold-sparkle'),
        scale: [0, 1.2, 0],
        rotate: '1turn',
        opacity: [0, 1, 0],
        duration: 2000,
        delay: anime.stagger(400, {start: 100}),
        easing: 'easeInOutQuad',
        loop: true
      });
    } else if (isShore) {
      anime({
        targets: containerRef.current.querySelectorAll('.shore-wave'),
        rotate: '1turn',
        duration: () => anime.random(8000, 14000),
        easing: 'linear',
        loop: true
      });
      anime({
        targets: containerRef.current.querySelectorAll('.shore-bubble'),
        translateY: () => anime.random(-15, -30),
        translateX: () => anime.random(-10, 10),
        scale: [0, 1.5, 0],
        opacity: [0, 0.8, 0],
        duration: () => anime.random(1500, 3000),
        delay: anime.stagger(400, {start: 200}),
        easing: 'easeOutSine',
        loop: true
      });
    } else if (isNebula) {
      anime({
        targets: containerRef.current.querySelector('.nebula-ring'),
        rotate: '1turn',
        duration: 6000,
        easing: 'linear',
        loop: true
      });
      anime({
        targets: containerRef.current.querySelector('.nebula-shimmer'),
        rotate: '-1turn',
        duration: 8000,
        easing: 'linear',
        loop: true
      });
      anime({
        targets: containerRef.current.querySelectorAll('.nebula-star'),
        scale: [0, 1.5, 0],
        rotate: () => anime.random(-45, 45),
        opacity: [0, 1, 0],
        duration: () => anime.random(2000, 4000),
        delay: anime.stagger(500),
        easing: 'easeInOutQuad',
        loop: true
      });
    }
    
  }, [borderId, isFire, isCyber, isGold, isShore, isNebula]);

  if (!borderId) {
    return <div className={`relative ${className}`}>{children}</div>;
  }

  return (
    <div ref={containerRef} className={`relative flex items-center justify-center ${className}`}>
      
      {/* Border Renderings */}
      {isFire && (
        <>
          <div className="absolute inset-0 -m-1 anim-element fire-ring rounded-full border-4 border-dashed border-orange-500 opacity-80" style={{ filter: 'drop-shadow(0 0 6px #f97316)' }}></div>
          <div className="absolute inset-0 -m-[2px] anim-element fire-ring-inner rounded-full border-2 border-dotted border-red-500 opacity-60"></div>
          
          <div className="absolute -top-2 left-1/4 w-2 h-2 rounded-full bg-orange-400 anim-element fire-spark pointer-events-none blur-[1px]"></div>
          <div className="absolute top-1/2 -right-2 w-1.5 h-1.5 rounded-full bg-red-400 anim-element fire-spark pointer-events-none blur-[1px]"></div>
          <div className="absolute -bottom-1 left-1/3 w-2.5 h-2.5 rounded-full bg-yellow-400 anim-element fire-spark pointer-events-none blur-[1px]"></div>
        </>
      )}

      {isCyber && (
        <>
          <div className="absolute inset-0 -m-1 anim-element cyber-ring rounded-full border-[3px] border-cyan-400 opacity-90" style={{ filter: 'drop-shadow(0 0 8px #22d3ee)', borderStyle: 'double' }}></div>
          <div className="absolute inset-0 -m-[2px] anim-element cyber-pulse rounded-full border border-blue-400 opacity-50"></div>
          
          <div className="absolute -top-1 right-0 w-2 h-2 bg-cyan-300 anim-element cyber-node pointer-events-none rotate-45 shadow-[0_0_5px_#22d3ee]"></div>
          <div className="absolute bottom-0 -left-1 w-1.5 h-1.5 bg-blue-300 anim-element cyber-node pointer-events-none shadow-[0_0_5px_#60a5fa]"></div>
          <div className="absolute top-1/2 -right-1 w-1.5 h-3 bg-cyan-400 anim-element cyber-node pointer-events-none shadow-[0_0_5px_#22d3ee]"></div>
        </>
      )}

      {isGold && (
        <>
          <div className="absolute inset-0 -m-1 rounded-full bg-gradient-to-tr from-yellow-300 via-yellow-500 to-yellow-200" style={{ filter: 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.6))', padding: '3px' }}>
             <div className="w-full h-full rounded-full bg-white/10 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-[200%] h-[200%] -ml-[50%] -mt-[50%] anim-element gold-shimmer bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(255,255,255,0.8)_360deg)]"></div>
             </div>
          </div>
          
          <div className="absolute -top-2 left-1/2 w-3 h-3 anim-element gold-sparkle pointer-events-none">
             <div className="w-full h-full bg-yellow-300 rotate-45" style={{ clipPath: 'polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%)' }}></div>
          </div>
          <div className="absolute bottom-0 -right-2 w-4 h-4 anim-element gold-sparkle pointer-events-none">
             <div className="w-full h-full bg-yellow-200 rotate-45" style={{ clipPath: 'polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%)' }}></div>
          </div>
          <div className="absolute top-1/4 -left-2 w-2.5 h-2.5 anim-element gold-sparkle pointer-events-none">
             <div className="w-full h-full bg-yellow-400 rotate-45" style={{ clipPath: 'polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%)' }}></div>
          </div>
        </>
      )}

      {isShore && (
        <>
          {/* Wave 1 */}
          <div className="absolute inset-0 -m-1 anim-element shore-wave border-2 border-blue-400 opacity-60" style={{ borderRadius: '43% 57% 65% 35% / 40% 45% 55% 60%', filter: 'drop-shadow(0 0 4px #3b82f6)' }}></div>
          {/* Wave 2 */}
          <div className="absolute inset-0 -m-[2px] anim-element shore-wave border-2 border-cyan-400 opacity-70" style={{ borderRadius: '53% 47% 45% 55% / 50% 55% 45% 50%' }}></div>
          {/* Wave 3 (Inner thick wave) */}
          <div className="absolute inset-0 -m-1.5 anim-element shore-wave border-4 border-sky-300 opacity-50" style={{ borderRadius: '35% 65% 55% 45% / 55% 40% 60% 45%' }}></div>
          
          <div className="absolute bottom-0 left-1/4 w-2 h-2 rounded-full bg-blue-300 anim-element shore-bubble pointer-events-none"></div>
          <div className="absolute -bottom-2 right-1/4 w-1.5 h-1.5 rounded-full bg-cyan-200 anim-element shore-bubble pointer-events-none"></div>
          <div className="absolute top-1/2 -left-2 w-2.5 h-2.5 rounded-full bg-blue-200 anim-element shore-bubble pointer-events-none opacity-50"></div>
          <div className="absolute top-3/4 -right-1 w-2 h-2 rounded-full bg-cyan-100 anim-element shore-bubble pointer-events-none opacity-60"></div>
        </>
      )}

      {isNebula && (
        <>
          <div className="absolute inset-0 -m-1 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-600 anim-element nebula-ring" style={{ filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.7))', padding: '3px' }}>
             <div className="w-full h-full rounded-full bg-black/20 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-[200%] h-[200%] -ml-[50%] -mt-[50%] anim-element nebula-shimmer bg-[conic-gradient(from_180deg,transparent_0_340deg,rgba(255,255,255,0.4)_360deg)]"></div>
             </div>
          </div>
          
          <div className="absolute -top-1 left-1/3 w-2 h-2 anim-element nebula-star pointer-events-none shadow-[0_0_6px_#f0abfc]">
             <div className="w-full h-full bg-fuchsia-300 rotate-45" style={{ clipPath: 'polygon(50% 0%, 55% 45%, 100% 50%, 55% 55%, 50% 100%, 45% 55%, 0% 50%, 45% 45%)' }}></div>
          </div>
          <div className="absolute bottom-1 -right-1 w-2.5 h-2.5 anim-element nebula-star pointer-events-none shadow-[0_0_6px_#c084fc]">
             <div className="w-full h-full bg-purple-300 rotate-45" style={{ clipPath: 'polygon(50% 0%, 55% 45%, 100% 50%, 55% 55%, 50% 100%, 45% 55%, 0% 50%, 45% 45%)' }}></div>
          </div>
          <div className="absolute top-1/2 -left-2 w-1.5 h-1.5 anim-element nebula-star pointer-events-none shadow-[0_0_6px_#818cf8]">
             <div className="w-full h-full bg-indigo-300 rotate-45" style={{ clipPath: 'polygon(50% 0%, 55% 45%, 100% 50%, 55% 55%, 50% 100%, 45% 55%, 0% 50%, 45% 45%)' }}></div>
          </div>
        </>
      )}

      {/* The actual avatar picture */}
      <div className="relative z-10 w-full h-full rounded-full overflow-hidden border-2 border-white/50 bg-white">
        {children}
      </div>
      
    </div>
  );
}
