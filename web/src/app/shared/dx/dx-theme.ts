/**
 * Lädt das DevExtreme-Stylesheet passend zum Schema des gewählten Themes (hell/dunkel, siehe ThemeService) und tauscht
 * es beim Wechsel. Wird nur von den DevExtreme-Komponenten importiert und wartet per Top-Level-await, bis das
 * Stylesheet da ist, bevor DevExtreme selbst initialisiert wird.
 * Die Stylesheets liegen als Assets unter `dx/` (siehe angular.json), damit Kacheln und App-Start sie nicht laden.
 */
import { THEME_CHANGE_EVENT } from '../../core/theme.service';

const LINK_ID = 'dx-theme';

function href(): string {
  return document.documentElement.dataset['scheme'] === 'dark' ? 'dx/dx.dark.css' : 'dx/dx.light.css';
}

/** Neues Stylesheet erst einhängen, wenn es geladen ist, und dann das alte entfernen (kein ungestylter Moment). */
function swap(): void {
  const current = document.getElementById(LINK_ID) as HTMLLinkElement | null;
  if (!current || current.getAttribute('href') === href()) return;
  const next = document.createElement('link');
  next.rel = 'stylesheet';
  next.href = href();
  const done = () => {
    current.remove();
    next.id = LINK_ID;
  };
  next.addEventListener('load', done, { once: true });
  next.addEventListener('error', done, { once: true });
  current.after(next);
}

function loadTheme(): Promise<void> {
  if (document.getElementById(LINK_ID)) return Promise.resolve();
  const link = document.createElement('link');
  link.id = LINK_ID;
  link.rel = 'stylesheet';
  link.href = href();
  document.head.appendChild(link);
  window.addEventListener(THEME_CHANGE_EVENT, swap);
  return new Promise((resolve) => {
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
  });
}

await loadTheme();

export {};
