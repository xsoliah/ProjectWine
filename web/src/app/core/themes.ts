/** Theme-Katalog. Die vollständigen Tokens stehen in styles.css; hier die Kernfarben für Vorschau und Kontrasttest. */
export type ThemeId = 'klassik' | 'pergament' | 'nacht' | 'bordeaux' | 'riesling' | 'rose';
export type Scheme = 'light' | 'dark';

export interface ThemePalette {
  bg: string;
  surface: string;
  ink: string;
  inkSoft: string;
  accent: string;
  /** Fläche der Hauptknöpfe und der Text darauf. */
  button: string;
  onButton: string;
}

export interface ThemeInfo {
  id: ThemeId;
  title: string;
  /** `auto`: folgt dem Hell/Dunkel-Modus des Geräts. */
  scheme: Scheme | 'auto';
  /** Farbe der Browserleiste. */
  themeColor: string;
  /** Vorschau-Farben (Fläche, Akzent, Navigation). */
  swatch: [string, string, string];
  palette: ThemePalette;
}

const PERGAMENT: ThemePalette = {
  bg: '#ece2cc',
  surface: '#f8f2e4',
  ink: '#2b1a1c',
  inkSoft: '#66544f',
  accent: '#6b1b2e',
  button: '#6b1b2e',
  onButton: '#f8f2e4',
};

const KLASSIK_DARK: ThemePalette = {
  bg: '#181516',
  surface: '#231f20',
  ink: '#eee3cf',
  inkSoft: '#b5a899',
  accent: '#e39aa9',
  button: '#8e2a40',
  onButton: '#f8f2e4',
};

export const THEMES: readonly ThemeInfo[] = [
  {
    id: 'klassik',
    title: 'Klassik',
    scheme: 'auto',
    themeColor: '#3f0f1c',
    swatch: ['#f8f2e4', '#6b1b2e', '#3f0f1c'],
    palette: PERGAMENT,
  },
  {
    id: 'pergament',
    title: 'Pergament',
    scheme: 'light',
    themeColor: '#3f0f1c',
    swatch: ['#f8f2e4', '#6b1b2e', '#3f0f1c'],
    palette: PERGAMENT,
  },
  {
    id: 'nacht',
    title: 'Nacht',
    scheme: 'dark',
    themeColor: '#0b0d10',
    swatch: ['#181b21', '#c9a24a', '#0b0d10'],
    palette: {
      bg: '#101216',
      surface: '#181b21',
      ink: '#e9e7e2',
      inkSoft: '#a9adb7',
      accent: '#e6c15a',
      button: '#c9a24a',
      onButton: '#17130a',
    },
  },
  {
    id: 'bordeaux',
    title: 'Bordeaux',
    scheme: 'dark',
    themeColor: '#1d0710',
    swatch: ['#3a1220', '#b0324f', '#1d0710'],
    palette: {
      bg: '#2a0c15',
      surface: '#3a1220',
      ink: '#f6e9e4',
      inkSoft: '#d1b0b2',
      accent: '#f4adbb',
      button: '#b0324f',
      onButton: '#fff6f2',
    },
  },
  {
    id: 'riesling',
    title: 'Riesling',
    scheme: 'light',
    themeColor: '#1b3a20',
    swatch: ['#f5f8ec', '#3f6b3a', '#1b3a20'],
    palette: {
      bg: '#e4ebd3',
      surface: '#f5f8ec',
      ink: '#1f2a1c',
      inkSoft: '#515f4b',
      accent: '#2f5a2c',
      button: '#3f6b3a',
      onButton: '#f5f8ec',
    },
  },
  {
    id: 'rose',
    title: 'Rosé',
    scheme: 'light',
    themeColor: '#5a1a3a',
    swatch: ['#fdf1ef', '#b0336a', '#5a1a3a'],
    palette: {
      bg: '#f7e0df',
      surface: '#fdf1ef',
      ink: '#3a1b26',
      inkSoft: '#764f5b',
      accent: '#98285a',
      button: '#b0336a',
      onButton: '#fff5f6',
    },
  },
];

export const DEFAULT_THEME: ThemeId = 'klassik';

/** Speicherschlüssel; index.html liest denselben Schlüssel vor dem ersten Rendern. */
export const THEME_STORAGE_KEY = 'theme';

/** Unbekannte oder beschädigte Werte gelten als „keine Wahl“. */
export function parseTheme(value: unknown): ThemeId {
  return THEMES.some((theme) => theme.id === value) ? (value as ThemeId) : DEFAULT_THEME;
}

export function themeInfo(id: ThemeId): ThemeInfo {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

/** Hell oder dunkel: feste Themes immer ihr eigenes Schema, Klassik folgt dem Gerät. */
export function effectiveScheme(id: ThemeId, prefersDark: boolean): Scheme {
  const { scheme } = themeInfo(id);
  return scheme === 'auto' ? (prefersDark ? 'dark' : 'light') : scheme;
}
