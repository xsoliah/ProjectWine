import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { drinkWindow } from '../../core/drink-window';
import { downloadText } from '../../core/download';
import { errorMessage } from '../../core/errors';
import { WINE_TYPES } from '../../core/labels';
import { ListViewState } from '../../core/list-view-state';
import { multiValues, tableCsv } from '../../core/list-views';
import { Wine } from '../../core/models';
import { LAST_RACK_KEY, rackToOpen, webglAvailable } from '../../core/racks';
import { StorageService } from '../../core/storage.service';
import { ToastService } from '../../core/toast.service';
import { AuthImage } from '../../core/images';
import { ColumnPicker } from '../../shared/column-picker';
import { DataTable } from '../../shared/data-table';
import { FilterBar } from '../../shared/filter-bar';
import { Icon } from '../../shared/icon';
import { PivotTable, PivotCellEvent } from '../../shared/pivot-table';
import { TypeBadge } from '../../shared/type-badge';
import { ViewSwitch } from '../../shared/view-switch';
import { CELLAR_PIVOT, cellarColumns, cellarDimensions, cellarFilters, cellarMeasures } from './cellar.views';

@Component({
  selector: 'app-cellar',
  imports: [FormsModule, RouterLink, Icon, TypeBadge, AuthImage, ViewSwitch, ColumnPicker, DataTable, FilterBar, PivotTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cellar.html',
  styleUrl: './cellar.css',
})
export class Cellar {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);

  private readonly year = new Date().getFullYear();

  /** Ansicht, Filter, Sortierung und Pivot stehen in der URL (?view=, ?q=, ?type= …), damit sie eine Einzelansicht überleben. */
  protected readonly view = new ListViewState<Wine>({
    id: 'cellar',
    filters: cellarFilters(this.year),
    columns: cellarColumns(),
    dimensions: cellarDimensions(this.year),
    measures: cellarMeasures(),
    pivot: CELLAR_PIVOT,
  });

  protected readonly webgl = webglAvailable();
  /** "In 3D ansehen" without any rack: hint with "Regal anlegen". */
  protected readonly noRack = signal(false);
  protected readonly opening3d = signal(false);

  protected readonly types = WINE_TYPES;
  protected readonly filterDefs = this.view.config.filters;
  protected readonly dimensions = this.view.config.dimensions;
  protected readonly measures = this.view.config.measures;
  protected readonly allColumns = this.view.config.columns;

  private readonly list = resource({ loader: () => this.api.listWines({ search: '', type: null }) });

  /** Alle Weine im Keller; Filter wirken lokal auf Kacheln, Tabelle und Pivot. */
  protected readonly allWines = computed(() => (this.list.hasValue() ? this.list.value() : []));
  protected readonly wines = computed(() => this.view.apply(this.allWines()));
  protected readonly tableRows = computed(() => this.view.sorted(this.wines()));
  protected readonly visibleColumns = this.view.columns;
  protected readonly visibleKeys = computed(() => this.visibleColumns().map((c) => c.key));
  protected readonly bottleCount = computed(() => this.wines().reduce((sum, w) => sum + w.quantity, 0));
  protected readonly filtered = computed(() => Object.keys(this.view.filters()).length > 0 || this.view.drilled());
  protected readonly loading = computed(() => this.list.isLoading() && !this.list.hasValue());
  protected readonly error = computed(() => {
    const error = this.list.error();
    return error ? errorMessage(error) : null;
  });

  /** Einzige gewählte Weinart (für die Chips) oder `null`. */
  protected readonly singleType = computed(() => {
    const selected = multiValues(this.view.filters(), 'type');
    return selected.length === 1 ? selected[0] : null;
  });
  protected readonly typeActive = computed(() => multiValues(this.view.filters(), 'type').length > 0);

  protected setType(label: string | null): void {
    this.view.setFilter('type', label ?? '');
  }

  protected link = (wine: Wine): unknown[] => ['/wines', wine.id];

  protected exportTable(): void {
    downloadText('keller.csv', tableCsv(this.tableRows(), this.visibleColumns()));
  }

  protected onCell(event: PivotCellEvent): void {
    this.view.drill(event.row, event.col);
  }

  /** Opens the rack used last (or the first by name) in 3D; "Zurück zur Liste" brings back search and filter. */
  protected async open3d(): Promise<void> {
    if (!this.webgl || this.opening3d()) return;
    this.opening3d.set(true);
    try {
      const racks = await this.api.listRacks();
      const rack = rackToOpen(racks, await this.storage.get(LAST_RACK_KEY));
      if (!rack) {
        this.noRack.set(true);
        return;
      }
      const filters = this.view.filters();
      await this.router.navigate(['/racks', rack.id], {
        queryParams: { view: '3d', from: 'cellar', q: filters['q'] || null, type: filters['type'] || null },
      });
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.opening3d.set(false);
    }
  }

  protected hint(wine: Wine) {
    return drinkWindow(wine, this.year);
  }

  protected reload(): void {
    this.list.reload();
  }

  protected async addBottle(wine: Wine): Promise<void> {
    try {
      const updated = await this.api.addBottles(wine.id, 1);
      this.list.update((list) => list?.map((w) => (w.id === updated.id ? updated : w)));
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

}
