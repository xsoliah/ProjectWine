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
import { effectiveShape, moveLabel, outlineValid, placementValid, templateOutline } from '../core/bottle';
import { BottleLabelPlacement, BottleShape, LabelPoint, SetBottleShapeRequest, WineType } from '../core/models';
import { nudge, toNormalized } from '../core/photo';
import { hasWebGl } from '../core/webgl';
import { Bottle3d } from './bottle-3d';
import { Modal } from './modal';

/**
 * Check and adjust the bottle: the outline on the original photo (drag the points; the profile of the 3D bottle
 * follows after saving) and the label placement on the bottle (sliders; the 3D preview follows immediately).
 * No research and no daily limit are involved.
 */
@Component({
  selector: 'app-bottle-shape-editor',
  imports: [Modal, Bottle3d],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal label="Flasche prüfen" [wide]="true" (closed)="cancelled.emit()">
      <div class="editor stack">
        <h2>Flasche prüfen</h2>
        @if (shape()?.needsReview) {
          <p class="banner" role="status">
            Flasche prüfen: Die Flasche wurde nicht sicher erkannt. Bitte den Umriss auf dem Foto und die Lage des
            Etiketts kontrollieren.
          </p>
        }

        <div class="columns">
          <section class="stack" aria-labelledby="outline-title">
            <h3 id="outline-title">Umriss auf dem Foto</h3>
            <p class="muted small">
              Zieh die Punkte auf den Rand der Flasche, von der Mündung bis zum Boden. Mit Tab einen Punkt wählen, mit
              den Pfeiltasten verschieben (Umschalt für größere Schritte).
            </p>
            <div class="stage">
              <div class="frame">
                <img #img [src]="src()" alt="Originalfoto der Flasche" (load)="onLoaded()" draggable="false" />
                @if (loaded() && outline(); as points) {
                  <svg class="overlay" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
                    <polygon class="outline" [attr.points]="polygon()" />
                  </svg>
                  @for (p of points; track $index) {
                    <button type="button" class="handle" [style.left.%]="p.x * 100" [style.top.%]="p.y * 100"
                      [attr.aria-label]="'Punkt ' + ($index + 1) + ' von ' + points.length + ': ' + Math.round(p.x * 100) + ' % von links, ' + Math.round(p.y * 100) + ' % von oben'"
                      (pointerdown)="startDrag($event, $index)" (pointermove)="drag($event)"
                      (pointerup)="endDrag($event)" (pointercancel)="endDrag($event)"
                      (keydown)="onPointKey($event, $index)">
                    </button>
                  }
                }
              </div>
            </div>
            @if (!outline()) {
              <button type="button" class="btn" [disabled]="!loaded()" (click)="createOutline()">Umriss festlegen</button>
            } @else if (!outlineOk()) {
              <p class="hint error-text" role="alert">Der Umriss braucht mindestens 6 Punkte im Bild und muss eine Fläche umschließen.</p>
            }
          </section>

          <section class="stack" aria-labelledby="label-title">
            <h3 id="label-title">Lage des Etiketts</h3>
            @if (webgl) {
              <app-bottle-3d [shape]="preview()" [type]="type()" [sizeMl]="sizeMl()" [labelImageId]="labelImageId()"
                [name]="name()" />
            }
            <div class="control">
              <label for="bottle-label-pos">Höhe über dem Boden</label>
              <input id="bottle-label-pos" type="range" min="0" max="100" step="1"
                [value]="positionValue()" (input)="setPosition($event)" />
              <output for="bottle-label-pos">{{ Math.round(label().bottom * 100) }} %</output>
            </div>
            <div class="control">
              <label for="bottle-label-height">Höhe des Etiketts</label>
              <input id="bottle-label-height" type="range" min="5" max="70" step="1"
                [value]="Math.round((label().top - label().bottom) * 100)" (input)="setHeight($event)" />
              <output for="bottle-label-height">{{ Math.round((label().top - label().bottom) * 100) }} %</output>
            </div>
            <div class="control">
              <label for="bottle-label-width">Breite des Etiketts</label>
              <input id="bottle-label-width" type="range" min="10" max="314" step="1"
                [value]="Math.round(label().widthFraction * 100)" (input)="setWidth($event)" />
              <output for="bottle-label-width">{{ Math.round(label().widthFraction * 100) }} % der Flaschenbreite</output>
            </div>
            <div class="control">
              <label for="bottle-label-turn">Drehung um die Flasche</label>
              <input id="bottle-label-turn" type="range" min="-90" max="90" step="1"
                [value]="Math.round((label().centerAngle * 180) / Math.PI)" (input)="setTurn($event)" />
              <output for="bottle-label-turn">{{ Math.round((label().centerAngle * 180) / Math.PI) }}°</output>
            </div>
            @if (!placementOk()) {
              <p class="hint error-text" role="alert">Das Etikett muss ganz auf der Flasche liegen.</p>
            }
          </section>
        </div>

        <div class="actions">
          <button type="button" class="btn-link" (click)="reset()">Zurücksetzen</button>
          <button type="button" class="btn" (click)="cancelled.emit()">Abbrechen</button>
          <button type="button" class="btn btn-primary" [disabled]="!outlineOk() || !placementOk() || busy()" (click)="confirm()">
            Flasche übernehmen
          </button>
        </div>
      </div>
    </app-modal>
  `,
  styles: `
    h3 {
      margin: 0;
      font-size: 1rem;
    }
    .small {
      font-size: 0.875rem;
      margin: 0;
    }
    .columns {
      display: grid;
      gap: var(--space-5);
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
      align-items: start;
    }
    .stage {
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
      max-height: 52dvh;
    }
    .overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .outline {
      fill: rgb(255 210 74 / 0.18);
      stroke: #ffd24a;
      stroke-width: 2px;
      vector-effect: non-scaling-stroke;
    }
    .handle {
      position: absolute;
      width: 2rem;
      height: 2rem;
      margin: -1rem 0 0 -1rem;
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
      inset: 0.5rem;
      border: 2px solid #1b1b1b;
      border-radius: 50%;
      background: #ffd24a;
      box-shadow: 0 0 0 1px #fff;
    }
    .handle:focus-visible::after {
      inset: 0.3rem;
    }
    .control {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--space-1) var(--space-3);
      align-items: center;
    }
    .control input {
      grid-column: 1 / -1;
      width: 100%;
    }
    .control output {
      font-variant-numeric: tabular-nums;
      color: var(--muted);
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
    app-bottle-3d {
      height: 18rem;
    }
  `,
})
export class BottleShapeEditor {
  /** Object URL of the original photo. */
  readonly src = input.required<string>();
  /** Measured bottle; null starts from the standard bottle. */
  readonly shape = input<BottleShape | null | undefined>(null);
  readonly type = input<WineType>('Red');
  readonly sizeMl = input<number | null | undefined>(750);
  readonly labelImageId = input<string | null | undefined>(null);
  readonly name = input.required<string>();
  readonly busy = input(false);
  readonly confirmed = output<SetBottleShapeRequest>();
  readonly cancelled = output<void>();

  private readonly img = viewChild<ElementRef<HTMLImageElement>>('img');

  protected readonly Math = Math;
  protected readonly webgl = hasWebGl();
  protected readonly loaded = signal(false);
  /** The current outline; null when the bottle has none yet. Only a touched outline is sent. */
  protected readonly outline = signal<LabelPoint[] | null>(null);
  private readonly outlineTouched = signal(false);
  protected readonly label = signal<BottleLabelPlacement>({ top: 0.5, bottom: 0.155, widthFraction: 0.96, centerAngle: 0 });
  private dragging: number | null = null;

  protected readonly polygon = computed(() => (this.outline() ?? []).map((p) => `${p.x},${p.y}`).join(' '));
  protected readonly outlineOk = computed(() => {
    const points = this.outline();
    return points === null || !this.outlineTouched() || outlineValid(points);
  });
  protected readonly placementOk = computed(() => placementValid(this.label()));
  protected readonly positionValue = computed(() => Math.round(this.label().bottom * 100));
  /** The shape of the preview: the stored profile with the label as edited. */
  protected readonly preview = computed<BottleShape>(() => ({
    ...effectiveShape(this.shape(), this.type()),
    label: this.label(),
  }));

  constructor() {
    effect(() => {
      const shape = this.shape();
      this.outline.set(shape?.outline ? shape.outline.map((p) => ({ ...p })) : null);
      this.outlineTouched.set(false);
      this.label.set({ ...effectiveShape(shape, this.type()).label });
    });
  }

  protected onLoaded(): void {
    this.loaded.set(true);
  }

  /** A starting outline in the middle of the photo to pull into place. */
  protected createOutline(): void {
    const img = this.img()?.nativeElement;
    const aspect = img && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 0.75;
    this.outline.set(templateOutline(effectiveShape(this.shape(), this.type()), aspect));
    this.outlineTouched.set(true);
  }

  protected reset(): void {
    const shape = this.shape();
    this.outline.set(shape?.outline ? shape.outline.map((p) => ({ ...p })) : null);
    this.outlineTouched.set(false);
    this.label.set({ ...effectiveShape(shape, this.type()).label });
  }

  protected startDrag(event: PointerEvent, index: number): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.dragging = index;
  }

  protected drag(event: PointerEvent): void {
    const index = this.dragging;
    const img = this.img()?.nativeElement;
    if (index === null || !img) return;
    this.setPoint(index, toNormalized(event.clientX, event.clientY, img.getBoundingClientRect()));
  }

  protected endDrag(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    this.dragging = null;
  }

  protected onPointKey(event: KeyboardEvent, index: number): void {
    const step = event.shiftKey ? 0.02 : 0.005;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    const points = this.outline();
    if (!move || !points) return;
    event.preventDefault();
    this.setPoint(index, nudge(points[index], move[0], move[1]));
  }

  protected setPosition(event: Event): void {
    const bottom = this.valueOf(event) / 100;
    this.label.update((l) => moveLabel(l, bottom - l.bottom));
  }

  protected setHeight(event: Event): void {
    const height = this.valueOf(event) / 100;
    this.label.update((l) => {
      const top = Math.min(1, l.bottom + height);
      return { ...l, top, bottom: Math.max(0, top - height) };
    });
  }

  protected setWidth(event: Event): void {
    this.label.update((l) => ({ ...l, widthFraction: this.valueOf(event) / 100 }));
  }

  protected setTurn(event: Event): void {
    this.label.update((l) => ({ ...l, centerAngle: (this.valueOf(event) * Math.PI) / 180 }));
  }

  protected confirm(): void {
    const points = this.outline();
    this.confirmed.emit({
      outline: this.outlineTouched() && points ? points : null,
      label: this.label(),
    });
  }

  private setPoint(index: number, point: LabelPoint): void {
    this.outline.update((list) => (list ? list.map((p, i) => (i === index ? point : p)) : list));
    this.outlineTouched.set(true);
  }

  private valueOf(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }
}
