export const colors = {
  background: '#080808',
  surface: '#131313',
  surfaceRaised: '#202020',
  border: '#323232',
  primary: '#F1F1F1',
  primaryStrong: '#D5D5D5',
  accentCoral: '#A4A4A4',
  accentCyan: '#BDBDBD',
  textPrimary: '#F7F7F7',
  textMuted: '#A1A1A1',
  success: '#69D4A3',
  warning: '#E9B76C',
  danger: '#F17E8F',
} as const;

export const radii = { sm: '12px', md: '16px', lg: '20px', pill: '999px' } as const;
export const fonts = { latin: 'var(--font-inter)', arabic: 'var(--font-cairo)' } as const;
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;
export type ColorToken = keyof typeof colors;
export type RadiusToken = keyof typeof radii;
export const tokens = { colors, radii, fonts, breakpoints } as const;
