/**
 * Lädt das DevExtreme-Theme passend zum Gerät (hell/dunkel). Wird nur von den DevExtreme-Komponenten importiert und
 * wartet per Top-Level-await, bis das Stylesheet da ist, bevor DevExtreme selbst initialisiert wird.
 * Die Stylesheets liegen als Assets unter `dx/` (siehe angular.json), damit Kacheln und App-Start sie nicht laden.
 */
const LINK_ID = 'dx-theme';
const dark = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

function href(): string {
  return dark?.matches ? 'dx/dx.dark.css' : 'dx/dx.light.css';
}

function loadTheme(): Promise<void> {
  let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
  if (link) return Promise.resolve();
  link = document.createElement('link');
  link.id = LINK_ID;
  link.rel = 'stylesheet';
  link.href = href();
  document.head.appendChild(link);
  dark?.addEventListener('change', () => {
    link!.href = href();
  });
  return new Promise((resolve) => {
    link!.addEventListener('load', () => resolve(), { once: true });
    link!.addEventListener('error', () => resolve(), { once: true });
  });
}

await loadTheme();

export {};
