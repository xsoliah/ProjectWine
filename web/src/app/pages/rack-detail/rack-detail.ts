import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/errors';
import { wineTitle } from '../../core/format';
import { Rack, RackSlot, RackSummary, Wine } from '../../core/models';
import {
  Cell,
  LAST_RACK_KEY,
  occupiedInRow,
  rowEntries,
  slotAt,
  webglAvailable,
} from '../../core/racks';
import { StorageService } from '../../core/storage.service';
import { ToastService } from '../../core/toast.service';
import { ConsumeDialog } from '../../shared/consume-dialog';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';
import { Rack3d } from '../../shared/rack-3d';
import { TypeBadge } from '../../shared/type-badge';

type View = 'grid' | '3d';

/**
 * One rack: as a grid (default) or, optionally, in 3D. Tapping a slot opens its actions
 * (place, move, take out, drink/sell/gift); in 3D a tap selects a row and lists its slots.
 */
@Component({
  selector: 'app-rack-detail',
  imports: [RouterLink, Icon, Modal, TypeBadge, ConsumeDialog, Rack3d],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rack-detail.html',
  styleUrl: './rack-detail.css',
})
export class RackDetail {
  readonly id = input.required<string>();
  /** `?view=3d` opens the 3D view; anything else the grid. */
  readonly view = input<string | undefined>();
  /** `?from=cellar`: came from the cellar list via "In 3D ansehen" (then with its search `q` and type filter). */
  readonly from = input<string | undefined>();
  readonly q = input<string | undefined>();
  readonly type = input<string | undefined>();
  /** Serialized filter of the cellar list (`?f=`), passed back on "Zurück zur Liste". */
  readonly f = input<string | undefined>();
  /** `?place=<wineId>`: choose a free slot for a bottle of this wine. */
  readonly place = input<string | undefined>();

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);

  protected readonly rack = signal<Rack | null>(null);
  protected readonly racks = signal<RackSummary[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly webgl = webglAvailable();
  private readonly contextLost = signal(false);
  protected readonly mode = computed<View>(() => (this.view() === '3d' && this.can3d() ? '3d' : 'grid'));
  protected readonly can3d = computed(() => this.webgl && !this.contextLost());

  protected readonly selectedRow = signal<number | null>(null);
  protected readonly rowList = computed(() => {
    const rack = this.rack();
    const row = this.selectedRow();
    return rack && row !== null ? rowEntries(rack, row) : [];
  });
  protected readonly rows = computed(() => {
    const rack = this.rack();
    return rack
      ? Array.from({ length: rack.height }, (_, i) => ({ row: i + 1, occupied: occupiedInRow(rack, i + 1) }))
      : [];
  });
  protected readonly columns = computed(() => Array.from({ length: this.rack()?.width ?? 0 }, (_, i) => i + 1));

  /** Slot whose actions are shown. */
  protected readonly active = signal<Cell | null>(null);
  protected readonly activeSlot = computed(() => {
    const rack = this.rack();
    const cell = this.active();
    return rack && cell ? slotAt(rack, cell.row, cell.column) : null;
  });
  /** Wines with bottles that lie in no slot yet (offered for a free slot). */
  protected readonly unplacedWines = signal<Wine[]>([]);

  /** Bottle being moved: the next tap on a free slot (in any rack) is the target. */
  protected readonly moving = signal<{ slot: RackSlot; fromRack: string } | null>(null);
  /** Wine of `?place=`, while choosing a slot for it. */
  protected readonly placing = signal<Wine | null>(null);
  protected readonly consuming = signal<{ slot: RackSlot; label: string } | null>(null);

  constructor() {
    effect(() => {
      const id = this.id();
      this.selectedRow.set(null);
      this.active.set(null);
      void this.load(id);
    });
    effect(() => {
      const wineId = this.place();
      void this.loadPlacing(wineId ?? null);
    });
    void this.loadRacks();
  }

  protected slotAt(row: number, column: number): RackSlot | null {
    const rack = this.rack();
    return rack ? slotAt(rack, row, column) : null;
  }

  protected wineLabel(slot: RackSlot): string {
    return wineTitle(slot.wine);
  }

  protected cellLabel(row: number, column: number): string {
    const slot = this.slotAt(row, column);
    return `Reihe ${row}, Spalte ${column}: ${slot ? wineTitle(slot.wine) : 'frei'}`;
  }

  protected setView(view: View): void {
    this.selectedRow.set(null);
    void this.router.navigate([], {
      queryParams: { view: view === '3d' ? '3d' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected switchRack(id: string): void {
    void this.router.navigate(['/racks', id], { queryParamsHandling: 'merge' });
  }

  protected backToCellar(): void {
    void this.router.navigate(['/cellar'], {
      queryParams: { q: this.q() || null, type: this.type() || null, f: this.f() || null },
    });
  }

  protected onContextLost(): void {
    this.contextLost.set(true);
    this.toast.error('Die 3D-Ansicht wurde vom Browser beendet. Das Regal wird als Raster angezeigt.');
  }

  protected selectRow(row: number): void {
    this.selectedRow.set(row);
  }

  /** A tap on a slot (grid, row panel): completes a move/placement or opens the slot actions. */
  protected async onCell(row: number, column: number): Promise<void> {
    const rack = this.rack();
    if (!rack || this.busy()) return;
    const slot = slotAt(rack, row, column);

    const moving = this.moving();
    if (moving) {
      if (slot?.id === moving.slot.id) return;
      if (slot) {
        this.toast.error(`Reihe ${row}, Spalte ${column} ist bereits belegt. Bitte ein freies Fach wählen.`);
        return;
      }
      await this.run(async () => {
        this.rack.set(await this.api.moveBottle(moving.slot.id, rack.id, row, column));
        this.moving.set(null);
        this.toast.info(`Umgelagert nach Reihe ${row}, Spalte ${column}.`);
        void this.loadRacks();
      });
      return;
    }

    const placing = this.placing();
    if (placing && !slot) {
      await this.placeWine(placing, row, column);
      return;
    }

    this.active.set({ row, column });
    if (!slot) void this.loadUnplacedWines();
  }

  protected async placeWine(wine: Wine, row: number, column: number): Promise<void> {
    const rack = this.rack();
    if (!rack) return;
    await this.run(async () => {
      this.rack.set(await this.api.placeBottle(rack.id, wine.id, row, column));
      this.active.set(null);
      this.toast.info(`„${wine.name}“ in Reihe ${row}, Spalte ${column} eingelagert.`);
      void this.loadRacks();
      if (this.placing()?.id === wine.id) {
        const updated = await this.api.getWine(wine.id);
        if (updated.unplacedCount > 0) {
          this.placing.set(updated);
        } else {
          this.stopPlacing();
        }
      }
    });
  }

  protected startMove(slot: RackSlot): void {
    this.moving.set({ slot, fromRack: this.rack()?.name ?? '' });
    this.active.set(null);
  }

  protected async takeOut(slot: RackSlot): Promise<void> {
    await this.run(async () => {
      this.rack.set(await this.api.removeBottle(slot.id));
      this.active.set(null);
      this.toast.info(`„${slot.wine.name}“ aus dem Fach genommen – die Flasche bleibt im Keller.`);
      void this.loadRacks();
    });
  }

  protected startConsume(slot: RackSlot): void {
    this.consuming.set({ slot, label: `${this.rack()?.name} – Reihe ${slot.row}, Spalte ${slot.column}` });
    this.active.set(null);
  }

  protected async onConsumed(): Promise<void> {
    this.consuming.set(null);
    await this.load(this.id());
    void this.loadRacks();
  }

  protected stopPlacing(): void {
    this.placing.set(null);
    void this.router.navigate([], { queryParams: { place: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } catch (error) {
      this.toast.error(errorMessage(error));
      await this.load(this.id());
    } finally {
      this.busy.set(false);
    }
  }

  private async load(id: string): Promise<void> {
    this.error.set(null);
    try {
      const rack = await this.api.getRack(id);
      if (id !== this.id()) return;
      this.rack.set(rack);
      void this.storage.set(LAST_RACK_KEY, rack.id);
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private async loadRacks(): Promise<void> {
    try {
      this.racks.set(await this.api.listRacks());
    } catch {
      // The selector is optional; errors of the rack itself are shown by load().
    }
  }

  private async loadPlacing(wineId: string | null): Promise<void> {
    if (!wineId) {
      this.placing.set(null);
      return;
    }
    try {
      const wine = await this.api.getWine(wineId);
      this.placing.set(wine.unplacedCount > 0 ? wine : null);
      if (wine.unplacedCount === 0) this.toast.info(`Alle Flaschen von „${wine.name}“ sind bereits eingelagert.`);
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  private async loadUnplacedWines(): Promise<void> {
    try {
      const wines = await this.api.listWines({ search: '', type: null });
      this.unplacedWines.set(wines.filter((w) => w.unplacedCount > 0));
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }
}
