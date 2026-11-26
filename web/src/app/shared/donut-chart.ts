import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { computeArcs, ringPath } from './donut-chart.logic';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  percent: number;
  /** CSS color, e.g. "var(--chart-1)". */
  color: string;
}

/**
 * Ring chart: one segment per slice, the total in the middle. Hovering a segment (or the matching
 * legend row via the shared `active` key) shows its figures in the middle. The legend next to the
 * chart carries every value as text, so the SVG itself is decorative for assistive technology.
 */
@Component({
  selector: 'app-donut-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      @for (seg of segments(); track seg.key) {
        <path
          [attr.d]="seg.path"
          [style.fill]="seg.color"
          [class.dim]="active() !== null && active() !== seg.key"
          [class.clickable]="clickable()"
          (mouseenter)="active.set(seg.key)"
          (mouseleave)="active.set(null)"
          (click)="clickable() && picked.emit(seg.key)"
        />
      }
    </svg>
    <div class="center" aria-hidden="true">
      @if (activeSlice(); as s) {
        <span class="value">{{ s.value }}</span>
        <span class="label">{{ s.label }}</span>
        <span class="label">{{ s.percent }} %</span>
      } @else {
        <span class="value">{{ total() }}</span>
        <span class="label">{{ totalLabel() }}</span>
      }
    </div>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      width: 100%;
      max-width: 16rem;
      aspect-ratio: 1;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    path {
      stroke: var(--surface);
      stroke-width: 0.9;
      stroke-linejoin: round;
      transition: opacity 120ms ease;
    }
    path.dim {
      opacity: 0.3;
    }
    path.clickable {
      cursor: pointer;
    }
    .center {
      position: absolute;
      inset: 24%;
      display: grid;
      place-content: center;
      text-align: center;
      pointer-events: none;
    }
    .value {
      font-family: var(--font-display);
      font-size: clamp(1.75rem, 9vw, 2.5rem);
      font-weight: 600;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    .label {
      overflow: hidden;
      color: var(--ink-soft);
      font-size: 0.8125rem;
      line-height: 1.3;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class DonutChart {
  readonly slices = input.required<DonutSlice[]>();
  readonly total = input.required<number>();
  readonly totalLabel = input('Flaschen');
  /** Segments react to clicks (drill-down). */
  readonly clickable = input(false);
  /** Key of the highlighted slice, shared with the legend. */
  readonly active = model<string | null>(null);
  readonly picked = output<string>();

  protected readonly segments = computed(() => {
    const slices = this.slices();
    const arcs = computeArcs(slices.map((s) => s.value));
    return slices.map((s, i) => ({ ...s, path: ringPath(arcs[i], 50, 31) }));
  });

  protected readonly activeSlice = computed(
    () => this.slices().find((s) => s.key === this.active()) ?? null,
  );
}
