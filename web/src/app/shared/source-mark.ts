import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FieldSource } from '../core/models';

const TEXT: Record<FieldSource, { label: string; title: string }> = {
  Label: { label: 'Etikett', title: 'Vom Etikett gelesen' },
  Web: { label: 'Web', title: 'Aus dem Web recherchiert' },
  Estimate: { label: 'geschätzt', title: 'Aus Rebsorte, Region, Jahrgang und Stil geschätzt' },
  Derived: { label: 'abgeleitet', title: 'Aus dem Trinkfenster abgeleitet' },
};

/** Small marker next to a form label: the value came from the label photo, the web, an estimate or was derived. */
@Component({
  selector: 'app-source-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (source(); as s) {<span class="mark" [attr.data-source]="s"
    [attr.title]="text[s].title">{{ text[s].label }}</span>}`,
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
    .mark[data-source='Web'],
    .mark[data-source='Estimate'],
    .mark[data-source='Derived'] {
      color: var(--state-early);
    }
  `,
})
export class SourceMark {
  readonly source = input<FieldSource | null | undefined>(null);
  protected readonly text = TEXT;
}
