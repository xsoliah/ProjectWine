import { Injectable, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StorageService } from './storage.service';

const SERVER_URL_KEY = 'serverUrl';

/** Where the API lives: relative URLs on the web, a user-supplied server on native platforms. */
@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  private readonly storage = inject(StorageService);
  private readonly stored = signal('');

  readonly isNative = Capacitor.isNativePlatform();
  readonly baseUrl = computed(() => (this.isNative ? this.stored() : ''));
  readonly needsSetup = computed(() => this.isNative && this.stored() === '');

  async init(): Promise<void> {
    this.stored.set(normalizeServerUrl((await this.storage.get(SERVER_URL_KEY)) ?? ''));
  }

  async setServerUrl(url: string): Promise<void> {
    const normalized = normalizeServerUrl(url);
    this.stored.set(normalized);
    await this.storage.set(SERVER_URL_KEY, normalized);
  }
}

export function normalizeServerUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function isValidServerUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeServerUrl(url));
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
