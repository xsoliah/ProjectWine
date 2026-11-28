import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FilterExpr } from '../../core/filter-expr';
import { formatNumber } from '../../core/list-model';
import { Wine } from '../../core/models';
import { StatList, StatTiles } from '../../shared/stat-blocks';
import { RackCard, cellarStats } from './cellar.stats';

/** Statistik des Kellers: Kennzahlen, Inhalt der Regale und Aufteilungen der (gefilterten) Weine. */
@Component({
  selector: 'app-cellar-stats',
  imports: [StatTiles, StatList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './cellar-stats.css',
  template: `
    <div class="stats">
      <app-stat-tiles [tiles]="stats().tiles" />

      @if (stats().racks.length > 0) {
        <section aria-labelledby="stat-racks">
          <h2 id="stat-racks">Regale</h2>
          <ul class="racks">
            @for (card of stats().racks; track card.key) {
              <li>
                <button type="button" class="rack" [attr.aria-label]="cardLabel(card)" (click)="drill.emit(card.filter)">
                  <span class="rack-head">
                    <span class="rack-name">{{ card.name }}</span>
                    <span class="rack-bottles">{{ bottles(card.bottles) }} Fl.</span>
                  </span>
                  <span class="rack-value">{{ money(card) }}</span>
                  <span class="rack-line">
                    @for (t of card.types; track t.label) {
                      <span class="pill">{{ t.label }} {{ t.bottles }}</span>
                    }
                  </span>
                  <span class="rack-line soft">
                    @for (r of card.regions; track r.label) {
                      <span>{{ r.label }} {{ r.bottles }}</span>
                    }
                    @if (card.regionsMore > 0) {
                      <span>+ {{ card.regionsMore }} weitere</span>
                    }
                  </span>
                </button>
              </li>
            }
          </ul>
        </section>
      }

      <div class="lists">
        <app-stat-list title="Nach Weinart" [rows]="stats().byType" [showValue]="true" (open)="drill.emit($event)" />
        <app-stat-list title="Nach Land und Region" [rows]="stats().byCountry" [showValue]="true" (open)="drill.emit($event)" />
        <app-stat-list title="Nach Trinkfenster" [rows]="stats().byWindow" [showValue]="true" (open)="drill.emit($event)" />
      </div>
    </div>
  `,
})
export class CellarStats {
  readonly wines = input.required<readonly Wine[]>();
  readonly year = input.required<number>();
  /** Bedingung der angetippten Karte oder Zeile. */
  readonly drill = output<FilterExpr | null>();

  protected readonly stats = computed(() => cellarStats(this.wines(), this.year()));

  protected bottles(n: number): string {
    return formatNumber('integer', n);
  }

  protected money(card: RackCard): string {
    return card.value === null ? 'Wert unbekannt' : formatNumber('currency', card.value);
  }

  protected cardLabel(card: RackCard): string {
    return `${card.name}: ${card.bottles} Flaschen, ${this.money(card)}. In der Tabelle anzeigen`;
  }
}
