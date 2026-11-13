export const colors = {
  background: '#100C0D',
  surface: '#201518',
  surfaceRaised: '#302024',
  border: '#493237',
  primary: '#EAB997',
  primaryStrong: '#C88768',
  accentCoral: '#C77D70',
  accentCyan: '#B79A88',
  textPrimary: '#F8F0E9',
  textMuted: '#C9B6AE',
  success: '#69D4A3',
  warning: '#E9B76C',
  danger: '#F17E8F',
} as const;

export const radii = { sm: '12px', md: '16px', lg: '20px', pill: '999px' } as const;
export const fonts = { latin: 'var(--font-inter)', arabic: 'var(--font-cairo)' } as const;
export const breakpoints = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' } as const;
export type ColorToken = keyof typeof colors;
export type RadiusToken = keyof typeof radii;
export const tokens = { colors, radii, fonts, breakpoints } as const;
