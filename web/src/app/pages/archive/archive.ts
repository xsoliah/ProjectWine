import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/errors';
import { CONSUMPTION_KINDS } from '../../core/labels';
import { ConsumptionKind } from '../../core/models';
import { ArchiveEntryItem } from '../../shared/archive-entry-item';

@Component({
  selector: 'app-archive',
  imports: [ArchiveEntryItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page stack">
      <div class="page-head"><h1>Archiv</h1></div>

      <div class="chips" role="group" aria-label="Nach Art filtern">
        <button type="button" class="chip" [attr.aria-pressed]="kind() === null" (click)="kind.set(null)">Alle</button>
        @for (k of kinds; track k.value) {
          <button type="button" class="chip" [attr.aria-pressed]="kind() === k.value" (click)="kind.set(k.value)">
            {{ k.label }}
          </button>
        }
      </div>

      @if (error(); as text) {
        <div class="banner error" role="alert">
          {{ text }} <button type="button" class="btn-link" (click)="list.reload()">Erneut laden</button>
        </div>
      }

      @if (loading()) {
        <p class="muted" role="status">Archiv wird geladen …</p>
      } @else if (entries().length === 0 && !error()) {
        <div class="empty">
          <h2>Noch nichts im Archiv</h2>
          <p>Getrunkene, verkaufte und verschenkte Weine erscheinen hier.</p>
        </div>
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

  protected readonly kinds = CONSUMPTION_KINDS;
  protected readonly kind = signal<ConsumptionKind | null>(null);

  protected readonly list = resource({
    params: () => ({ kind: this.kind() }),
    loader: ({ params }) => this.api.listArchive(params.kind),
  });

  protected readonly entries = computed(() => (this.list.hasValue() ? this.list.value() : []));
  protected readonly loading = computed(() => this.list.isLoading() && !this.list.hasValue());
  protected readonly error = computed(() => {
    const error = this.list.error();
    return error ? errorMessage(error) : null;
  });
}
