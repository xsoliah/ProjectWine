import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class.error]="toast.kind === 'error'">
          <span>{{ toast.text }}</span>
          <button type="button" class="btn-link" (click)="toasts.dismiss(toast.id)">
            Schließen
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      z-index: 100;
      inset: auto var(--space-4) calc(var(--tabbar-height) + var(--space-4)) var(--space-4);
      display: grid;
      gap: var(--space-2);
      justify-items: center;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      max-width: 36rem;
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-m);
      background: var(--ink);
      color: var(--surface);
      box-shadow: var(--shadow-lifted);
      pointer-events: auto;
    }
    .toast.error {
      background: var(--danger);
      color: #fff;
    }
    .toast .btn-link {
      color: inherit;
    }
    @media (min-width: 960px) {
      .toasts {
        inset-block-end: var(--space-5);
      }
    }
  `,
})
export class ToastHost {
  protected readonly toasts = inject(ToastService);
}
