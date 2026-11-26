import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/errors';
import { GrapeEntry, GrapeVariety } from '../core/models';
import { ToastService } from '../core/toast.service';
import { classify, findGrape, hasEntry, moveEntry, sumPercent } from './grape-picker.logic';

/**
 * Ordered list of grape varieties with optional shares. Varieties come from the user's list; a typed
 * name that does not exist yet can be created right here. Entries suggested from outside (barcode)
 * may still be unknown – they are marked "neu" and created on save.
 */
@Component({
  selector: 'app-grape-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="picker">
      <legend>Rebsorten</legend>

      @if (entries().length > 0) {
        <ol class="entries">
          @for (entry of entries(); track entry.name; let i = $index, first = $first, last = $last) {
            <li>
              <span class="pos" aria-hidden="true">{{ i + 1 }}.</span>
              <span class="name">
                {{ entry.name }}
                @if (!isKnown(entry.name)) { <span class="new">neu</span> }
              </span>
              <label class="sr-only" [for]="idPrefix() + '-pct-' + i">Anteil {{ entry.name }} in Prozent</label>
              <span class="pct">
                <input [id]="idPrefix() + '-pct-' + i" type="number" inputmode="numeric" min="1" max="100"
                  placeholder="–" [value]="entry.percent ?? ''" (input)="setPercent(i, $any($event.target).value)" />
                <span aria-hidden="true">%</span>
              </span>
              <span class="tools">
                <button type="button" class="btn btn-icon btn-small" [disabled]="first" (click)="move(i, -1)"
                  [attr.aria-label]="entry.name + ' nach oben'">↑</button>
                <button type="button" class="btn btn-icon btn-small" [disabled]="last" (click)="move(i, 1)"
                  [attr.aria-label]="entry.name + ' nach unten'">↓</button>
                <button type="button" class="btn btn-icon btn-small" (click)="remove(i)"
                  [attr.aria-label]="entry.name + ' entfernen'">✕</button>
              </span>
            </li>
          }
        </ol>
      }

      <div class="add">
        <label class="sr-only" [for]="idPrefix() + '-add'">Rebsorte hinzufügen</label>
        <input [id]="idPrefix() + '-add'" [attr.list]="idPrefix() + '-list'" autocomplete="off"
          placeholder="Rebsorte wählen oder eingeben" [value]="text()"
          (input)="text.set($any($event.target).value)" (keydown.enter)="$event.preventDefault(); add()" />
        <datalist [id]="idPrefix() + '-list'">
          @for (v of available(); track v.id) {
            <option [value]="v.name"></option>
          }
        </datalist>
        <button type="button" class="btn btn-small" [disabled]="!canAdd() || busy()" (click)="add()">
          @if (typedIsNew()) { „{{ text().trim() }}“ als Rebsorte anlegen } @else { Hinzufügen }
        </button>
      </div>

      <p class="hint summary" aria-live="polite">
        @if (kind(); as k) { <span class="badge">{{ k }}</span> }
        @if (sum() > 0) {
          <span [class.over]="sum() > 100">Anteile zusammen {{ sum() }} %@if (sum() > 100) { – höchstens 100 % erlaubt }</span>
        }
      </p>
    </fieldset>
  `,
  styles: `
    .picker { display: grid; gap: var(--space-2); margin: 0; padding: 0; border: 0; min-width: 0; }
    legend { padding: 0; margin-bottom: var(--space-1); font-size: 0.9375rem; font-weight: 600; }
    .entries { display: grid; gap: var(--space-1); margin: 0; padding: 0; list-style: none; }
    .entries li {
      display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: var(--space-2);
      padding: var(--space-1) var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-s); background: var(--surface);
    }
    .pos { color: var(--ink-soft); font-variant-numeric: tabular-nums; }
    .name { overflow: hidden; text-overflow: ellipsis; }
    .new { margin-left: var(--space-1); padding: 0 0.4rem; border: 1px solid var(--gold); border-radius: 999px; font-size: 0.75rem; }
    .pct { display: inline-flex; align-items: center; gap: 2px; }
    .pct input { width: 4.25rem; min-height: 2.25rem; padding: 0.25rem 0.4rem; border: 1px solid var(--line); border-radius: var(--radius-s); background: var(--bg); color: var(--ink); font: inherit; text-align: right; }
    .tools { display: inline-flex; gap: 2px; }
    .btn-icon.btn-small { width: 2.25rem; padding: 0; }
    .add { display: flex; flex-wrap: wrap; gap: var(--space-2); }
    .add input { flex: 1 1 12rem; }
    .summary { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; margin: 0; min-height: 1.5rem; }
    .badge { padding: 0 0.5rem; border-radius: 999px; background: var(--surface-2); color: var(--ink); font-size: 0.8125rem; font-weight: 600; }
    .over { color: var(--danger); font-weight: 600; }
    @media (max-width: 480px) {
      .entries li { grid-template-columns: auto minmax(0, 1fr) auto; }
      .tools { grid-column: 2 / -1; justify-self: end; }
    }
  `,
})
export class GrapePicker {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly entries = model<GrapeEntry[]>([]);
  readonly varieties = input<GrapeVariety[]>([]);
  readonly idPrefix = input('grapes');
  /** Emitted after a variety was created here, so the owner can reload the list. */
  readonly created = output<GrapeVariety>();

  protected readonly text = signal('');
  protected readonly busy = signal(false);

  protected readonly available = computed(() =>
    this.varieties().filter((v) => !hasEntry(this.entries(), v.name)),
  );
  protected readonly typedIsNew = computed(() => !!this.text().trim() && !findGrape(this.varieties(), this.text()));
  protected readonly canAdd = computed(() => !!this.text().trim() && !hasEntry(this.entries(), this.text()));
  protected readonly sum = computed(() => sumPercent(this.entries()));
  protected readonly kind = computed(() => classify(this.entries().length));

  protected isKnown(name: string): boolean {
    return !!findGrape(this.varieties(), name);
  }

  protected async add(): Promise<void> {
    if (!this.canAdd()) return;
    let name = this.text().trim();
    const known = findGrape(this.varieties(), name);
    if (known) {
      name = known.name;
    } else {
      this.busy.set(true);
      try {
        const variety = await this.api.createGrape(name);
        name = variety.name;
        this.created.emit(variety);
      } catch (error) {
        this.toast.error(errorMessage(error));
        return;
      } finally {
        this.busy.set(false);
      }
    }
    this.entries.update((list) => [...list, { name, percent: null }]);
    this.text.set('');
  }

  protected move(index: number, delta: number): void {
    this.entries.update((list) => moveEntry(list, index, delta));
  }

  protected remove(index: number): void {
    this.entries.update((list) => list.filter((_, i) => i !== index));
  }

  protected setPercent(index: number, raw: string): void {
    const value = raw === '' ? null : Math.round(Number(raw));
    this.entries.update((list) =>
      list.map((e, i) => (i === index ? { ...e, percent: value === null || Number.isNaN(value) ? null : value } : e)),
    );
  }
}
