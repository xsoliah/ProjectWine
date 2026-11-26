import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { drinkWindow } from '../../core/drink-window';
import { errorMessage } from '../../core/errors';
import { WINE_TYPES } from '../../core/labels';
import { Wine, WineType } from '../../core/models';
import { LAST_RACK_KEY, rackToOpen, webglAvailable } from '../../core/racks';
import { StorageService } from '../../core/storage.service';
import { ToastService } from '../../core/toast.service';
import { AuthImage } from '../../core/images';
import { Icon } from '../../shared/icon';
import { TypeBadge } from '../../shared/type-badge';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-cellar',
  imports: [FormsModule, RouterLink, Icon, TypeBadge, AuthImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cellar.html',
  styleUrl: './cellar.css',
})
export class Cellar implements OnInit {
  /** Search and type filter live in the URL (?q=, ?type=) so they survive a trip to the 3D view. */
  readonly q = input<string | undefined>();
  readonly typeParam = input<string | undefined>(undefined, { alias: 'type' });

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);

  protected readonly webgl = webglAvailable();
  /** "In 3D ansehen" without any rack: hint with "Regal anlegen". */
  protected readonly noRack = signal(false);
  protected readonly opening3d = signal(false);

  protected readonly types = WINE_TYPES;
  protected readonly searchText = signal('');
  protected readonly type = signal<WineType | null>(null);
  private readonly search = signal('');
  private readonly year = new Date().getFullYear();

  private readonly list = resource({
    params: () => ({ search: this.search(), type: this.type() }),
    loader: ({ params }) => this.api.listWines(params),
  });

  protected readonly wines = computed(() => (this.list.hasValue() ? this.list.value() : []));
  protected readonly bottleCount = computed(() => this.wines().reduce((sum, w) => sum + w.quantity, 0));
  protected readonly filtered = computed(() => this.search() !== '' || this.type() !== null);
  protected readonly loading = computed(() => this.list.isLoading() && !this.list.hasValue());
  protected readonly error = computed(() => {
    const error = this.list.error();
    return error ? errorMessage(error) : null;
  });

  constructor() {
    effect((onCleanup) => {
      const text = this.searchText().trim();
      const timer = setTimeout(() => this.search.set(text), SEARCH_DEBOUNCE_MS);
      onCleanup(() => clearTimeout(timer));
    });
    effect(() => {
      const q = this.search();
      const type = this.type();
      void this.router.navigate([], {
        queryParams: { q: q || null, type: type ?? null },
        replaceUrl: true,
      });
    });
  }

  ngOnInit(): void {
    const q = this.q()?.trim() ?? '';
    this.searchText.set(q);
    this.search.set(q);
    const type = this.typeParam();
    if (type && this.types.some((t) => t.value === type)) this.type.set(type as WineType);
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
      await this.router.navigate(['/racks', rack.id], {
        queryParams: { view: '3d', from: 'cellar', q: this.search() || null, type: this.type() ?? null },
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
