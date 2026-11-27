import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import {
  CellarRoom,
  RackPlacement,
  RoomRack,
  checkFit,
  describePlacement,
  firstFreeSpot,
  rotateAround,
} from '../../core/cellar-room';
import { errorMessage } from '../../core/errors';
import { hasWebGl } from '../../core/webgl';
import { CellarRoom3d } from '../../shared/cellar-room-3d';

const STEP = 10;
const FINE_STEP = 1;

/** The cellar as a 3D room: set the room size and place, turn and remove the racks. */
@Component({
  selector: 'app-cellar-room',
  imports: [FormsModule, RouterLink, CellarRoom3d],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './cellar-room.css',
  template: `
    <div class="page stack">
      <div class="page-head">
        <h1>Kellerraum</h1>
        <div class="segmented" role="group" aria-label="Modus">
          <button type="button" class="chip" [attr.aria-pressed]="!arrange()" (click)="setArrange(false)">Ansehen</button>
          <button type="button" class="chip" [attr.aria-pressed]="arrange()" (click)="setArrange(true)">Anordnen</button>
        </div>
      </div>

      @if (error(); as text) {
        <div class="banner error" role="alert">
          {{ text }} <button type="button" class="btn-link" (click)="load()">Neu laden</button>
        </div>
      }

      @if (loading()) {
        <p class="muted" role="status">Kellerraum wird geladen …</p>
      } @else if (room(); as r) {
        <details class="size-form">
          <summary>Raummaße: {{ meters(r.widthCm) }} × {{ meters(r.depthCm) }} m, Decke {{ meters(r.heightCm) }} m</summary>
          <form class="size-fields" (submit)="$event.preventDefault(); saveRoom()">
            <label>Breite (m)
              <input type="number" name="width" step="0.01" min="1" max="20" inputmode="decimal" [(ngModel)]="widthM" />
            </label>
            <label>Tiefe (m)
              <input type="number" name="depth" step="0.01" min="1" max="20" inputmode="decimal" [(ngModel)]="depthM" />
            </label>
            <label>Deckenhöhe (m)
              <input type="number" name="height" step="0.01" min="1.5" max="5" inputmode="decimal" [(ngModel)]="heightM" />
            </label>
            <button type="submit" class="btn" [disabled]="busy()">Maße speichern</button>
          </form>
          <p class="muted small">Ein Fach misst 12 × 12 cm, ein Regal ist 38 cm tief.</p>
        </details>

        @if (r.racks.length === 0) {
          <div class="empty">
            <h2>Noch keine Regale</h2>
            <p>Lege zuerst unter <a routerLink="/racks">Regale</a> ein Regal an, dann kannst du es hier im Raum aufstellen.</p>
          </div>
        }

        @if (!can3d()) {
          <p class="banner" role="status">Die 3D-Ansicht ist auf diesem Gerät nicht verfügbar. Du kannst die Regale trotzdem über die Liste platzieren.</p>
        }

        <p class="sr-only" id="room-desc">
          Kellerraum von {{ meters(r.widthCm) }} mal {{ meters(r.depthCm) }} Metern mit {{ placedCount() }} platzierten
          {{ placedCount() === 1 ? 'Regal' : 'Regalen' }}. Die Regalliste ist der barrierefreie Zugang.
        </p>

        <div class="layout">
          @if (can3d()) {
            <div class="stage" tabindex="0" role="group" aria-label="Kellerraum in 3D" aria-describedby="room-desc" (keydown)="onKey($event)">
              @defer (on immediate) {
                <app-cellar-room-3d [room]="r" [selectedId]="selectedId()" [arrange]="arrange()"
                  (rackTapped)="select($event)" (rackMoved)="applyPlacement($event.id, $event.placement)"
                  (dragChange)="onDrag($event)" (contextLost)="can3d.set(false)" />
              } @loading (minimum 200ms) {
                <p class="muted loading" role="status">3D-Ansicht wird geladen …</p>
              } @error {
                <p class="banner error" role="alert">Die 3D-Ansicht konnte nicht geladen werden.</p>
              }
            </div>
          }

          <div class="side stack">
            <p class="status" role="status" aria-live="polite">{{ status() }}</p>

            @if (!arrange() && selected(); as s) {
              <section class="info card" aria-label="Ausgewähltes Regal">
                <h2>{{ s.name }}</h2>
                <p>{{ s.height }} Reihen × {{ s.width }} Spalten · {{ s.occupied }} belegt, {{ s.free }} frei</p>
                <a class="btn btn-primary" [routerLink]="['/racks', s.id]">Regal öffnen</a>
                <button type="button" class="btn-link" (click)="select(null)">Auswahl aufheben</button>
              </section>
            }

            <section aria-labelledby="placed-h">
              <h2 id="placed-h">Im Raum</h2>
              @if (placed().length === 0) {
                <p class="muted">Noch kein Regal im Raum aufgestellt.</p>
              }
              <ul class="rack-list">
                @for (rack of placed(); track rack.id) {
                  <li [class.selected]="rack.id === selectedId()">
                    <button type="button" class="pick" [attr.aria-pressed]="rack.id === selectedId()" (click)="select(rack.id === selectedId() ? null : rack.id)">
                      <span class="name">{{ rack.name }}</span>
                      <span class="muted small">{{ rack.height }} × {{ rack.width }}, {{ rack.occupied }} belegt · {{ describe(rack.placement) }}</span>
                    </button>
                    @if (arrange() && rack.id === selectedId()) {
                      <div class="edit">
                        <label>Links (cm)
                          <input type="number" [value]="rack.placement!.x" step="1" (change)="setCoordinate(rack, 'x', $any($event.target).value)" />
                        </label>
                        <label>Hinten (cm)
                          <input type="number" [value]="rack.placement!.z" step="1" (change)="setCoordinate(rack, 'z', $any($event.target).value)" />
                        </label>
                        <button type="button" class="btn btn-small" (click)="rotate(rack)" [disabled]="busy()">Drehen</button>
                        <button type="button" class="btn btn-small" (click)="remove(rack)" [disabled]="busy()">Entfernen</button>
                      </div>
                    }
                  </li>
                }
              </ul>
            </section>

            <section aria-labelledby="unplaced-h">
              <h2 id="unplaced-h">Nicht platziert</h2>
              @if (unplaced().length === 0) {
                <p class="muted">Alle Regale stehen im Raum.</p>
              }
              <ul class="rack-list">
                @for (rack of unplaced(); track rack.id) {
                  <li>
                    <span class="pick static">
                      <span class="name">{{ rack.name }}</span>
                      <span class="muted small">{{ rack.height }} × {{ rack.width }} ({{ rack.width * 12 }} × 38 cm)</span>
                    </span>
                    @if (arrange()) {
                      <button type="button" class="btn btn-small" (click)="place(rack)" [disabled]="busy()">Platzieren</button>
                    }
                  </li>
                }
              </ul>
              @if (!arrange() && unplaced().length > 0) {
                <p class="muted small">Zum Platzieren in den Modus „Anordnen“ wechseln.</p>
              }
            </section>
          </div>
        </div>
      }
    </div>
  `,
  host: { '(document:keydown.escape)': 'select(null)' },
})
export class CellarRoomPage {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly room = signal<CellarRoom | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal('');
  protected readonly busy = signal(false);
  protected readonly arrange = signal(false);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly can3d = signal(hasWebGl());

  protected widthM = 4;
  protected depthM = 3;
  protected heightM = 2.5;

  protected readonly placed = computed(() => (this.room()?.racks ?? []).filter((r) => r.placement));
  protected readonly unplaced = computed(() => (this.room()?.racks ?? []).filter((r) => !r.placement));
  protected readonly placedCount = computed(() => this.placed().length);
  protected readonly selected = computed(() => this.room()?.racks.find((r) => r.id === this.selectedId()) ?? null);

  constructor() {
    const rack = this.route.snapshot.queryParamMap.get('rack');
    if (rack) this.selectedId.set(rack);
    void this.load();
  }

  protected meters(cm: number): string {
    return (cm / 100).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  protected describe = describePlacement;

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.apply(await this.api.getCellarRoom());
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  private apply(room: CellarRoom): void {
    this.room.set(room);
    this.widthM = room.widthCm / 100;
    this.depthM = room.depthCm / 100;
    this.heightM = room.heightCm / 100;
    if (this.selectedId() && !room.racks.some((r) => r.id === this.selectedId())) this.selectedId.set(null);
  }

  /** Forces the 3D view to show the stored state again (e.g. after a failed save). */
  private resync(): void {
    this.room.update((r) => (r ? { ...r } : r));
  }

  protected setArrange(on: boolean): void {
    this.arrange.set(on);
    this.status.set(on ? 'Anordnen: Regal wählen, ziehen oder mit Pfeiltasten verschieben, R dreht.' : '');
  }

  protected select(id: string | null): void {
    this.selectedId.set(id);
    const rack = this.room()?.racks.find((r) => r.id === id);
    this.status.set(rack ? `„${rack.name}“ ausgewählt, ${describePlacement(rack.placement)}.` : '');
  }

  protected onDrag(info: { x: number; z: number; valid: boolean; reason: string | null } | null): void {
    if (!info) return;
    this.status.set(info.valid ? `${info.x} cm von links, ${info.z} cm von hinten.` : `Ungültig: ${info.reason}`);
  }

  protected async saveRoom(): Promise<void> {
    await this.run(async () => {
      const room = await this.api.saveCellarRoom(
        Math.round(this.widthM * 100),
        Math.round(this.depthM * 100),
        Math.round(this.heightM * 100),
      );
      this.apply(room);
      this.status.set('Raummaße gespeichert.');
    });
  }

  protected async applyPlacement(id: string, placement: RackPlacement): Promise<void> {
    const room = this.room();
    const rack = room?.racks.find((r) => r.id === id);
    if (!room || !rack) return;
    const fit = checkFit(room, rack, placement, room.racks);
    if (!fit.ok) {
      this.status.set(`Nicht möglich: ${fit.reason}`);
      this.resync();
      return;
    }
    await this.run(async () => {
      this.apply(await this.api.placeRack(id, placement));
      this.status.set(`„${rack.name}“: ${describePlacement(placement)}.`);
    });
  }

  protected async setCoordinate(rack: RoomRack, axis: 'x' | 'z', value: string): Promise<void> {
    const number = Math.round(Number(value));
    if (!rack.placement || !Number.isFinite(number)) return;
    await this.applyPlacement(rack.id, { ...rack.placement, [axis]: number });
  }

  protected async rotate(rack: RoomRack): Promise<void> {
    if (!rack.placement) return;
    await this.applyPlacement(rack.id, rotateAround(rack, rack.placement));
  }

  protected async place(rack: RoomRack): Promise<void> {
    const room = this.room();
    if (!room) return;
    const spot = firstFreeSpot(room, rack, room.racks);
    if (!spot) {
      this.status.set(`Im Raum ist kein Platz für „${rack.name}“.`);
      return;
    }
    await this.applyPlacement(rack.id, spot);
    this.selectedId.set(rack.id);
  }

  protected async remove(rack: RoomRack): Promise<void> {
    await this.run(async () => {
      this.apply(await this.api.removeRackPlacement(rack.id));
      this.status.set(`„${rack.name}“ steht nicht mehr im Raum.`);
    });
  }

  protected onKey(event: KeyboardEvent): void {
    const rack = this.selected();
    if (!this.arrange() || !rack?.placement || this.busy()) return;
    const step = event.shiftKey ? FINE_STEP : STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      void this.applyPlacement(rack.id, { ...rack.placement, x: rack.placement.x + move[0], z: rack.placement.z + move[1] });
    } else if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      void this.rotate(rack);
    }
  }

  /** Runs a server call; on failure the 3D view returns to the stored state. */
  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (e) {
      this.error.set(errorMessage(e));
      this.resync();
    } finally {
      this.busy.set(false);
    }
  }
}
