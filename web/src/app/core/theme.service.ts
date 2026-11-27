import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { THEME_STORAGE_KEY, ThemeId, Scheme, effectiveScheme, parseTheme, themeInfo } from './themes';

/** Ereignis für Code außerhalb von Angular (z. B. das DevExtreme-Stylesheet), wenn sich Theme oder Schema ändern. */
export const THEME_CHANGE_EVENT = 'app-themechange';

/** Wählt das Theme, setzt `data-theme`/`data-scheme`/`theme-color` und merkt die Wahl auf dem Gerät. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage = inject(StorageService);
  private readonly dark = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  private changeTimer: ReturnType<typeof setTimeout> | undefined;

  readonly theme = signal<ThemeId>(parseTheme(document.documentElement.dataset['theme']));
  readonly scheme = signal<Scheme>(effectiveScheme(this.theme(), this.dark?.matches ?? false));

  async init(): Promise<void> {
    // index.html hat das gemerkte Theme schon gesetzt; auf nativen Geräten kommt der Wert aus den Preferences.
    this.apply(parseTheme(await this.storage.get(THEME_STORAGE_KEY)), false);
    this.dark?.addEventListener('change', () => this.apply(this.theme(), false));
  }

  async set(id: ThemeId): Promise<void> {
    this.apply(id, true);
    await this.storage.set(THEME_STORAGE_KEY, id);
    // Spiegel für das Vorab-Skript in index.html (auf nativen Geräten liegen die Preferences sonst woanders).
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // Storage unavailable: the choice then lasts for this session only.
    }
  }

  private apply(id: ThemeId, animate: boolean): void {
    const root = document.documentElement;
    const scheme = effectiveScheme(id, this.dark?.matches ?? false);
    if (animate) {
      root.classList.add('theme-changing');
      clearTimeout(this.changeTimer);
      this.changeTimer = setTimeout(() => root.classList.remove('theme-changing'), 300);
    }
    root.dataset['theme'] = id;
    root.dataset['scheme'] = scheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeInfo(id).themeColor);
    this.theme.set(id);
    this.scheme.set(scheme);
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
  }
}
