import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FieldSource } from '../core/models';

/** Small marker next to a form label: the value came from the label photo or from the web. */
@Component({
  selector: 'app-source-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (source(); as s) {<span class="mark" [attr.data-source]="s"
    [attr.title]="s === 'Web' ? 'Aus dem Web recherchiert' : 'Vom Etikett gelesen'">{{ s === 'Web' ? 'Web' : 'Etikett' }}</span>}`,
  styles: `
    .mark {
      display: inline-block;
      margin-left: var(--space-2);
      padding: 0 0.45rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.4rem;
      vertical-align: middle;
      border: 1px solid currentColor;
    }
    .mark[data-source='Label'] {
      color: var(--state-ready);
    }
    .mark[data-source='Web'] {
      color: var(--state-early);
    }
  `,
})
export class SourceMark {
  readonly source = input<FieldSource | null | undefined>(null);
}
