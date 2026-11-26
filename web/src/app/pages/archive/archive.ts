import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { downloadText } from '../../core/download';
import { errorMessage } from '../../core/errors';
import { CONSUMPTION_KINDS } from '../../core/labels';
import { ListViewState } from '../../core/list-view-state';
import { multiValues, tableCsv } from '../../core/list-views';
import { ArchiveEntry } from '../../core/models';
import { ArchiveEntryItem } from '../../shared/archive-entry-item';
import { ColumnPicker } from '../../shared/column-picker';
import { DataTable } from '../../shared/data-table';
import { FilterBar } from '../../shared/filter-bar';
import { PivotCellEvent, PivotTable } from '../../shared/pivot-table';
import { ViewSwitch } from '../../shared/view-switch';
import { ARCHIVE_PIVOT, archiveColumns, archiveDimensions, archiveFilters, archiveMeasures } from './archive.views';

@Component({
  selector: 'app-archive',
  imports: [ArchiveEntryItem, ViewSwitch, ColumnPicker, DataTable, FilterBar, PivotTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page stack">
      <div class="page-head"><h1>Archiv</h1></div>

      <div class="chips" role="group" aria-label="Nach Art filtern">
        <button type="button" class="chip" [attr.aria-pressed]="!kindActive()" (click)="setKind(null)">Alle</button>
        @for (k of kinds; track k.value) {
          <button type="button" class="chip" [attr.aria-pressed]="singleKind() === k.label" (click)="setKind(k.label)">
            {{ k.label }}
          </button>
        }
      </div>

      <div class="view-tools">
        <app-view-switch [view]="view.view()" (changed)="view.setView($event)" />
        @if (view.view() === 'table') {
          <app-column-picker [columns]="allColumns" [visible]="visibleKeys()" (changed)="view.setColumns($event)" />
          <button type="button" class="btn btn-small" [disabled]="tableRows().length === 0" (click)="exportTable()">
            Als CSV exportieren
          </button>
        }
      </div>

      <app-filter-bar [defs]="filterDefs" [rows]="allEntries()" [state]="view.filters()" [hidden]="['kind']"
        (stateChange)="view.setFilters($event)" (reset)="view.resetFilters()" />

      @if (view.drilled() && view.view() !== 'pivot') {
        <div class="banner" role="status">
          Aufgeschlüsselt: {{ view.drillLabel() }}
          <button type="button" class="btn-link" (click)="view.endDrill()">Zurück zum Pivot</button>
        </div>
      }

      @if (error(); as text) {
        <div class="banner error" role="alert">
          {{ text }} <button type="button" class="btn-link" (click)="list.reload()">Erneut laden</button>
        </div>
      }

      @if (loading()) {
        <p class="muted" role="status">Archiv wird geladen …</p>
      } @else if (view.view() === 'pivot') {
        <app-pivot-table [rows]="entries()" [dimensions]="dimensions" [measures]="measures" [config]="view.pivotConfig()"
          fileName="archiv-pivot.csv" (configChange)="view.setPivot($event)" (cell)="onCell($event)" />
      } @else if (entries().length === 0 && !error()) {
        @if (filtered()) {
          <div class="empty">
            <h2>Keine passenden Einträge</h2>
            <p>Ändere die Filter.</p>
            <button type="button" class="btn" (click)="view.resetFilters()">Filter zurücksetzen</button>
          </div>
        } @else {
          <div class="empty">
            <h2>Noch nichts im Archiv</h2>
            <p>Getrunkene, verkaufte und verschenkte Weine erscheinen hier.</p>
          </div>
        }
      } @else if (view.view() === 'table') {
        <app-data-table [rows]="tableRows()" [columns]="visibleColumns()" [sortKey]="view.sortKey()"
          [sortDir]="view.sortDir()" [link]="link" label="Archiv" (sortChange)="view.toggleSort($event)" />
      } @else {
        <div class="stack">
          @for (entry of entries(); track entry.id) {
            <app-archive-entry-item [entry]="entry" (changed)="list.reload()" />
          }
        </div>
      }
    </div>
  `,
})
export class Archive {
  private readonly api = inject(ApiService);

  protected readonly view = new ListViewState<ArchiveEntry>({
    id: 'archive',
    filters: archiveFilters(),
    columns: archiveColumns(),
    dimensions: archiveDimensions(),
    measures: archiveMeasures(),
    pivot: ARCHIVE_PIVOT,
  });

  protected readonly kinds = CONSUMPTION_KINDS;
  protected readonly filterDefs = this.view.config.filters;
  protected readonly dimensions = this.view.config.dimensions;
  protected readonly measures = this.view.config.measures;
  protected readonly allColumns = this.view.config.columns;

  protected readonly list = resource({ loader: () => this.api.listArchive(null) });

  protected readonly allEntries = computed(() => (this.list.hasValue() ? this.list.value() : []));
  protected readonly entries = computed(() => this.view.apply(this.allEntries()));
  protected readonly tableRows = computed(() => this.view.sorted(this.entries()));
  protected readonly visibleColumns = this.view.columns;
  protected readonly visibleKeys = computed(() => this.visibleColumns().map((c) => c.key));
  protected readonly filtered = computed(() => Object.keys(this.view.filters()).length > 0 || this.view.drilled());
  protected readonly loading = computed(() => this.list.isLoading() && !this.list.hasValue());
  protected readonly error = computed(() => {
    const error = this.list.error();
    return error ? errorMessage(error) : null;
  });

  protected readonly kindActive = computed(() => multiValues(this.view.filters(), 'kind').length > 0);
  protected readonly singleKind = computed(() => {
    const selected = multiValues(this.view.filters(), 'kind');
    return selected.length === 1 ? selected[0] : null;
  });

  protected setKind(label: string | null): void {
    this.view.setFilter('kind', label ?? '');
  }

  protected link = (entry: ArchiveEntry): unknown[] => ['/wines', entry.wineId];

  protected exportTable(): void {
    downloadText('archiv.csv', tableCsv(this.tableRows(), this.visibleColumns()));
  }

  protected onCell(event: PivotCellEvent): void {
    this.view.drill(event.row, event.col);
  }
}
