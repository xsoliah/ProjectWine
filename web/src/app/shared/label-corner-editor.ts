import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LabelPoint } from '../core/models';
import { CENTERED_CORNERS, CORNER_NAMES, cornersValid, nudge, toNormalized } from '../core/photo';
import { Modal } from './modal';

const LOUPE_SIZE = 128;
const LOUPE_ZOOM = 3;

/**
 * Lets the user set the four corners of the label on the original photo. Points can be dragged (mouse, touch) or
 * moved with the arrow keys (Shift for bigger steps); a loupe shows the area around the dragged point.
 */
@Component({
  selector: 'app-label-corner-editor',
  imports: [Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal label="Zuschnitt des Etiketts" [wide]="true" (closed)="cancelled.emit()">
      <div class="editor stack">
        <h2>Zuschnitt des Etiketts</h2>
        @if (hint(); as text) {
          <p class="banner" role="status">{{ text }}</p>
        }
        <p class="muted small">
          Zieh die vier Punkte auf die Ecken des Etiketts – auf die Kante des Papiers, nicht der Flasche.
          Mit Tab einen Punkt wählen, mit den Pfeiltasten verschieben (Umschalt für größere Schritte).
        </p>

        <div class="stage">
          <div class="frame">
            <img #img [src]="src()" alt="Originalfoto des Etiketts" (load)="imageLoaded.set(true)" draggable="false" />
            @if (imageLoaded()) {
              <svg class="overlay" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
                <path class="shade" fill-rule="evenodd" [attr.d]="shadePath()" />
                <polygon class="outline" [attr.points]="polygon()" />
              </svg>
              @for (p of points(); track $index) {
                <button type="button" class="handle" [class.active]="active() === $index"
                  [style.left.%]="p.x * 100" [style.top.%]="p.y * 100"
                  [attr.aria-label]="handleLabel($index, p)"
                  (pointerdown)="startDrag($event, $index)" (pointermove)="drag($event)"
                  (pointerup)="endDrag($event)" (pointercancel)="endDrag($event)"
                  (keydown)="onKey($event, $index)" (focus)="active.set($index)">
                </button>
              }
            }
          </div>
          <canvas #loupe class="loupe" [class.visible]="dragging() !== null" [width]="loupeSize" [height]="loupeSize"
            aria-hidden="true"></canvas>
        </div>

        @if (!valid()) {
          <p class="hint error-text" role="alert">
            Die Punkte bilden kein gültiges Viereck. Reihenfolge: oben links, oben rechts, unten rechts, unten links.
          </p>
        }

        <div class="actions">
          <button type="button" class="btn-link" (click)="reset()">Vorschlag wiederherstellen</button>
          <button type="button" class="btn" (click)="cancelled.emit()">Abbrechen</button>
          <button type="button" class="btn btn-primary" [disabled]="!valid() || busy()" (click)="confirmed.emit(points())">
            Zuschnitt übernehmen
          </button>
        </div>
      </div>
    </app-modal>
  `,
  styles: `
    .small {
      font-size: 0.875rem;
      margin: 0;
    }
    .stage {
      position: relative;
      display: grid;
      place-items: center;
      background: var(--surface-2);
      border-radius: var(--radius-m);
      padding: var(--space-3);
      touch-action: none;
      user-select: none;
    }
    .frame {
      position: relative;
      line-height: 0;
    }
    img {
      display: block;
      max-width: 100%;
      max-height: 58dvh;
    }
    .overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .shade {
      fill: rgb(0 0 0 / 0.45);
    }
    .outline {
      fill: none;
      stroke: #ffd24a;
      stroke-width: 2px;
      vector-effect: non-scaling-stroke;
    }
    .handle {
      position: absolute;
      width: 2.75rem;
      height: 2.75rem;
      margin: -1.375rem 0 0 -1.375rem;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: transparent;
      cursor: grab;
      touch-action: none;
    }
    .handle::after {
      content: '';
      position: absolute;
      inset: 0.875rem;
      border: 2px solid #1b1b1b;
      border-radius: 50%;
      background: #ffd24a;
      box-shadow: 0 0 0 2px #fff;
    }
    .handle.active::after {
      inset: 0.625rem;
    }
    .handle:active {
      cursor: grabbing;
    }
    .loupe {
      position: absolute;
      top: var(--space-2);
      left: var(--space-2);
      width: 8rem;
      height: 8rem;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: var(--shadow-lifted);
      opacity: 0;
      pointer-events: none;
      transition: opacity 120ms;
    }
    .loupe.visible {
      opacity: 1;
    }
    .error-text {
      color: var(--danger);
      margin: 0;
    }
    .actions {
      align-items: center;
      margin-top: 0;
    }
    .actions .btn-link {
      margin-right: auto;
    }
  `,
})
export class LabelCornerEditor {
  /** Object URL (or data URL) of the original photo. */
  readonly src = input.required<string>();
  /** Known corners; null shows the centered suggestion. */
  readonly corners = input<readonly LabelPoint[] | null>(null);
  readonly hint = input<string | null>(null);
  readonly busy = input(false);
  readonly confirmed = output<LabelPoint[]>();
  readonly cancelled = output<void>();

  private readonly img = viewChild<ElementRef<HTMLImageElement>>('img');
  private readonly loupe = viewChild<ElementRef<HTMLCanvasElement>>('loupe');

  protected readonly loupeSize = LOUPE_SIZE;
  protected readonly imageLoaded = signal(false);
  protected readonly points = signal<LabelPoint[]>([...CENTERED_CORNERS]);
  protected readonly active = signal<number | null>(null);
  protected readonly dragging = signal<number | null>(null);
  protected readonly valid = computed(() => cornersValid(this.points()));
  protected readonly polygon = computed(() => this.points().map((p) => `${p.x},${p.y}`).join(' '));
  /** Everything outside the label is darkened. */
  protected readonly shadePath = computed(() => {
    const [a, b, c, d] = this.points();
    return `M0,0H1V1H0Z M${a.x},${a.y}L${b.x},${b.y}L${c.x},${c.y}L${d.x},${d.y}Z`;
  });

  constructor() {
    effect(() => {
      const initial = this.corners();
      this.points.set(initial && initial.length === 4 ? initial.map((p) => ({ ...p })) : [...CENTERED_CORNERS]);
    });
  }

  protected handleLabel(index: number, p: LabelPoint): string {
    return `Ecke ${CORNER_NAMES[index]}: ${Math.round(p.x * 100)} % von links, ${Math.round(p.y * 100)} % von oben`;
  }

  protected reset(): void {
    const initial = this.corners();
    this.points.set(initial && initial.length === 4 ? initial.map((p) => ({ ...p })) : [...CENTERED_CORNERS]);
  }

  protected startDrag(event: PointerEvent, index: number): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.active.set(index);
    this.dragging.set(index);
    this.drawLoupe(this.points()[index]);
  }

  protected drag(event: PointerEvent): void {
    const index = this.dragging();
    const img = this.img()?.nativeElement;
    if (index === null || !img) return;
    const point = toNormalized(event.clientX, event.clientY, img.getBoundingClientRect());
    this.setPoint(index, point);
    this.drawLoupe(point);
  }

  protected endDrag(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    this.dragging.set(null);
  }

  protected onKey(event: KeyboardEvent, index: number): void {
    const step = event.shiftKey ? 0.02 : 0.005;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    this.setPoint(index, nudge(this.points()[index], move[0], move[1]));
  }

  private setPoint(index: number, point: LabelPoint): void {
    this.points.update((list) => list.map((p, i) => (i === index ? point : p)));
  }

  /** Zoomed view of the photo around the point, with a crosshair. */
  private drawLoupe(point: LabelPoint): void {
    const img = this.img()?.nativeElement;
    const canvas = this.loupe()?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!img || !canvas || !context || !img.naturalWidth) return;

    const displayed = img.getBoundingClientRect();
    const scale = img.naturalWidth / displayed.width;
    const source = (LOUPE_SIZE / LOUPE_ZOOM) * scale;
    const sx = point.x * img.naturalWidth - source / 2;
    const sy = point.y * img.naturalHeight - source / 2;

    context.fillStyle = '#222';
    context.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
    context.imageSmoothingEnabled = true;
    context.drawImage(img, sx, sy, source, source, 0, 0, LOUPE_SIZE, LOUPE_SIZE);
    context.strokeStyle = '#ffd24a';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(LOUPE_SIZE / 2, 0);
    context.lineTo(LOUPE_SIZE / 2, LOUPE_SIZE);
    context.moveTo(0, LOUPE_SIZE / 2);
    context.lineTo(LOUPE_SIZE, LOUPE_SIZE / 2);
    context.stroke();
  }
}
