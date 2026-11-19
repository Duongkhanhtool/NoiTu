import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        display: ['"Baloo 2"', '"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      colors: {
        game: {
          sky: '#42A5F5',
          coral: '#FF6D3F',
          mint: '#4CAF50',
          sun: '#FFB300',
          grape: '#AB47BC',
          rose: '#EF5350',
          ocean: '#29B6F6',
          pink: '#F06292',
          lime: '#9CCC65',
          cyan: '#26C6DA',
          orange: '#FFA726',
          peach: '#FFAB91',
        },
        surface: {
          light: '#FFFDF7',
          card: '#FFFFFF',
          dark: '#121225',
          'card-dark': '#1E1E38',
        },
      },
      borderRadius: {
        bubble: '1.5rem',
        kiddy: '2rem',
      },
      boxShadow: {
        'fun': '0 4px 20px -4px rgba(255, 109, 63, 0.3)',
        'fun-lg': '0 8px 30px -4px rgba(255, 109, 63, 0.4)',
        'ocean': '0 4px 20px -4px rgba(41, 182, 246, 0.35)',
        'mint': '0 4px 20px -4px rgba(76, 175, 80, 0.35)',
        'grape': '0 4px 20px -4px rgba(171, 71, 188, 0.35)',
        'sun': '0 4px 20px -4px rgba(255, 179, 0, 0.35)',
        'glow': '0 0 20px rgba(255, 109, 63, 0.2), 0 0 60px rgba(255, 109, 63, 0.1)',
      },
      animation: {
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'pulse-ring': 'pulseRing 1.5s ease-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'wiggle-slow': 'wiggle 2.5s ease-in-out infinite',
        'pop': 'pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'float-bounce': 'floatBounce 3s ease-in-out infinite',
        'sparkle': 'sparkle 1.5s ease-in-out infinite',
        'rainbow': 'rainbow 4s linear infinite',
        'confetti': 'confetti 1.2s ease-out forwards',
        'jelly': 'jelly 0.5s ease-in-out',
        'swing': 'swing 1s ease-in-out infinite',
        'tada': 'tada 1s ease-in-out',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.08)' },
          '70%': { transform: 'scale(0.92)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.8)', opacity: '0.5' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(1rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        pop: {
          '0%': { transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        floatBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.8) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.2) rotate(180deg)' },
        },
        rainbow: {
          '0%': { filter: 'hue-rotate(0deg)' },
          '100%': { filter: 'hue-rotate(360deg)' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(80vh) rotate(720deg)', opacity: '0' },
        },
        jelly: {
          '0%': { transform: 'scale(1, 1)' },
          '25%': { transform: 'scale(0.9, 1.1)' },
          '50%': { transform: 'scale(1.1, 0.9)' },
          '75%': { transform: 'scale(0.95, 1.05)' },
          '100%': { transform: 'scale(1, 1)' },
        },
        swing: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(10deg)' },
          '75%': { transform: 'rotate(-10deg)' },
        },
        tada: {
          '0%': { transform: 'scale(1) rotate(0deg)' },
          '10%, 20%': { transform: 'scale(0.9) rotate(-3deg)' },
          '30%, 50%, 70%, 90%': { transform: 'scale(1.1) rotate(3deg)' },
          '40%, 60%, 80%': { transform: 'scale(1.1) rotate(-3deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
