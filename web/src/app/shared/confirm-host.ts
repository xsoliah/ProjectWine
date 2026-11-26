import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmService } from '../core/confirm.service';
import { Modal } from './modal';

@Component({
  selector: 'app-confirm-host',
  imports: [Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirm.pending(); as request) {
      <app-modal [label]="request.title" (closed)="confirm.answer(false)">
        <h2>{{ request.title }}</h2>
        <p>{{ request.message }}</p>
        <div class="actions">
          <button type="button" class="btn" (click)="confirm.answer(false)">Abbrechen</button>
          <button
            type="button"
            class="btn"
            [class.btn-danger]="request.danger"
            [class.btn-primary]="!request.danger"
            (click)="confirm.answer(true)"
          >
            {{ request.confirmLabel }}
          </button>
        </div>
      </app-modal>
    }
  `,
})
export class ConfirmHost {
  protected readonly confirm = inject(ConfirmService);
}
