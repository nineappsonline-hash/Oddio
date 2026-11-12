export const colors = {
  background: '#090912',
  surface: '#171728',
  surfaceRaised: '#1F1F35',
  border: '#2A2A44',
  primary: '#9D5CFF',
  primaryStrong: '#7C3AED',
  accentCoral: '#FF725E',
  accentCyan: '#41D9FF',
  textPrimary: '#F5F5FA',
  textMuted: '#A8A8BA',
  success: '#3DDC97',
  warning: '#FFB020',
  danger: '#FF5C7A',
} as const;

export const radii = {
  sm: '12px',
  md: '16px',
  lg: '20px',
  pill: '999px',
} as const;

export const fonts = {
  latin: 'var(--font-inter)',
  arabic: 'var(--font-cairo)',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

export type ColorToken = keyof typeof colors;
export type RadiusToken = keyof typeof radii;

export const tokens = { colors, radii, fonts, breakpoints } as const;
