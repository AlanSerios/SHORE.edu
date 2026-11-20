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
