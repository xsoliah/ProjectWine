import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { errorMessage } from '../core/errors';
import { formatDate, formatPrice, wineTitle } from '../core/format';
import { counterpartyLabel, kindLabel, wineTypeLabel } from '../core/labels';
import { ArchiveEntry } from '../core/models';
import { ToastService } from '../core/toast.service';
import { EntryEditDialog } from './entry-edit-dialog';
import { Icon } from './icon';
import { StarRating } from './star-rating';

/** One archive entry with its own edit and undo actions; emits `changed` after either succeeded. */
@Component({
  selector: 'app-archive-entry-item',
  imports: [RouterLink, Icon, StarRating, EntryEditDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-type]': 'entry().wineType' },
  template: `
    <div class="head">
      <div class="title">
        @if (showWine()) {
          <a [routerLink]="['/wines', entry().wineId]">{{ title() }}</a>
          @if (entry().producer) {
            <span class="muted">{{ entry().producer }}</span>
          }
          <span class="muted">{{ typeLabel() }}</span>
        }
      </div>
      <span class="kind" [attr.data-kind]="entry().kind">{{ kind() }}</span>
    </div>
    <p class="facts">
      <span>{{ entry().quantity }} {{ entry().quantity === 1 ? 'Flasche' : 'Flaschen' }}</span>
      <span>{{ date() }}</span>
      @if (entry().counterparty) {
        <span>{{ who() }}: {{ entry().counterparty }}</span>
      }
      @if (entry().price !== null) {
        <span>{{ price() }}</span>
      }
    </p>
    @if (entry().rating !== null) {
      <app-star-rating [value]="entry().rating" [readonly]="true" />
    }
    @if (entry().tastingNote) {
      <blockquote>{{ entry().tastingNote }}</blockquote>
    }
    <div class="row buttons">
      <button type="button" class="btn" (click)="editing.set(true)">
        <app-icon name="edit" /> Bearbeiten
      </button>
      <button type="button" class="btn" [disabled]="busy()" (click)="undo()">
        <app-icon name="undo" /> Rückgängig
      </button>
    </div>
    @if (editing()) {
      <app-entry-edit-dialog
        [entry]="entry()"
        (saved)="onSaved()"
        (closed)="editing.set(false)"
      />
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-4);
      border: 1px solid var(--line);
      border-left: 6px solid var(--type-color);
      border-radius: var(--radius-m);
      background: var(--surface);
    }
    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
    }
    .title {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--space-1) var(--space-3);
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 600;
    }
    .title a {
      color: var(--ink);
    }
    .title .muted {
      font-family: var(--font-body);
      font-size: 0.9375rem;
      font-weight: 400;
    }
    .kind {
      flex: none;
      padding: 0.1rem 0.7rem;
      border-radius: 999px;
      border: 1px solid var(--gold);
      font-size: 0.8125rem;
    }
    .kind[data-kind='Drunk'] {
      background: color-mix(in srgb, var(--burgundy) 16%, var(--surface));
    }
    .kind[data-kind='Sold'] {
      background: color-mix(in srgb, var(--gold) 22%, var(--surface));
    }
    .kind[data-kind='Gifted'] {
      background: color-mix(in srgb, var(--state-ready) 18%, var(--surface));
    }
    .facts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-4);
      margin: 0;
      color: var(--ink-soft);
    }
    blockquote {
      margin: 0;
      padding-left: var(--space-3);
      border-left: 2px solid var(--gold);
      font-family: var(--font-display);
      font-style: italic;
      line-height: 1.6;
    }
    .buttons {
      margin-top: var(--space-2);
    }
  `,
})
export class ArchiveEntryItem {
  readonly entry = input.required<ArchiveEntry>();
  readonly showWine = input(true);
  readonly changed = output<void>();

  private readonly api = inject(ApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly editing = signal(false);
  protected readonly busy = signal(false);

  protected title(): string {
    return wineTitle({ name: this.entry().wineName, vintage: this.entry().vintage });
  }
  protected typeLabel(): string {
    return wineTypeLabel(this.entry().wineType);
  }
  protected kind(): string {
    return kindLabel(this.entry().kind);
  }
  protected who(): string {
    return counterpartyLabel(this.entry().kind);
  }
  protected date(): string {
    return formatDate(this.entry().date);
  }
  protected price(): string {
    return formatPrice(this.entry().price);
  }

  protected onSaved(): void {
    this.editing.set(false);
    this.changed.emit();
  }

  protected async undo(): Promise<void> {
    const entry = this.entry();
    const confirmed = await this.confirm.ask({
      title: 'Eintrag rückgängig machen?',
      message: `${entry.quantity} ${entry.quantity === 1 ? 'Flasche kommt' : 'Flaschen kommen'} zurück in deinen Keller, der Archiveintrag wird gelöscht.`,
      confirmLabel: 'Rückgängig machen',
    });
    if (!confirmed) return;
    this.busy.set(true);
    try {
      await this.api.undoArchiveEntry(entry.id);
      this.toast.info('Die Flaschen sind zurück im Keller.');
      this.changed.emit();
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
