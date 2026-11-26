import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiConfigService, isValidServerUrl } from '../../core/api-config.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.html',
})
export class Settings {
  protected readonly config = inject(ApiConfigService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly url = signal(this.config.baseUrl());
  protected readonly invalid = signal(false);

  protected async save(): Promise<void> {
    if (!isValidServerUrl(this.url())) {
      this.invalid.set(true);
      return;
    }
    this.invalid.set(false);
    await this.config.setServerUrl(this.url());
    this.toast.info('Server-Adresse gespeichert.');
    await this.router.navigateByUrl('/');
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
