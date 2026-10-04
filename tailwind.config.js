/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#16151a', soft: '#211f27', line: 'rgba(247,243,236,0.12)' },
        bone: { DEFAULT: '#f6f2ea', 100: '#fbf9f5' },
        copper: { DEFAULT: '#b8703e', soft: '#f1e2d3' },
        slate: { DEFAULT: '#5b6472', soft: '#e5e8ec' },
        clay: { DEFAULT: '#a85c3b', soft: '#f0ddd3' },
        sage: { DEFAULT: '#6e7f63', soft: '#e3e8df' },
        rose: { DEFAULT: '#b5677a', soft: '#f3e1e5' },
        indigo2: { DEFAULT: '#5a5fa8', soft: '#e4e4f2' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(32,30,36,0.04), 0 1px 12px rgba(32,30,36,0.04)',
      },
    },
  },
  plugins: [],
};
