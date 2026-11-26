import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { errorMessage } from '../../core/errors';
import { Country, Region } from '../../core/models';
import { ToastService } from '../../core/toast.service';

type Kind = 'country' | 'region';

/** What is currently being edited inline: rename or merge of one country/region. */
interface Editing {
  kind: Kind;
  id: string;
  mode: 'rename' | 'merge';
}

@Component({
  selector: 'app-origins',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './origins.html',
  styleUrl: './origins.css',
})
export class Origins {
  private readonly api = inject(ApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly countries = signal<Country[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly newCountry = signal('');
  /** Text of the "add region" field per country id. */
  protected readonly newRegion = signal<Record<string, string>>({});

  protected readonly editing = signal<Editing | null>(null);
  protected readonly editText = signal('');
  protected readonly mergeTarget = signal('');

  constructor() {
    void this.load();
  }

  protected isEditing(kind: Kind, id: string, mode: Editing['mode']): boolean {
    const e = this.editing();
    return e?.kind === kind && e.id === id && e.mode === mode;
  }

  protected startRename(kind: Kind, item: { id: string; name: string }): void {
    this.editing.set({ kind, id: item.id, mode: 'rename' });
    this.editText.set(item.name);
  }

  protected startMerge(kind: Kind, id: string): void {
    this.editing.set({ kind, id, mode: 'merge' });
    this.mergeTarget.set('');
  }

  protected cancelEdit(): void {
    this.editing.set(null);
  }

  protected otherCountries(id: string): Country[] {
    return this.countries().filter((c) => c.id !== id);
  }

  protected otherRegions(country: Country, id: string): Region[] {
    return country.regions.filter((r) => r.id !== id);
  }

  protected setNewRegion(countryId: string, text: string): void {
    this.newRegion.update((all) => ({ ...all, [countryId]: text }));
  }

  protected async addCountry(): Promise<void> {
    const name = this.newCountry().trim();
    if (!name) return;
    await this.run(async () => {
      await this.api.createCountry(name);
      this.newCountry.set('');
    }, `„${name}“ angelegt.`);
  }

  protected async addRegion(country: Country): Promise<void> {
    const name = (this.newRegion()[country.id] ?? '').trim();
    if (!name) return;
    await this.run(async () => {
      await this.api.createRegion(country.id, name);
      this.setNewRegion(country.id, '');
    }, `„${name}“ angelegt.`);
  }

  protected async saveRename(): Promise<void> {
    const e = this.editing();
    const name = this.editText().trim();
    if (!e || !name) return;
    await this.run(
      () => (e.kind === 'country' ? this.api.renameCountry(e.id, name) : this.api.renameRegion(e.id, name)),
      'Umbenannt.',
    );
  }

  protected async saveMerge(sourceName: string): Promise<void> {
    const e = this.editing();
    const targetId = this.mergeTarget();
    if (!e || !targetId) return;
    const target =
      e.kind === 'country'
        ? this.countries().find((c) => c.id === targetId)?.name
        : this.countries().flatMap((c) => c.regions).find((r) => r.id === targetId)?.name;
    const confirmed = await this.confirm.ask({
      title: 'Zusammenführen?',
      message: `Alle Weine von „${sourceName}“ werden „${target}“ zugeordnet, danach wird „${sourceName}“ gelöscht.`,
      confirmLabel: 'Zusammenführen',
    });
    if (!confirmed) return;
    await this.run(
      () => (e.kind === 'country' ? this.api.mergeCountry(e.id, targetId) : this.api.mergeRegion(e.id, targetId)),
      `„${sourceName}“ mit „${target}“ zusammengeführt.`,
    );
  }

  protected async remove(kind: Kind, item: { id: string; name: string }): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: kind === 'country' ? 'Land löschen?' : 'Region löschen?',
      message:
        kind === 'country'
          ? `„${item.name}“ wird mit allen seinen Regionen gelöscht.`
          : `„${item.name}“ wird gelöscht.`,
      confirmLabel: 'Löschen',
      danger: true,
    });
    if (!confirmed) return;
    await this.run(
      () => (kind === 'country' ? this.api.deleteCountry(item.id) : this.api.deleteRegion(item.id)),
      `„${item.name}“ gelöscht.`,
    );
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
      this.countries.set(await this.api.listOrigins());
      this.error.set(null);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
