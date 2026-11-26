import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { formatDate } from '../core/format';
import {
  FilterDef,
  FilterState,
  MULTI_SEPARATOR,
  activeFilterCount,
  filterParamKeys,
  multiOptions,
  multiValues,
} from '../core/list-views';

interface ActiveFilter {
  key: string;
  label: string;
}

/**
 * Filterleiste: Spaltenfilter in einem einklappbaren Bereich, darunter die aktiven Filter einzeln entfernbar
 * und „Zurücksetzen“. Filter in `hidden` zeigt die Seite selbst (Suchfeld, Chips), sie erscheinen hier nur als aktiv.
 */
@Component({
  selector: 'app-filter-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shownDefs().length > 0) {
      <details class="filters">
        <summary class="btn btn-small">Filter{{ count() > 0 ? ' (' + count() + ')' : '' }}</summary>
        <div class="panel grid">
          @for (def of shownDefs(); track def.key) {
            @switch (def.kind) {
              @case ('multi') {
                <fieldset>
                  <legend>{{ def.title }}</legend>
                  <div class="options">
                    @for (option of options(def); track option) {
                      <label class="check">
                        <input type="checkbox" [checked]="selected(def.key).includes(option)" (change)="toggle(def.key, option, $any($event.target).checked)" />
                        {{ option }}
                      </label>
                    }
                  </div>
                </fieldset>
              }
              @case ('range') {
                <fieldset>
                  <legend>{{ def.title }}</legend>
                  <div class="pair">
                    <label>
                      von
                      <input [type]="def.input" [value]="state()[def.key + 'From'] ?? ''" (change)="set(def.key + 'From', $any($event.target).value)" />
                    </label>
                    <label>
                      bis
                      <input [type]="def.input" [value]="state()[def.key + 'To'] ?? ''" (change)="set(def.key + 'To', $any($event.target).value)" />
                    </label>
                  </div>
                </fieldset>
              }
              @case ('min') {
                <fieldset>
                  <legend>{{ def.title }}</legend>
                  <select [attr.aria-label]="def.title" (change)="set(def.key + 'Min', $any($event.target).value)">
                    <option value="" [selected]="!state()[def.key + 'Min']">egal</option>
                    @for (step of def.steps; track step) {
                      <option [value]="step" [selected]="state()[def.key + 'Min'] === '' + step">ab {{ step }}</option>
                    }
                  </select>
                </fieldset>
              }
              @case ('text') {
                <fieldset>
                  <legend>{{ def.title }}</legend>
                  <input type="search" autocomplete="off" [attr.aria-label]="def.title" [value]="state()[def.key] ?? ''" (input)="set(def.key, $any($event.target).value)" />
                </fieldset>
              }
            }
          }
        </div>
      </details>
    }

    @if (active().length > 0) {
      <div class="active" role="group" aria-label="Aktive Filter">
        @for (a of active(); track a.key) {
          <button type="button" class="tag" [attr.aria-label]="'Filter entfernen: ' + a.label" (click)="remove(a.key)">
            {{ a.label }} <span aria-hidden="true">×</span>
          </button>
        }
        <button type="button" class="btn-link" (click)="reset.emit()">Zurücksetzen</button>
      </div>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
    }
    summary {
      display: inline-flex;
      list-style: none;
      cursor: pointer;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      gap: var(--space-4);
      margin-top: var(--space-2);
    }
    fieldset {
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }
    legend {
      padding: 0;
      margin-bottom: var(--space-1);
      font-weight: 600;
    }
    .options {
      display: grid;
      gap: var(--space-1);
      max-height: 11rem;
      overflow-y: auto;
    }
    .check {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 2rem;
    }
    .pair {
      display: flex;
      gap: var(--space-2);
    }
    .pair label {
      display: grid;
      flex: 1;
      gap: var(--space-1);
      font-size: 0.875rem;
    }
    input[type='search'],
    input[type='number'],
    input[type='date'],
    select {
      width: 100%;
      min-height: 2.5rem;
      padding: 0 var(--space-2);
      border: 1px solid var(--line);
      border-radius: var(--radius-s);
      background: var(--surface);
      color: var(--ink);
      font: inherit;
    }
    .active {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }
    .tag {
      padding: 0.2rem 0.7rem;
      border: 1px solid var(--burgundy);
      border-radius: 999px;
      background: color-mix(in srgb, var(--burgundy) 10%, var(--surface));
      color: var(--ink);
      font: inherit;
      font-size: 0.875rem;
      cursor: pointer;
    }
  `,
})
export class FilterBar<T> {
  readonly defs = input.required<readonly FilterDef<T>[]>();
  /** Alle Zeilen der Liste (für die Auswahllisten). */
  readonly rows = input.required<readonly T[]>();
  readonly state = input.required<FilterState>();
  /** Filter, die die Seite selbst bedient (Suchfeld, Chips). */
  readonly hidden = input<readonly string[]>([]);
  readonly stateChange = output<FilterState>();
  readonly reset = output<void>();

  protected readonly shownDefs = computed(() => this.defs().filter((d) => !this.hidden().includes(d.key)));
  protected readonly count = computed(() => activeFilterCount(this.shownDefs(), this.state()));

  protected readonly active = computed<ActiveFilter[]>(() => {
    const state = this.state();
    const out: ActiveFilter[] = [];
    for (const def of this.defs()) {
      const keys = filterParamKeys(def);
      if (!keys.some((k) => (state[k] ?? '') !== '')) continue;
      let label = '';
      switch (def.kind) {
        case 'multi':
          label = `${def.title}: ${multiValues(state, def.key).join(', ')}`;
          break;
        case 'range': {
          const show = (v: string | undefined) => (!v ? '…' : def.input === 'date' ? formatDate(v) : v);
          label = `${def.title}: ${show(state[keys[0]])} – ${show(state[keys[1]])}`;
          break;
        }
        case 'min':
          label = `${def.title} ab ${state[keys[0]]}`;
          break;
        case 'text':
          label = `${def.title}: „${state[def.key]}“`;
          break;
      }
      out.push({ key: def.key, label });
    }
    return out;
  });

  protected options(def: FilterDef<T>): string[] {
    return def.kind === 'multi' ? multiOptions(def, this.rows(), multiValues(this.state(), def.key)) : [];
  }

  protected selected(key: string): string[] {
    return multiValues(this.state(), key);
  }

  protected toggle(key: string, option: string, on: boolean): void {
    const current = new Set(this.selected(key));
    if (on) current.add(option);
    else current.delete(option);
    this.set(key, [...current].join(MULTI_SEPARATOR));
  }

  protected set(key: string, value: string): void {
    const next = { ...this.state() };
    if (value === '') delete next[key];
    else next[key] = value;
    this.stateChange.emit(next);
  }

  protected remove(defKey: string): void {
    const def = this.defs().find((d) => d.key === defKey);
    if (!def) return;
    const next = { ...this.state() };
    for (const key of filterParamKeys(def)) delete next[key];
    this.stateChange.emit(next);
  }
}
