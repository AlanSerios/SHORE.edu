/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        card: 'var(--color-card)',
        sidebar: 'var(--color-sidebar)',
        border: 'var(--color-border)',
        borderHover: 'var(--color-borderHover)',
        fg: 'var(--color-fg)',
        muted: 'var(--color-muted)',
        primary: 'var(--color-primary)',
        primaryHover: 'var(--color-primaryHover)',
        accentBlue: 'var(--color-accentBlue)',
        accentGreen: 'var(--color-accentGreen)',
        accentGreenFg: 'var(--color-accentGreenFg)',
        accentRed: 'var(--color-accentRed)',
        accentRedFg: 'var(--color-accentRedFg)'
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'SF Pro Display', 'Helvetica Neue', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
