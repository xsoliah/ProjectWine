import { contrastRatio } from './contrast';
import { DEFAULT_THEME, THEMES, effectiveScheme, parseTheme } from './themes';

describe('parseTheme', () => {
  it('accepts every known theme', () => {
    for (const theme of THEMES) expect(parseTheme(theme.id)).toBe(theme.id);
  });

  it('falls back to Klassik for unknown, empty or missing values', () => {
    expect(parseTheme('gibtsnicht')).toBe(DEFAULT_THEME);
    expect(parseTheme('')).toBe(DEFAULT_THEME);
    expect(parseTheme(null)).toBe(DEFAULT_THEME);
    expect(parseTheme(undefined)).toBe(DEFAULT_THEME);
  });
});

describe('effectiveScheme', () => {
  it('lets Klassik follow the device', () => {
    expect(effectiveScheme('klassik', true)).toBe('dark');
    expect(effectiveScheme('klassik', false)).toBe('light');
  });

  it('keeps fixed themes independent of the device', () => {
    expect(effectiveScheme('pergament', true)).toBe('light');
    expect(effectiveScheme('nacht', false)).toBe('dark');
    expect(effectiveScheme('bordeaux', false)).toBe('dark');
    expect(effectiveScheme('riesling', true)).toBe('light');
    expect(effectiveScheme('rose', true)).toBe('light');
  });
});

describe('contrastRatio', () => {
  it('knows the extremes', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777', '#777')).toBe(1);
  });
});

describe('theme palettes', () => {
  for (const theme of THEMES) {
    it(`${theme.title}: text, soft text, accent and buttons are readable`, () => {
      const p = theme.palette;
      expect(contrastRatio(p.ink, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.ink, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.inkSoft, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.inkSoft, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.accent, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.onButton, p.button)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
