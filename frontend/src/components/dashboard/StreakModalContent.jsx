import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Flame } from 'lucide-react';
import { cn } from '../../utils';
import { getStreakTheme } from './streakTheme';

const LottieFire = React.lazy(() => import('./LottieFire'));

const MILESTONES = ['OB', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'ME', 'GR'];

export default function StreakModalContent({ studentStreak, setExpandedCard }) {
  const { color: streakColor, filter: fireFilter } = getStreakTheme(studentStreak);

  const reduceMotion = useReducedMotion();

  const maxVisible = 8;
  let startIdx = 0;

  if (studentStreak >= 5) startIdx = Math.min(studentStreak - 4, 11 - maxVisible);

  return (
    <div className="w-full p-4 pt-5 pb-4 flex flex-col items-center justify-center relative">
      <div className="relative flex flex-row items-center justify-center mb-2 mt-2 gap-3 sm:gap-4">
        <motion.div initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2, ease: "easeOut" }} className="streak-fire w-24 h-24 sm:w-28 sm:h-28 relative z-20 pointer-events-none flex items-center justify-center" style={{ filter: fireFilter }}>
          {reduceMotion ? <Flame aria-hidden="true" className="h-full w-full" style={{ color: streakColor }} /> : (
            <React.Suspense fallback={<Flame aria-hidden="true" className="h-full w-full" style={{ color: streakColor }} />}>
              <LottieFire style={{ width: '100%', height: '100%', transform: 'scale(1.25)' }} />
            </React.Suspense>
          )}
        </motion.div>
        <p className="streak-number text-[90px] sm:text-[110px] leading-none font-extrabold mb-0 tracking-tighter relative translate-y-[2px] sm:translate-y-[4px]" style={{ color: streakColor, textShadow: '0 4px 0px rgba(0,0,0,0.3)' }}>{studentStreak}</p>
      </div>
      <h2 className="text-lg sm:text-xl font-bold mb-3 md:mb-5 tracking-wide mt-1" style={{ color: streakColor }}>Session Streak</h2>

      <div className="flex flex-wrap gap-x-1.5 gap-y-2 mb-4 w-full justify-center px-1">
        {MILESTONES.map((day, i) => {
          if (i < startIdx || i >= startIdx + maxVisible) return null;
          const isChecked = i < studentStreak;
          const isCurrent = i === studentStreak;

          return (
            <div key={day} className="streak-milestone flex flex-col items-center gap-1 w-[30px] sm:w-[34px]">
              <span className={cn('font-bold text-[9px] sm:text-[10px]', isCurrent ? '' : 'text-white/40')} style={isCurrent ? { color: streakColor } : {}}>{day}</span>
              <div className={cn('w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border-[2px]', !isChecked && 'bg-white/5 border-white/5')} style={isChecked ? { backgroundColor: streakColor, borderColor: streakColor, color: '#000' } : {}}>
                {isChecked && <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" />}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-white/70 font-medium text-xs sm:text-base mb-3 sm:mb-5 text-center px-2">{studentStreak > 0 ? 'Keep attending to build your streak.' : 'Attend your next session to start a streak.'}</p>
      <motion.button
        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        onClick={() => setExpandedCard(null)}
        className="streak-btn w-[90%] max-w-[240px] bg-[#1cb0f6] hover:bg-[#1899d6] text-white font-extrabold text-sm sm:text-base py-3 sm:py-3.5 rounded-2xl uppercase tracking-widest transition-colors shadow-[0_4px_0_#1899d6]"
      >
        Continue
      </motion.button>
    </div>
  );
}
