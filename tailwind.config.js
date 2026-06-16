/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0d0d12',
          secondary: '#12121a',
          card: '#1a1a2e',
          hover: '#1e1e35',
          overlay: 'rgba(0,0,0,0.85)'
        },
        accent: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
          glow: 'rgba(124,58,237,0.4)',
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95'
        },
        slate: {
          950: '#020617'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'card-gradient': 'linear-gradient(135deg, #1a1a2e 0%, #12121a 100%)',
        'hero-gradient': 'linear-gradient(to right, rgba(13,13,18,1) 30%, transparent 70%)',
        'bottom-fade': 'linear-gradient(to top, #0d0d12 0%, transparent 100%)'
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(124,58,237,0.3)',
        'glow': '0 0 20px rgba(124,58,237,0.5)',
        'glow-sm': '0 0 10px rgba(124,58,237,0.3)'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(124,58,237,0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(124,58,237,0.7)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' }
        }
      }
    }
  },
  plugins: []
}
