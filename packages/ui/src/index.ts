export const colors = {
  background: '#09071A',
  surface: '#17102D',
  surfaceRaised: '#241838',
  border: '#3D3154',
  primary: '#9D5CFF',
  primaryStrong: '#C180FF',
  accentCoral: '#FF8557',
  accentCyan: '#33B8FF',
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
