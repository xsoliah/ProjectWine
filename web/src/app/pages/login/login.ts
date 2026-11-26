import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiConfigService } from '../../core/api-config.service';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/errors';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly config = inject(ApiConfigService);

  protected readonly mode = signal<'login' | 'register'>('login');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected setMode(mode: 'login' | 'register'): void {
    this.mode.set(mode);
    this.error.set(null);
  }

  protected async submit(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.mode() === 'register') {
        await this.auth.register(this.email().trim(), this.password());
      } else {
        await this.auth.login(this.email().trim(), this.password());
      }
      await this.router.navigateByUrl('/');
    } catch (error) {
      const badCredentials =
        this.mode() === 'login' && error instanceof HttpErrorResponse && error.status === 401;
      this.error.set(badCredentials ? 'E-Mail oder Passwort ist falsch.' : errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
