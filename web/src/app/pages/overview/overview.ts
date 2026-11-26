import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { errorMessage } from '../../core/errors';
import { formatPrice } from '../../core/format';
import { OriginRef, Statistics, StatisticsGrouping } from '../../core/models';
import { DonutChart, DonutSlice } from '../../shared/donut-chart';
import { Icon } from '../../shared/icon';
import { toLegend } from './overview.logic';

const GROUPING_KEY = 'overview.groupBy';

const GROUPINGS: readonly { value: StatisticsGrouping; label: string }[] = [
  { value: 'Type', label: 'Weintyp' },
  { value: 'Country', label: 'Land' },
  { value: 'Region', label: 'Region' },
  { value: 'Producer', label: 'Winzer' },
  { value: 'Grape', label: 'Rebsorte' },
];

function storedGrouping(): StatisticsGrouping {
  try {
    const value = localStorage.getItem(GROUPING_KEY);
    return GROUPINGS.some((g) => g.value === value) ? (value as StatisticsGrouping) : 'Type';
  } catch {
    return 'Type';
  }
}

@Component({
  selector: 'app-overview',
  imports: [RouterLink, DonutChart, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview {
  private readonly api = inject(ApiService);

  protected readonly groupings = GROUPINGS;
  protected readonly grouping = signal<StatisticsGrouping>(storedGrouping());
  /** Country whose regions are shown (drill-down from the country grouping). */
  protected readonly drillCountry = signal<OriginRef | null>(null);
  /** Cuvée compositions are shown (drill-down from the grape grouping). */
  protected readonly drillCuvee = signal(false);

  protected readonly stats = signal<Statistics | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly active = signal<string | null>(null);

  protected readonly legend = computed(() => {
    const stats = this.stats();
    return stats ? toLegend(stats) : [];
  });
  protected readonly slices = computed<DonutSlice[]>(() =>
    this.legend().map((l) => ({ key: l.key, label: l.label, value: l.bottles, percent: l.percent, color: l.color })),
  );
  protected readonly chartTotal = computed(() => this.legend().reduce((sum, l) => sum + l.bottles, 0));
  /** Countries (except "Ohne Angabe"/"Sonstige") and the "Cuvée" segment can be opened. */
  protected readonly canDrill = computed(
    () => (this.grouping() === 'Country' || this.grouping() === 'Grape') && !this.isDrilled(),
  );
  protected readonly isDrilled = computed(() => !!this.drillCountry() || this.drillCuvee());
  protected readonly totalValue = computed(() => formatPrice(this.stats()?.totals.totalValue ?? 0));

  constructor() {
    void this.load();
  }

  protected setGrouping(value: StatisticsGrouping): void {
    if (value === this.grouping() && !this.isDrilled()) return;
    this.grouping.set(value);
    this.drillCountry.set(null);
    this.drillCuvee.set(false);
    try {
      localStorage.setItem(GROUPING_KEY, value);
    } catch {
      // Remembering the choice is a convenience only.
    }
    void this.load();
  }

  protected isDrillable(key: string): boolean {
    if (!this.canDrill()) return false;
    return this.grouping() === 'Grape' ? key === 'cuvee' : key !== 'none' && key !== 'other';
  }

  protected drill(key: string): void {
    if (!this.isDrillable(key)) return;
    const item = this.legend().find((l) => l.key === key);
    if (!item) return;
    if (this.grouping() === 'Grape') this.drillCuvee.set(true);
    else this.drillCountry.set({ id: key, name: item.label });
    this.active.set(null);
    void this.load();
  }

  protected back(): void {
    this.drillCountry.set(null);
    this.drillCuvee.set(false);
    this.active.set(null);
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(this.stats() === null);
    try {
      const country = this.drillCountry();
      this.stats.set(
        country
          ? await this.api.getStatistics('Region', country.id)
          : this.drillCuvee()
            ? await this.api.getStatistics('Grape', null, true)
            : await this.api.getStatistics(this.grouping()),
      );
      this.error.set(null);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
