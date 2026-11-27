import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { drinkWindow } from '../../core/drink-window';
import { errorMessage } from '../../core/errors';
import { serializeFilter } from '../../core/filter-expr';
import { ListViewState } from '../../core/list-view-state';
import { distinctOptions } from '../../core/list-options';
import { Wine } from '../../core/models';
import { LAST_RACK_KEY, rackToOpen, webglAvailable } from '../../core/racks';
import { StorageService } from '../../core/storage.service';
import { ToastService } from '../../core/toast.service';
import { AuthImage } from '../../core/images';
import { DxDataGrid } from '../../shared/dx/dx-data-grid';
import { DxPivotGrid } from '../../shared/dx/dx-pivot-grid';
import { Icon } from '../../shared/icon';
import { ListFilter } from '../../shared/list-filter';
import { TypeBadge } from '../../shared/type-badge';
import { ViewSwitch } from '../../shared/view-switch';
import { CELLAR_LEGACY, CELLAR_PIVOT, CELLAR_PRESETS, CELLAR_SEARCH_KEYS, cellarFields, cellarKpis, cellarMeasures } from './cellar.views';

@Component({
  selector: 'app-cellar',
  imports: [FormsModule, RouterLink, Icon, TypeBadge, AuthImage, ViewSwitch, ListFilter, DxDataGrid, DxPivotGrid],
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

  protected readonly fields = cellarFields(this.year);
  protected readonly measures = cellarMeasures();
  protected readonly pivotLayout = CELLAR_PIVOT;
  protected readonly presets = CELLAR_PRESETS;
  protected readonly kpis = cellarKpis();

  /** Ansicht, Suche und Filter stehen in der URL (?view=, ?q=, ?f=), damit sie eine Einzelansicht überleben. */
  protected readonly view = new ListViewState<Wine>({
    id: 'cellar',
    fields: this.fields,
    legacy: CELLAR_LEGACY,
    searchKeys: CELLAR_SEARCH_KEYS,
  });

  protected readonly webgl = webglAvailable();
  /** "In 3D ansehen" without any rack: hint with "Regal anlegen". */
  protected readonly noRack = signal(false);
  protected readonly opening3d = signal(false);

  private readonly list = resource({ loader: () => this.api.listWines({ search: '', type: null }) });

  /** Alle Weine im Keller; Suche und Filter wirken lokal auf Kacheln, Tabelle und Pivot. */
  protected readonly allWines = computed(() => (this.list.hasValue() ? this.list.value() : []));
  protected readonly wines = computed(() => this.view.apply(this.allWines()));
  /** Nur nach Suche gefiltert: die Tabelle wendet den Filter selbst an. */
  protected readonly searched = computed(() => this.view.applySearch(this.allWines()));
  protected readonly options = computed(() => distinctOptions(this.fields, this.allWines()));
  protected readonly bottleCount = computed(() => this.wines().reduce((sum, w) => sum + w.quantity, 0));
  protected readonly loading = computed(() => this.list.isLoading() && !this.list.hasValue());
  protected readonly error = computed(() => {
    const error = this.list.error();
    return error ? errorMessage(error) : null;
  });

  protected link = (wine: Wine): unknown[] => ['/wines', wine.id];

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
      await this.router.navigate(['/racks', rack.id], {
        queryParams: {
          view: '3d',
          from: 'cellar',
          q: this.view.search() || null,
          f: serializeFilter(this.view.activeFilter(), this.fields),
        },
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
