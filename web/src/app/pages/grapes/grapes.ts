import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { errorMessage } from '../../core/errors';
import { GrapeVariety } from '../../core/models';
import { ToastService } from '../../core/toast.service';

/** Maintenance of the user's grape varieties: create, rename, merge duplicates, delete unused ones. */
@Component({
  selector: 'app-grapes',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../origins/origins.css',
  template: `
    <div class="page stack">
      <div class="page-head">
        <h1>Rebsorten</h1>
        <a class="btn" routerLink="/settings">Zurück</a>
      </div>

      <p class="muted">
        Doppelte Einträge wie „Spätburgunder“ und „Pinot Noir“ kannst du zusammenführen – alle Weine bekommen dann die Ziel-Rebsorte.
      </p>

      <form class="panel row" (ngSubmit)="add()">
        <div class="field grow">
          <label for="new-grape">Neue Rebsorte</label>
          <input id="new-grape" name="newGrape" autocomplete="off" placeholder="z. B. Sangiovese"
            [ngModel]="newName()" (ngModelChange)="newName.set($event)" />
        </div>
        <button type="submit" class="btn btn-primary" [disabled]="busy() || !newName().trim()">Rebsorte anlegen</button>
      </form>

      @if (error(); as text) {
        <div class="banner error" role="alert">{{ text }}</div>
      }

      @if (loading()) {
        <p class="muted" role="status">Wird geladen …</p>
      } @else if (grapes().length === 0 && !error()) {
        <div class="empty">
          <h2>Noch keine Rebsorten</h2>
          <p>Lege eine Rebsorte hier oder direkt beim Erfassen eines Weins an.</p>
        </div>
      } @else {
        <ul class="countries">
          @for (grape of grapes(); track grape.id) {
            <li class="panel item">
              @if (editing()?.id === grape.id && editing()?.mode === 'rename') {
                <form class="inline" (ngSubmit)="saveRename()">
                  <label class="sr-only" [for]="'rn-' + grape.id">Neuer Name für {{ grape.name }}</label>
                  <input [id]="'rn-' + grape.id" name="rename" [ngModel]="editText()" (ngModelChange)="editText.set($event)" />
                  <button type="submit" class="btn btn-small btn-primary" [disabled]="busy()">Speichern</button>
                  <button type="button" class="btn btn-small" (click)="editing.set(null)">Abbrechen</button>
                </form>
              } @else if (editing()?.id === grape.id && editing()?.mode === 'merge') {
                <form class="inline" (ngSubmit)="saveMerge(grape)">
                  <label [for]="'mg-' + grape.id">„{{ grape.name }}“ zusammenführen in</label>
                  <select [id]="'mg-' + grape.id" name="target" [ngModel]="mergeTarget()" (ngModelChange)="mergeTarget.set($event)">
                    <option value="" disabled>Rebsorte wählen</option>
                    @for (other of others(grape.id); track other.id) {
                      <option [value]="other.id">{{ other.name }}</option>
                    }
                  </select>
                  <button type="submit" class="btn btn-small btn-primary" [disabled]="busy() || !mergeTarget()">Zusammenführen</button>
                  <button type="button" class="btn btn-small" (click)="editing.set(null)">Abbrechen</button>
                </form>
              } @else {
                <span class="name">{{ grape.name }}</span>
                <span class="muted count">{{ grape.wineCount }} {{ grape.wineCount === 1 ? 'Wein' : 'Weine' }}</span>
                <div class="tools">
                  <button type="button" class="btn btn-small" (click)="startRename(grape)">Umbenennen</button>
                  <button type="button" class="btn btn-small" [disabled]="others(grape.id).length === 0"
                    (click)="startMerge(grape)">Zusammenführen</button>
                  <button type="button" class="btn btn-small" [disabled]="busy() || grape.wineCount > 0"
                    (click)="remove(grape)">Löschen</button>
                </div>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class Grapes {
  private readonly api = inject(ApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly grapes = signal<GrapeVariety[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly newName = signal('');
  protected readonly editing = signal<{ id: string; mode: 'rename' | 'merge' } | null>(null);
  protected readonly editText = signal('');
  protected readonly mergeTarget = signal('');

  constructor() {
    void this.load();
  }

  protected others(id: string): GrapeVariety[] {
    return this.grapes().filter((g) => g.id !== id);
  }

  protected startRename(grape: GrapeVariety): void {
    this.editing.set({ id: grape.id, mode: 'rename' });
    this.editText.set(grape.name);
  }

  protected startMerge(grape: GrapeVariety): void {
    this.editing.set({ id: grape.id, mode: 'merge' });
    this.mergeTarget.set('');
  }

  protected async add(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return;
    await this.run(async () => {
      await this.api.createGrape(name);
      this.newName.set('');
    }, `„${name}“ angelegt.`);
  }

  protected async saveRename(): Promise<void> {
    const id = this.editing()?.id;
    const name = this.editText().trim();
    if (!id || !name) return;
    await this.run(() => this.api.renameGrape(id, name), 'Umbenannt.');
  }

  protected async saveMerge(source: GrapeVariety): Promise<void> {
    const target = this.grapes().find((g) => g.id === this.mergeTarget());
    if (!target) return;
    const ok = await this.confirm.ask({
      title: 'Zusammenführen?',
      message: `Alle Weine mit „${source.name}“ bekommen „${target.name}“, danach wird „${source.name}“ gelöscht.`,
      confirmLabel: 'Zusammenführen',
    });
    if (!ok) return;
    await this.run(() => this.api.mergeGrape(source.id, target.id), `„${source.name}“ mit „${target.name}“ zusammengeführt.`);
  }

  protected async remove(grape: GrapeVariety): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Rebsorte löschen?',
      message: `„${grape.name}“ wird gelöscht.`,
      confirmLabel: 'Löschen',
      danger: true,
    });
    if (!ok) return;
    await this.run(() => this.api.deleteGrape(grape.id), `„${grape.name}“ gelöscht.`);
  }

  private async run(action: () => Promise<unknown>, success: string): Promise<void> {
    this.busy.set(true);
    try {
      await action();
      this.editing.set(null);
      this.toast.info(success);
      await this.load();
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    try {
      this.grapes.set(await this.api.listGrapes());
      this.error.set(null);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
