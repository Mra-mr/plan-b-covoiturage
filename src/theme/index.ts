/**
 * Design system BlaBlaCar — source unique de vérité pour les couleurs,
 * rayons, espacements et typographies. Aucun code d'écran ne doit
 * contenir de valeur hexadécimale ou de taille en dur.
 *
 * Tokens extraits du mockup « Covora App » (dossier blablacar2) :
 * fond gris très clair, cartes blanches bordées, boutons et champs en
 * pilule, titres en graisse 800, barre d'onglets flottante.
 */

export const colors = {
  primary: '#0071EB',
  primaryActive: '#0065D1',
  primarySoft: '#E6F2FE',
  focus: '#9DD0FF',
  ink: '#001536',
  inkMuted: '#576680',
  inkLight: '#8B96AB',
  border: 'rgba(48,50,51,0.12)',
  borderSubtle: 'rgba(48,50,51,0.08)',
  neutral: '#E9ECF0',
  surface: '#FFFFFF',
  background: '#F5F7FB',
  danger: '#C11417',
  dangerBorder: 'rgba(193,20,23,0.35)',
  dangerSoft: '#FDECEC',
  success: '#107046',
  successSoft: '#E7F3ED',
  warning: '#8C6301',
  warningAccent: '#FFCC56',
  warningSoft: '#FFF3D1',
} as const;

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  pill: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Hauteurs imposées par le design system (boutons pill 60 dp, champs 52 dp). */
export const sizes = {
  buttonHeight: 60,
  buttonSecondaryHeight: 52,
  buttonDangerHeight: 56,
  buttonSoftHeight: 48,
  buttonGhostHeight: 44,
  inputHeight: 52,
  chipHeight: 44,
  iconButton: 44,
  avatar: 48,
  avatarSm: 32,
  tabBarHeight: 64,
} as const;

/**
 * Police du design system : GT Eesti Pro Display, fallback Questrial.
 * Tant que les fichiers .ttf ne sont pas dans assets/fonts, on laisse
 * `undefined` pour utiliser la police système (voir CLAUDE.md).
 */
export const fonts = {
  display: undefined as string | undefined,
  body: undefined as string | undefined,
} as const;

export const typography = {
  h1: { fontSize: 30, lineHeight: 34, fontWeight: '800' as const, letterSpacing: -0.6, color: colors.ink },
  h2: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const, letterSpacing: -0.5, color: colors.ink },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const, color: colors.ink },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const, color: colors.ink },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, color: colors.inkMuted },
  sectionLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: colors.inkMuted,
  },
  price: { fontSize: 20, lineHeight: 26, fontWeight: '800' as const, color: colors.ink },
} as const;

export const shadow = {
  card: {
    shadowColor: colors.ink,
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tabBar: {
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;

export const theme = { colors, radii, spacing, sizes, fonts, typography, shadow };
export type Theme = typeof theme;
