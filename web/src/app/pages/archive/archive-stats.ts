import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FilterExpr } from '../../core/filter-expr';
import { ArchiveEntry } from '../../core/models';
import { StatList, StatTiles } from '../../shared/stat-blocks';
import { archiveStats } from './archive.stats';

/** Statistik des Archivs: Kennzahlen und Aufteilungen der (gefilterten) Einträge. */
@Component({
  selector: 'app-archive-stats',
  imports: [StatTiles, StatList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .stats {
      display: grid;
      gap: var(--space-5);
    }
    .lists {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
      align-items: start;
      gap: var(--space-5);
    }
  `,
  template: `
    <div class="stats">
      <app-stat-tiles [tiles]="stats().tiles" />
      <div class="lists">
        <app-stat-list title="Nach Jahr" [rows]="stats().byYear" (open)="drill.emit($event)" />
        <app-stat-list title="Nach Abgangsart" [rows]="stats().byKind" (open)="drill.emit($event)" />
        <app-stat-list title="Nach Weinart" [rows]="stats().byType" (open)="drill.emit($event)" />
        <app-stat-list title="Nach Bewertung" [rows]="stats().byRating" (open)="drill.emit($event)" />
      </div>
    </div>
  `,
})
export class ArchiveStats {
  readonly entries = input.required<readonly ArchiveEntry[]>();
  readonly drill = output<FilterExpr | null>();

  protected readonly stats = computed(() => archiveStats(this.entries()));
}
