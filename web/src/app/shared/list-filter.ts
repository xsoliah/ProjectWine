import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FilterExpr, filterText } from '../core/filter-expr';
import { ListField } from '../core/list-model';
import { DxFilterEditor } from './dx/dx-filter-editor';
import { Modal } from './modal';

/**
 * Filterfeld oberhalb der Liste: zeigt den aktiven Filter als lesbaren Text, schaltet ihn aus und ein, öffnet den
 * Filter-Editor und löscht ihn. Der Editor (DevExtreme) wird erst beim Öffnen geladen.
 */
@Component({
  selector: 'app-list-filter',
  imports: [Modal, DxFilterEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filter-field" role="group" aria-label="Filter">
      @if (text(); as t) {
        <span class="filter-text" [class.off]="!on()" [attr.title]="t">
          <strong>Filter:</strong> {{ t }}@if (!on()) { <em> (ausgeschaltet)</em> }
        </span>
        <button type="button" class="btn btn-small" [attr.aria-pressed]="on()" (click)="toggle.emit()">
          {{ on() ? 'Ausschalten' : 'Einschalten' }}
        </button>
        <button type="button" class="btn btn-small" (click)="open.set(true)">Bearbeiten</button>
        <button type="button" class="btn btn-small" (click)="filterChange.emit(null)">Löschen</button>
      } @else {
        <button type="button" class="btn btn-small" (click)="open.set(true)">Filter erstellen</button>
      }
    </div>

    @if (open()) {
      <app-modal label="Filter bearbeiten" [wide]="true" (closed)="open.set(false)">
        <h2>Filter bearbeiten</h2>
        @defer {
          <app-dx-filter-editor [fields]="fields()" [value]="filter()" [options]="options()"
            (apply)="apply($event)" (cancel)="open.set(false)" />
        } @placeholder {
          <p class="muted" role="status">Editor wird geladen …</p>
        }
      </app-modal>
    }
  `,
  styles: `
    .filter-field {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }
    .filter-text {
      flex: 1 1 14rem;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .filter-text.off {
      color: var(--ink-soft);
      text-decoration: line-through;
    }
    .filter-text em {
      text-decoration: none;
      display: inline-block;
      margin-left: 0.25em;
    }
  `,
})
export class ListFilter<T> {
  readonly fields = input.required<readonly ListField<T>[]>();
  readonly filter = input<FilterExpr | null>(null);
  readonly on = input(true);
  /** Wählbare Werte je Textfeld (aus den Daten) für den Editor. */
  readonly options = input<Record<string, readonly string[]>>({});
  readonly filterChange = output<FilterExpr | null>();
  readonly toggle = output<void>();

  protected readonly open = signal(false);
  protected readonly text = computed(() => filterText(this.filter(), this.fields()));

  protected apply(expr: FilterExpr | null): void {
    this.filterChange.emit(expr);
    this.open.set(false);
  }
}
