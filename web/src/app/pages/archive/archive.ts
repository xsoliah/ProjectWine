import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/errors';
import { distinctOptions } from '../../core/list-options';
import { ListViewState } from '../../core/list-view-state';
import { ArchiveEntry } from '../../core/models';
import { ArchiveEntryItem } from '../../shared/archive-entry-item';
import { DxDataGrid } from '../../shared/dx/dx-data-grid';
import { DxPivotGrid } from '../../shared/dx/dx-pivot-grid';
import { ListFilter } from '../../shared/list-filter';
import { ViewSwitch } from '../../shared/view-switch';
import { ARCHIVE_LEGACY, ARCHIVE_PIVOT, archiveFields, archiveMeasures } from './archive.views';

@Component({
  selector: 'app-archive',
  imports: [ArchiveEntryItem, ViewSwitch, ListFilter, DxDataGrid, DxPivotGrid],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page stack">
      <div class="page-head"><h1>Archiv</h1></div>

      <div class="view-tools">
        <app-view-switch [view]="view.view()" (changed)="view.setView($event)" />
      </div>

      <app-list-filter [fields]="fields" [filter]="view.filter()" [on]="view.filterOn()" [options]="options()"
        (filterChange)="view.setFilter($event)" (toggle)="view.toggleFilter()" />

      @if (view.drilled() && view.view() !== 'pivot') {
        <div class="banner" role="status">
          Aufgeschlüsselt: Einträge der angetippten Pivotzelle
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
        @defer {
          <app-dx-pivot-grid [rows]="entries()" [fields]="fields" [measures]="measures" [layout]="pivotLayout"
            storageId="archive" label="Pivot des Archivs" fileName="archiv-pivot.csv" (drill)="view.drill($event)" />
        } @placeholder {
          <p class="muted" role="status">Pivot wird geladen …</p>
        }
      } @else if (entries().length === 0 && !error() && view.view() === 'tiles') {
        @if (view.filtered()) {
          <div class="empty">
            <h2>Keine passenden Einträge</h2>
            <p>Ändere die Filter.</p>
            <button type="button" class="btn" (click)="view.reset()">Filter zurücksetzen</button>
          </div>
        } @else {
          <div class="empty">
            <h2>Noch nichts im Archiv</h2>
            <p>Getrunkene, verkaufte und verschenkte Weine erscheinen hier.</p>
          </div>
        }
      } @else if (view.view() === 'table') {
        @defer {
          <app-dx-data-grid [rows]="allEntries()" [fields]="fields" [filter]="view.activeFilter()" [link]="link"
            storageId="archive" label="Archiv" fileName="archiv.csv" (filterChange)="view.setFilter($event)" />
        } @placeholder {
          <p class="muted" role="status">Tabelle wird geladen …</p>
        }
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

  protected readonly fields = archiveFields();
  protected readonly measures = archiveMeasures();
  protected readonly pivotLayout = ARCHIVE_PIVOT;

  protected readonly view = new ListViewState<ArchiveEntry>({
    id: 'archive',
    fields: this.fields,
    legacy: ARCHIVE_LEGACY,
  });

  protected readonly list = resource({ loader: () => this.api.listArchive(null) });

  protected readonly allEntries = computed(() => (this.list.hasValue() ? this.list.value() : []));
  protected readonly entries = computed(() => this.view.apply(this.allEntries()));
  protected readonly options = computed(() => distinctOptions(this.fields, this.allEntries()));
  protected readonly loading = computed(() => this.list.isLoading() && !this.list.hasValue());
  protected readonly error = computed(() => {
    const error = this.list.error();
    return error ? errorMessage(error) : null;
  });

  protected link = (entry: ArchiveEntry): unknown[] => ['/wines', entry.wineId];
}
