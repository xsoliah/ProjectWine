import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-stepper',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="btn btn-icon"
      [attr.aria-label]="'Weniger'"
      [disabled]="value() <= min()"
      (click)="value.set(value() - 1)"
    >
      <app-icon name="minus" />
    </button>
    <output [attr.aria-label]="label()">{{ value() }}</output>
    <button
      type="button"
      class="btn btn-icon"
      [attr.aria-label]="'Mehr'"
      [disabled]="max() !== null && value() >= max()!"
      (click)="value.set(value() + 1)"
    >
      <app-icon name="plus" />
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
    }
    output {
      min-width: 2.5ch;
      text-align: center;
      font-family: var(--font-display);
      font-size: 1.5rem;
    }
  `,
})
export class Stepper {
  readonly value = model(1);
  readonly min = input(1);
  readonly max = input<number | null>(null);
  readonly label = input('Anzahl');
}
