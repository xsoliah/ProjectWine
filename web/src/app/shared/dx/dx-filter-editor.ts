import './dx-setup';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DxFilterBuilderModule } from 'devextreme-angular/ui/filter-builder';
import { FilterExpr } from '../../core/filter-expr';
import { ListField, isMulti } from '../../core/list-model';

/** Filter-Editor (DevExtreme `FilterBuilder`): Bedingungen in beliebig verschachtelten „und“-/„oder“-/„nicht“-Gruppen. */
@Component({
  selector: 'app-dx-filter-editor',
  imports: [DxFilterBuilderModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dx-filter-builder [fields]="builderFields()" [value]="$any(current())" [maxGroupLevel]="4" (onValueChanged)="draft.set($any($event.value))" />
    <div class="actions">
      <button type="button" class="btn" (click)="cancel.emit()">Abbrechen</button>
      <button type="button" class="btn" (click)="apply.emit(null)">Filter löschen</button>
      <button type="button" class="btn btn-primary" (click)="apply.emit(clean())">Übernehmen</button>
    </div>
  `,
  host: { style: 'display: block; min-width: 0' },
})
export class DxFilterEditor<T> {
  readonly fields = input.required<readonly ListField<T>[]>();
  readonly value = input<FilterExpr | null>(null);
  /** Wählbare Werte je Textfeld (aus den Daten), zusätzlich zur festen Reihenfolge des Feldes. */
  readonly options = input<Record<string, readonly string[]>>({});
  readonly apply = output<FilterExpr | null>();
  readonly cancel = output<void>();

  protected readonly draft = signal<FilterExpr | null | undefined>(undefined);
  protected readonly current = computed(() => this.draft() ?? this.value() ?? undefined);

  protected readonly builderFields = computed(() =>
    this.fields()
      .filter((f) => !f.noFilter)
      .map((f) => {
        const base: Record<string, unknown> = { dataField: f.key, caption: f.title };
        if (f.type === 'number') base['dataType'] = 'number';
        else if (f.type === 'date') {
          base['dataType'] = 'date';
          base['format'] = { type: 'shortDate' };
        } else {
          base['dataType'] = 'string';
          if (isMulti(f)) {
            base['filterOperations'] = ['contains', 'notcontains', 'isblank', 'isnotblank'];
          } else {
            const values = f.order ?? this.options()[f.key];
            if (values && values.length > 0) base['lookup'] = { dataSource: [...values], allowClearing: true };
          }
        }
        return base;
      }),
  );

  protected clean(): FilterExpr | null {
    const value = this.current();
    return Array.isArray(value) && value.length > 0 ? (value as FilterExpr) : null;
  }
}
