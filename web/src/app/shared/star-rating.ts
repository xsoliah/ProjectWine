import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import {
  MAX_STARS,
  RATING_STEP,
  ratingFromPointer,
  ratingLabel,
  starFill,
  stepRating,
} from './star-rating.logic';

const STAR_PATH = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8L12 2.5Z';

@Component({
  selector: 'app-star-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="stars"
      [attr.role]="readonly() ? 'img' : 'slider'"
      [attr.tabindex]="readonly() ? null : 0"
      [attr.aria-label]="readonly() ? label() : 'Bewertung'"
      [attr.aria-valuemin]="readonly() ? null : 0"
      [attr.aria-valuemax]="readonly() ? null : 5"
      [attr.aria-valuenow]="readonly() ? null : (value() ?? 0)"
      [attr.aria-valuetext]="readonly() ? null : label()"
      [class.interactive]="!readonly()"
      (keydown)="onKey($event)"
    >
      @for (star of stars; track star) {
        <span class="star" (click)="pick($event, star)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="path" class="empty" /></svg>
          <span class="fill" [style.width.%]="fillOf(star) * 100">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="path" /></svg>
          </span>
        </span>
      }
    </div>
    @if (!readonly() && value() !== null) {
      <button type="button" class="btn-link" (click)="value.set(null)">Bewertung entfernen</button>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      flex-wrap: wrap;
    }
    .stars {
      display: inline-flex;
      border-radius: var(--radius-s);
    }
    .star {
      position: relative;
      width: var(--star-size, 1.25rem);
      height: var(--star-size, 1.25rem);
    }
    .interactive .star {
      --star-size: 2.25rem;
      cursor: pointer;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .empty {
      fill: none;
      stroke: var(--gold);
      stroke-width: 1.4;
      stroke-linejoin: round;
    }
    .fill {
      position: absolute;
      inset: 0 auto 0 0;
      overflow: hidden;
    }
    .fill svg {
      width: var(--star-size, 1.25rem);
      fill: var(--gold);
      stroke: var(--gold);
      stroke-width: 1.4;
      stroke-linejoin: round;
    }
  `,
})
export class StarRating {
  readonly value = model<number | null>(null);
  readonly readonly = input(false);

  protected readonly stars = Array.from({ length: MAX_STARS }, (_, i) => i + 1);
  protected readonly path = STAR_PATH;
  protected readonly label = computed(() => ratingLabel(this.value()));

  protected fillOf(star: number): number {
    return starFill(star, this.value());
  }

  protected pick(event: MouseEvent, star: number): void {
    if (this.readonly()) return;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.value.set(ratingFromPointer(star, (event.clientX - box.left) / box.width));
  }

  protected onKey(event: KeyboardEvent): void {
    if (this.readonly()) return;
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
    };
    if (event.key in steps) {
      this.value.set(stepRating(this.value(), steps[event.key]));
    } else if (event.key === 'Home') {
      this.value.set(RATING_STEP);
    } else if (event.key === 'End') {
      this.value.set(MAX_STARS);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      this.value.set(null);
    } else {
      return;
    }
    event.preventDefault();
  }
}
