export const colors = {
  background: '#0E0F11',
  surface: '#191A1D',
  surfaceRaised: '#252629',
  border: '#3D3F43',
  primary: '#B3B5BA',
  primaryStrong: '#E0E1E4',
  accentCoral: '#A4A6AA',
  accentCyan: '#84878D',
  textPrimary: '#F2F3F4',
  textMuted: '#A7A9AE',
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
