import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TokenResponse } from './models';
import { StorageService } from './storage.service';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly refreshTokenValue = signal<string | null>(null);
  private pendingRefresh: Promise<boolean> | null = null;

  readonly accessToken = signal<string | null>(null);
  readonly isAuthenticated = computed(() => this.accessToken() !== null);

  async init(): Promise<void> {
    this.accessToken.set(await this.storage.get(ACCESS_KEY));
    this.refreshTokenValue.set(await this.storage.get(REFRESH_KEY));
  }

  async login(email: string, password: string): Promise<void> {
    const tokens = await firstValueFrom(
      this.http.post<TokenResponse>('/api/auth/login', { email, password }),
    );
    await this.storeTokens(tokens);
  }

  async register(email: string, password: string): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/register', { email, password }));
    await this.login(email, password);
  }

  async logout(): Promise<void> {
    this.accessToken.set(null);
    this.refreshTokenValue.set(null);
    await Promise.all([this.storage.remove(ACCESS_KEY), this.storage.remove(REFRESH_KEY)]);
  }

  /** Resolves true when a new access token was obtained; concurrent callers share one request. */
  refresh(): Promise<boolean> {
    this.pendingRefresh ??= this.doRefresh().finally(() => (this.pendingRefresh = null));
    return this.pendingRefresh;
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = this.refreshTokenValue();
    if (!refreshToken) {
      return false;
    }
    try {
      const tokens = await firstValueFrom(
        this.http.post<TokenResponse>('/api/auth/refresh', { refreshToken }),
      );
      await this.storeTokens(tokens);
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) {
        return false;
      }
      throw error;
    }
  }

  private async storeTokens(tokens: TokenResponse): Promise<void> {
    this.accessToken.set(tokens.accessToken);
    this.refreshTokenValue.set(tokens.refreshToken);
    await Promise.all([
      this.storage.set(ACCESS_KEY, tokens.accessToken),
      this.storage.set(REFRESH_KEY, tokens.refreshToken),
    ]);
  }
}
