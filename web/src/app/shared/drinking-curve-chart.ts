import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  assess,
  axisRange,
  axisTicks,
  Curve,
  curvePaths,
  curveSummary,
  inRange,
  xOf,
} from '../core/drinking-curve.logic';

const WIDTH = 320;
const HEIGHT = 110;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

/**
 * Drinking curve of a wine: a bell curve over the years with the peak marked, a dashed line for the current year
 * and the standing in words. The SVG is decorative; the text next to it carries the same information.
 */
@Component({
  selector: 'app-drinking-curve-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (view(); as v) {
      <figure class="curve" [attr.data-state]="v.assessment.state">
        <figcaption>
          <strong class="standing">{{ v.assessment.label }}</strong>
          <span class="muted">{{ v.note }}</span>
        </figcaption>
        <svg [attr.viewBox]="'0 0 ' + width + ' ' + (height + padTop + padBottom)" aria-hidden="true" focusable="false">
          <g [attr.transform]="'translate(0 ' + padTop + ')'">
            <path class="area" [attr.d]="v.paths.area" />
            <path class="line" [attr.d]="v.paths.line" />
            <line class="peak-line" [attr.x1]="v.peakX" [attr.x2]="v.peakX" y1="0" [attr.y2]="height" />
            <circle class="peak-dot" [attr.cx]="v.peakX" cy="0" r="3.5" />
            <text class="peak-text" [attr.x]="v.peakX" y="-4" text-anchor="middle">{{ v.curve.peak }}</text>
            @if (v.todayX !== null) {
              <line class="today-line" [attr.x1]="v.todayX" [attr.x2]="v.todayX" y1="0" [attr.y2]="height" />
              <text class="today-text" [attr.x]="v.todayX" [attr.y]="height + 15" text-anchor="middle">heute</text>
            }
            <line class="axis" x1="0" [attr.x2]="width" [attr.y1]="height" [attr.y2]="height" />
            @for (tick of v.ticks; track tick.year) {
              <text class="tick" [attr.x]="tick.x" [attr.y]="height + 15" text-anchor="middle"
                [class.hidden]="v.todayX !== null && abs(tick.x - v.todayX) < 22">{{ tick.year }}</text>
            }
          </g>
        </svg>
        <p class="sr-only">{{ v.summary }}</p>
      </figure>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .curve {
      margin: 0;
      display: grid;
      gap: var(--space-2);
    }
    figcaption {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-3);
      align-items: baseline;
    }
    .standing {
      color: var(--state-ready);
    }
    [data-state='early'] .standing {
      color: var(--state-early);
    }
    [data-state='late'] .standing {
      color: var(--state-late);
    }
    .muted {
      color: var(--ink-soft);
      font-size: 0.85rem;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .area {
      fill: var(--accent);
      opacity: 0.18;
    }
    .line {
      fill: none;
      stroke: var(--accent);
      stroke-width: 2.2;
      stroke-linejoin: round;
    }
    .peak-line {
      stroke: var(--accent);
      stroke-width: 1;
      stroke-dasharray: 2 3;
      opacity: 0.6;
    }
    .peak-dot {
      fill: var(--accent);
      stroke: var(--surface);
      stroke-width: 1.5;
    }
    .today-line {
      stroke: var(--ink);
      stroke-width: 1.4;
      stroke-dasharray: 4 3;
    }
    .axis {
      stroke: var(--line);
      stroke-width: 1;
    }
    text {
      fill: var(--ink-soft);
      font-size: 10px;
      font-variant-numeric: tabular-nums;
    }
    .peak-text,
    .today-text {
      fill: var(--ink);
      font-weight: 600;
    }
    .hidden {
      display: none;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `,
})
export class DrinkingCurveChart {
  readonly curve = input<Curve | null>(null);
  /** The year the wine is judged in (the current year). */
  readonly year = input.required<number>();

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly padTop = PAD_TOP;
  protected readonly padBottom = PAD_BOTTOM;
  protected readonly abs = Math.abs;

  protected readonly view = computed(() => {
    const curve = this.curve();
    if (!curve) return null;
    const year = this.year();
    const range = axisRange(curve, year);
    const assessment = assess(curve, year);
    return {
      curve,
      assessment,
      paths: curvePaths(curve, range, WIDTH, HEIGHT),
      ticks: axisTicks(range).map((t) => ({ year: t, x: xOf(t, range, WIDTH) })),
      peakX: xOf(curve.peak, range, WIDTH),
      todayX: inRange(year, range) ? xOf(year, range, WIDTH) : null,
      summary: curveSummary(curve, assessment),
      note: curve.derived ? 'Schätzung, aus dem Trinkfenster abgeleitet' : 'Schätzung',
    };
  });
}
