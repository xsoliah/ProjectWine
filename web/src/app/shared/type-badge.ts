import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { wineTypeLabel } from '../core/labels';
import { WineType } from '../core/models';

@Component({
  selector: 'app-type-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="dot" aria-hidden="true"></span>{{ label() }}`,
  host: { '[attr.data-type]': 'type()' },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.1rem 0.6rem 0.1rem 0.5rem;
      border: 1px solid color-mix(in srgb, var(--type-color) 55%, transparent);
      border-radius: 999px;
      background: color-mix(in srgb, var(--type-color) 14%, var(--surface));
      font-size: 0.8125rem;
      white-space: nowrap;
    }
    .dot {
      width: 0.6rem;
      height: 0.6rem;
      border-radius: 50%;
      background: var(--type-color);
    }
  `,
})
export class TypeBadge {
  readonly type = input.required<WineType>();
  protected readonly label = computed(() => wineTypeLabel(this.type()));
}
