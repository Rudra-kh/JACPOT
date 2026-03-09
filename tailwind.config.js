/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#020c18',
        cyan: {
          hud: '#00c8ff',
          dim: 'rgba(0,200,255,0.45)',
          glow: 'rgba(0,200,255,0.15)',
        },
        orange: {
          hud: '#ff6b2b',
        },
        green: {
          hud: '#00ff88',
        },
        gold: '#ffd700',
        text: {
          primary: '#c8eeff',
          dim: 'rgba(200,238,255,0.45)',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
        raj: ['Rajdhani', 'sans-serif'],
      },
      boxShadow: {
        hud: '0 0 12px rgba(0,200,255,0.4)',
        'hud-sm': '0 0 6px rgba(0,200,255,0.3)',
        'hud-lg': '0 0 24px rgba(0,200,255,0.5)',
        orange: '0 0 12px rgba(255,107,43,0.5)',
        green: '0 0 12px rgba(0,255,136,0.4)',
      },
      animation: {
        'scan-line': 'scanLine 3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 4s linear infinite',
        blink: 'blink 1s step-end infinite',
        'fade-in': 'fadeIn 0.5s ease forwards',
        'slide-in': 'slideIn 0.3s ease forwards',
        scanlines: 'scanlines 8s linear infinite',
      },
      keyframes: {
        scanLine: {
          '0%': { opacity: '0', left: '-100%' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0', left: '110%' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 4px rgba(0,200,255,0.3)' },
          '50%': { boxShadow: '0 0 16px rgba(0,200,255,0.8)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scanlines: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100%' },
        },
      },
    },
  },
  plugins: [],
}
