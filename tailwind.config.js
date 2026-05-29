/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
        '3xl': '1600px',
      },
      colors: {
        // Wolt/iOS-inspired luxury dark palette
        ink: {
          950: '#0A0B0F',
          900: '#0E0F14',
          850: '#13141B',
          800: '#181922',
          700: '#23252F',
          600: '#2E3140',
        },
        accent: {
          // Purple — matches the brand logo. Tuned for dark UI.
          50:  '#F5EEFF',
          100: '#E7D8FF',
          200: '#CFB1FF',
          300: '#B587FF',
          400: '#9D63FB',
          500: '#8B49F2', // primary
          600: '#7536D8',
          700: '#5A27B0',
        },
        rarity: {
          consumer:   '#B0C3D9',
          industrial: '#5E98D9',
          milspec:    '#4B69FF',
          restricted: '#8847FF',
          classified: '#D32CE6',
          covert:     '#EB4B4B',
          contraband: '#E4AE39',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
        display: ['Inter', '-apple-system', 'SF Pro Display', 'sans-serif'],
      },
      borderRadius: {
        'xl2': '1.25rem',
        '2xl2': '1.75rem',
        '3xl2': '2.25rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'fadeIn': 'fadeIn 0.2s ease-out',
        'fadeInDown': 'fadeInDown 0.8s ease-out',
        'fadeInUp': 'fadeInUp 0.8s ease-out',
        'fadeInLeft': 'fadeInLeft 0.8s ease-out',
        'fadeInRight': 'fadeInRight 0.8s ease-out',
        'glow': 'glow 8s ease-in-out infinite',
        'float': 'float 12s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glow: {
          '0%, 100%': {
            'filter': 'drop-shadow(0 0 0.5px rgba(59,130,246,0.05))',
            transform: 'scale(1)'
          },
          '50%': {
            'filter': 'drop-shadow(0 0 0.5px rgba(59,130,246,0.08))',
            transform: 'scale(1)'
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      spacing: {
        '128': '32rem',
      },
      fontSize: {
        '7xl': '5rem',
        '8xl': '6rem',
        '9xl': '7rem',
      },
      boxShadow: {
        'glow': '0 0 15px rgba(59,130,246,0.5)',
        'glow-lg': '0 0 30px rgba(59,130,246,0.8)',
        'purple-glow': '0 0 20px rgba(168, 85, 247, 0.4)',
        'green-glow': '0 0 20px rgba(34, 197, 94, 0.4)',
        'pink-glow': '0 0 20px rgba(236, 72, 153, 0.4)',
        'slate-glow': '0 0 20px rgba(71, 85, 105, 0.4)',
        // Wolt/iOS layered soft shadows
        'soft':   '0 1px 2px rgba(0,0,0,0.30), 0 8px 24px -8px rgba(0,0,0,0.40)',
        'soft-lg':'0 2px 4px rgba(0,0,0,0.30), 0 24px 48px -12px rgba(0,0,0,0.55)',
        'lift':   '0 30px 60px -20px rgba(0,0,0,0.65), 0 8px 24px -12px rgba(0,0,0,0.50)',
        'accent-glow': '0 10px 30px -10px rgba(139, 73, 242, 0.65)',
        'accent-glow-lg': '0 20px 50px -10px rgba(139, 73, 242, 0.75)',
        'inner-hairline': 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1.5rem',
          lg: '2rem',
          xl: '2.5rem',
          '2xl': '3rem',
        },
      },
    },
  },
  plugins: [],
};