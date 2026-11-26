import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/errors';
import { counterpartyLabel } from '../core/labels';
import { ArchiveEntry } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Modal } from './modal';
import { StarRating } from './star-rating';

/** Edits what can be changed afterwards: rating and note for drunk wines, else buyer/recipient and price. */
@Component({
  selector: 'app-entry-edit-dialog',
  imports: [FormsModule, Modal, StarRating],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal label="Eintrag bearbeiten" (closed)="closed.emit()">
      <h2>Eintrag bearbeiten</h2>
      <form class="stack" (ngSubmit)="save()">
        @if (entry().kind === 'Drunk') {
          <div class="field">
            <span class="label" id="edit-rating">Bewertung</span>
            <app-star-rating [(value)]="rating" />
          </div>
          <div class="field">
            <label for="edit-note">Verkostungsnotiz</label>
            <textarea id="edit-note" name="note" rows="4" [(ngModel)]="note"></textarea>
          </div>
        } @else {
          <div class="field">
            <label for="edit-who">{{ whoLabel() }}</label>
            <input id="edit-who" name="who" [(ngModel)]="counterparty" />
          </div>
          @if (entry().kind === 'Sold') {
            <div class="field">
              <label for="edit-price">Preis (€)</label>
              <input id="edit-price" name="price" type="number" inputmode="decimal" step="0.01" min="0"
                [(ngModel)]="price" />
            </div>
          }
        }
        <div class="actions">
          <button type="button" class="btn" (click)="closed.emit()">Abbrechen</button>
          <button type="submit" class="btn btn-primary" [disabled]="busy()">Speichern</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class EntryEditDialog implements OnInit {
  readonly entry = input.required<ArchiveEntry>();
  readonly saved = output<ArchiveEntry>();
  readonly closed = output<void>();

  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  protected readonly busy = signal(false);
  protected readonly rating = signal<number | null>(null);
  protected readonly note = signal('');
  protected readonly counterparty = signal('');
  protected readonly price = signal<number | null>(null);

  ngOnInit(): void {
    const entry = this.entry();
    this.rating.set(entry.rating);
    this.note.set(entry.tastingNote ?? '');
    this.counterparty.set(entry.counterparty ?? '');
    this.price.set(entry.price);
  }

  protected whoLabel(): string {
    return counterpartyLabel(this.entry().kind);
  }

  protected async save(): Promise<void> {
    const entry = this.entry();
    const drunk = entry.kind === 'Drunk';
    this.busy.set(true);
    try {
      const updated = await this.api.updateArchiveEntry(entry.id, {
        rating: drunk ? this.rating() : entry.rating,
        tastingNote: drunk ? this.note().trim() || null : entry.tastingNote,
        counterparty: drunk ? entry.counterparty : this.counterparty().trim() || null,
        price: entry.kind === 'Sold' ? this.price() : entry.price,
      });
      this.toast.info('Eintrag gespeichert.');
      this.saved.emit(updated);
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
