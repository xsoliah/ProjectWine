import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { errorMessage } from '../../core/errors';
import { RackSummary } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';

interface RackDraft {
  id: string | null;
  name: string;
  height: number;
  width: number;
}

const MAX_SIZE = 50;

/** The user's wine racks: capacity, occupied and free slots; create, edit and delete. */
@Component({
  selector: 'app-racks',
  imports: [FormsModule, RouterLink, Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './racks.css',
  template: `
    <div class="page stack">
      <div class="page-head">
        <h1>Regale</h1>
        <button type="button" class="btn btn-primary" (click)="startCreate()"><app-icon name="plus" /> Regal anlegen</button>
      </div>

      @if (error(); as text) {
        <div class="banner error" role="alert">
          {{ text }} <button type="button" class="btn-link" (click)="load()">Erneut laden</button>
        </div>
      }

      @if (loading()) {
        <p class="muted" role="status">Regale werden geladen …</p>
      } @else if (racks().length === 0 && !error()) {
        <div class="empty">
          <app-icon name="rack" />
          <h2>Noch keine Regale</h2>
          <p>Bilde deine Weinregale mit Reihen und Spalten ab, um jeder Flasche ein Fach zu geben.</p>
          <button type="button" class="btn btn-primary" (click)="startCreate()">Regal anlegen</button>
        </div>
      } @else {
        <ul class="racks">
          @for (rack of racks(); track rack.id) {
            <li class="panel rack">
              <a class="main" [routerLink]="['/racks', rack.id]">
                <span class="name">{{ rack.name }}</span>
                <span class="muted">{{ rack.height }} Reihen × {{ rack.width }} Spalten · {{ rack.capacity }} Fächer</span>
                <span class="fill" role="img"
                  [attr.aria-label]="rack.occupied + ' von ' + rack.capacity + ' Fächern belegt'">
                  <span class="bar" [style.width.%]="rack.capacity ? (rack.occupied / rack.capacity) * 100 : 0"></span>
                </span>
                <span class="counts">
                  <strong>{{ rack.occupied }}</strong> belegt · <strong>{{ rack.free }}</strong> frei
                </span>
              </a>
              <div class="tools">
                <button type="button" class="btn btn-small" (click)="startEdit(rack)">Bearbeiten</button>
                <button type="button" class="btn btn-small" [disabled]="busy()" (click)="remove(rack)">Löschen</button>
              </div>
            </li>
          }
        </ul>
      }
    </div>

    @if (draft(); as d) {
      <app-modal [label]="d.id ? 'Regal bearbeiten' : 'Regal anlegen'" (closed)="draft.set(null)">
        <h2>{{ d.id ? 'Regal bearbeiten' : 'Regal anlegen' }}</h2>
        <form class="stack" (ngSubmit)="save()">
          <div class="field">
            <label for="r-name">Name</label>
            <input id="r-name" name="name" autocomplete="off" required maxlength="100" placeholder="z. B. Keller links"
              [ngModel]="d.name" (ngModelChange)="patch({ name: $event })" />
          </div>
          <div class="field-grid">
            <div class="field">
              <label for="r-height">Höhe (Reihen)</label>
              <input id="r-height" name="height" type="number" inputmode="numeric" min="1" [max]="maxSize" required
                [ngModel]="d.height" (ngModelChange)="patch({ height: $event })" />
            </div>
            <div class="field">
              <label for="r-width">Breite (Spalten)</label>
              <input id="r-width" name="width" type="number" inputmode="numeric" min="1" [max]="maxSize" required
                [ngModel]="d.width" (ngModelChange)="patch({ width: $event })" />
            </div>
          </div>
          <p class="muted">Kapazität: {{ capacity(d) }} Fächer – jedes Fach fasst eine Flasche.</p>
          <div class="actions">
            <button type="button" class="btn" (click)="draft.set(null)">Abbrechen</button>
            <button type="submit" class="btn btn-primary" [disabled]="busy() || !valid(d)">Speichern</button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class Racks {
  /** `?create=1` opens the "Regal anlegen" dialog right away (e.g. from the cellar list). */
  readonly create = input<string | undefined>();

  private readonly api = inject(ApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly maxSize = MAX_SIZE;
  protected readonly racks = signal<RackSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly draft = signal<RackDraft | null>(null);

  constructor() {
    void this.load();
    queueMicrotask(() => {
      if (this.create()) this.startCreate();
    });
  }

  protected async load(): Promise<void> {
    this.error.set(null);
    try {
      this.racks.set(await this.api.listRacks());
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected startCreate(): void {
    this.draft.set({ id: null, name: '', height: 5, width: 6 });
  }

  protected startEdit(rack: RackSummary): void {
    this.draft.set({ id: rack.id, name: rack.name, height: rack.height, width: rack.width });
  }

  protected patch(change: Partial<RackDraft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
  }

  protected capacity(d: RackDraft): number {
    return this.validSize(d) ? Number(d.height) * Number(d.width) : 0;
  }

  protected valid(d: RackDraft): boolean {
    return d.name.trim() !== '' && this.validSize(d);
  }

  private validSize(d: RackDraft): boolean {
    const size = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_SIZE;
    return size(Number(d.height)) && size(Number(d.width));
  }

  protected async save(): Promise<void> {
    const d = this.draft();
    if (!d || !this.valid(d)) return;
    const request = { name: d.name.trim(), height: Number(d.height), width: Number(d.width) };
    this.busy.set(true);
    try {
      if (d.id) {
        await this.api.updateRack(d.id, request);
        this.toast.info('Regal gespeichert.');
      } else {
        await this.api.createRack(request);
        this.toast.info(`„${request.name}“ angelegt.`);
      }
      this.draft.set(null);
      await this.load();
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(rack: RackSummary): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Regal löschen?',
      message:
        rack.occupied > 0
          ? `„${rack.name}“ wird gelöscht. Die ${rack.occupied} Flasche(n) darin bleiben im Keller, sind dann aber keinem Fach mehr zugeordnet.`
          : `„${rack.name}“ wird gelöscht.`,
      confirmLabel: 'Löschen',
      danger: true,
    });
    if (!ok) return;
    this.busy.set(true);
    try {
      await this.api.deleteRack(rack.id);
      this.toast.info('Regal gelöscht.');
      await this.load();
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
