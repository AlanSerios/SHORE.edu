import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLottie } from 'lottie-react';
import anime from 'animejs';
import fireAnimation from '../../../public/fire.json';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils';

const STREAK_THEMES = [
  { color: '#ff9600', filter: 'none' },
  { color: '#b026ff', filter: 'hue-rotate(240deg) saturate(1.5)' },
  { color: '#0ea5e9', filter: 'hue-rotate(180deg) saturate(1.2)' },
  { color: '#fbbf24', filter: 'sepia(1) saturate(4) hue-rotate(-10deg) brightness(1.2)' },
];

export function getStreakTheme(streak) {
  if (streak >= 11) return STREAK_THEMES[3];
  if (streak >= 6) return STREAK_THEMES[2];
  if (streak >= 4) return STREAK_THEMES[1];
  return STREAK_THEMES[0];
}

export function LottieFire({ style = { width: '100%', height: '100%' }, className = 'w-full h-full' }) {
  const { View } = useLottie({ animationData: fireAnimation, loop: true, autoplay: true }, style);
  return <div className={className}>{View}</div>;
}

const MILESTONES = ['OB', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'ME', 'GR'];

export function StreakModalContent({ studentStreak, setExpandedCard }) {
  const { color: streakColor, filter: fireFilter } = getStreakTheme(studentStreak);

  useEffect(() => {
    anime({ targets: '.streak-fire', translateY: [-50, 0], scale: [0.5, 1], opacity: [0, 1], easing: 'spring(1, 80, 10, 0)', duration: 1200 });
    const obj = { val: 0 };
    anime({
      targets: obj, val: studentStreak, round: 1, duration: 1500, easing: 'easeOutExpo',
      update() {
        const el = document.querySelector('.streak-number');
        if (el) el.innerHTML = obj.val;
      },
    });
    anime({ targets: '.streak-milestone', translateY: [20, 0], scale: [0.8, 1], opacity: [0, 1], delay: anime.stagger(100, { start: 500 }), easing: 'easeOutBack', duration: 800 });
    anime({ targets: '.streak-btn', translateY: [20, 0], opacity: [0, 1], delay: 1500, easing: 'easeOutCubic', duration: 600 });
  }, [studentStreak]);

  const maxVisible = 8;
  let startIdx = 0;
  if (studentStreak >= 5) startIdx = Math.min(studentStreak - 4, 11 - maxVisible);

  return (
    <div className="w-full p-4 pt-5 pb-4 flex flex-col items-center justify-center relative">
      <div className="relative flex flex-row items-center justify-center mb-2 mt-2 gap-3 sm:gap-4">
        <div className="streak-fire w-24 h-24 sm:w-28 sm:h-28 opacity-0 relative z-20 pointer-events-none flex items-center justify-center" style={{ filter: fireFilter }}>
          <LottieFire style={{ width: '100%', height: '100%', transform: 'scale(1.25)' }} />
        </div>
        <h1 className="streak-number text-[90px] sm:text-[110px] leading-none font-extrabold mb-0 tracking-tighter relative translate-y-[2px] sm:translate-y-[4px]" style={{ color: streakColor, textShadow: '0 4px 0px rgba(0,0,0,0.3)' }}>0</h1>
      </div>
      <h2 className="text-lg sm:text-xl font-bold mb-3 md:mb-5 tracking-wide mt-1" style={{ color: streakColor }}>session streak</h2>

      <div className="flex flex-wrap gap-x-1.5 gap-y-2 mb-4 w-full justify-center px-1">
        {MILESTONES.map((day, i) => {
          if (i < startIdx || i >= startIdx + maxVisible) return null;
          const isChecked = i < studentStreak;
          const isCurrent = i === studentStreak;
          return (
            <div key={day} className="streak-milestone flex flex-col items-center gap-1 w-[30px] sm:w-[34px] opacity-0">
              <span className={cn('font-bold text-[9px] sm:text-[10px]', isCurrent ? '' : 'text-white/40')} style={isCurrent ? { color: streakColor } : {}}>{day}</span>
              <div className={cn('w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border-[2px]', !isChecked && 'bg-white/5 border-white/5')} style={isChecked ? { backgroundColor: streakColor, borderColor: streakColor, color: '#000' } : {}}>
                {isChecked && <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" />}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-white/70 font-medium text-xs sm:text-base mb-3 sm:mb-5 text-center px-2">You're making great progress!</p>
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setExpandedCard(null)}
        className="streak-btn w-[90%] max-w-[240px] bg-[#1cb0f6] hover:bg-[#1899d6] text-white font-extrabold text-sm sm:text-base py-3 sm:py-3.5 rounded-2xl uppercase tracking-widest transition-colors shadow-[0_4px_0_#1899d6]"
      >
        Continue
      </motion.button>
    </div>
  );
}
