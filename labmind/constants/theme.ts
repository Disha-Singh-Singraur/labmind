export const Colors = {
  background: '#080C14',
  surface: '#0D1117',
  card: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#00D4FF',
  accentGlow: 'rgba(0,212,255,0.15)',
  accentDim: 'rgba(0,212,255,0.4)',
  purple: '#7C3AED',
  warning: '#FF6B35',
  warningBg: 'rgba(255,107,53,0.1)',
  danger: '#FF3B30',
  dangerBg: 'rgba(255,59,48,0.1)',
  success: '#00FF94',
  successBg: 'rgba(0,255,148,0.1)',
  textPrimary: '#E8EDF5',
  textSecondary: '#5A6478',
  textDim: '#2A3245',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.12)',
} as const;

export const Typography = {
  fontHeading: 'SpaceGrotesk_600SemiBold',
  fontBody: 'SpaceGrotesk_400Regular',
  fontMono: 'JetBrainsMono_400Regular',
  fontMonoBold: 'JetBrainsMono_700Bold',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 6,
  lg: 8,
} as const;
