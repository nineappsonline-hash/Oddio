import type { Config } from 'tailwindcss';
import { colors, radii } from '@ai-music/ui';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx,mdx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/contracts/src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: colors.background,
        surface: colors.surface,
        raised: colors.surfaceRaised,
        line: colors.border,
        primary: colors.primary,
        'primary-strong': colors.primaryStrong,
        coral: colors.accentCoral,
        cyan: colors.accentCyan,
        ink: colors.textPrimary,
        muted: colors.textMuted,
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
      },
      borderRadius: {
        card: radii.md,
        xl2: radii.lg,
        pill: radii.pill,
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-cairo)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -12px rgba(90, 92, 96, 0.20)',
        'glow-lg': '0 0 80px -20px rgba(90, 92, 96, 0.25)',
        card: '0 18px 40px -24px rgba(0, 0, 0, 0.9)',
        'card-hover': '0 28px 70px -28px rgba(90, 92, 96, 0.16)',
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg, rgba(78,80,84,0.38) 0%, rgba(35,36,39,0.24) 50%, rgba(18,19,22,0.40) 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'bar-pulse': {
          '0%, 100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -16px, 0)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-160%) skewX(-12deg)' },
          '100%': { transform: 'translateX(260%) skewX(-12deg)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-ring': {
          '0%': { opacity: '0.55', transform: 'scale(0.92)' },
          '75%, 100%': { opacity: '0', transform: 'scale(1.18)' },
        },
        equalize: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'page-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 420ms ease-out both',
        'bar-pulse': 'bar-pulse 900ms ease-in-out infinite',
        'float-slow': 'float-slow 7s ease-in-out infinite',
        'spin-slow': 'spin-slow 26s linear infinite',
        shimmer: 'shimmer 1.6s ease-in-out',
        'gradient-pan': 'gradient-pan 8s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.4s ease-out infinite',
        equalize: 'equalize 900ms ease-in-out infinite',
        'page-in': 'page-in 500ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
