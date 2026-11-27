import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, resource, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { drinkWindow } from '../../core/drink-window';
import { errorMessage } from '../../core/errors';
import { bottleFormLabel } from '../../core/labels';
import { formatPrice, wineTitle } from '../../core/format';
import { LabelPoint, RackSummary, SetBottleShapeRequest, SlotLocation } from '../../core/models';
import { hasWebGl } from '../../core/webgl';
import { resolveView, viewOptions, WineView } from '../../core/wine-views';
import { Bottle3d } from '../../shared/bottle-3d';
import { BottleShapeEditor } from '../../shared/bottle-shape-editor';
import { slotLabel } from '../../core/racks';
import { ToastService } from '../../core/toast.service';
import { ArchiveEntryItem } from '../../shared/archive-entry-item';
import { ConsumeDialog } from '../../shared/consume-dialog';
import { LabelCornerEditor } from '../../shared/label-corner-editor';
import { AuthImage, ImageCache } from '../../core/images';
import { preparePhoto } from '../../core/photo';
import { Icon } from '../../shared/icon';
import { Modal } from '../../shared/modal';
import { PlacementStep } from '../../shared/placement-step';
import { Stepper } from '../../shared/stepper';
import { TypeBadge } from '../../shared/type-badge';

@Component({
  selector: 'app-wine-detail',
  imports: [RouterLink, Icon, Modal, PlacementStep, Stepper, TypeBadge, ArchiveEntryItem, ConsumeDialog, AuthImage, LabelCornerEditor, Bottle3d, BottleShapeEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wine-detail.html',
  styleUrl: './wine-detail.css',
})
export class WineDetail {
  readonly id = input.required<string>();

  private readonly api = inject(ApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly wineResource = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getWine(params),
  });
  protected readonly entriesResource = resource({
    params: () => this.id(),
    loader: async ({ params }) =>
      (await this.api.listArchive(null)).filter((entry) => entry.wineId === params),
  });

  protected readonly wine = computed(() => (this.wineResource.hasValue() ? this.wineResource.value() : null));
  protected readonly entries = computed(() =>
    this.entriesResource.hasValue() ? this.entriesResource.value() : [],
  );
  protected readonly error = computed(() => {
    const error = this.wineResource.error();
    return error ? errorMessage(error) : null;
  });
  protected readonly title = computed(() => {
    const wine = this.wine();
    return wine ? wineTitle(wine) : '';
  });
  protected readonly hint = computed(() => {
    const wine = this.wine();
    return wine ? drinkWindow(wine, new Date().getFullYear()) : null;
  });
  protected readonly price = computed(() => formatPrice(this.wine()?.purchasePrice ?? null));

  protected readonly bottles = signal(1);
  protected readonly consuming = signal(false);
  protected readonly busy = signal(false);
  private readonly images = inject(ImageCache);

  /** Corner editor for the label image: a new photo (blob) or the stored original (adjust the cut). */
  protected readonly labelEditor = signal<{ url: string; corners: LabelPoint[] | null; photo: Blob | null } | null>(null);
  protected readonly labelBusy = signal(false);

  // ----- Bottle: flat label, cut-out bottle or 3D view -----

  /** Which picture the label panel shows: the 3D view by default, reset for every wine. */
  protected readonly view = linkedSignal<string, WineView>({ source: this.id, computation: () => '3d' });
  /** Cleared when the browser has no WebGL or drops the context: the flat label is shown with a notice. */
  private readonly webglFailed = signal(!hasWebGl());
  protected readonly webglOk = computed(() => !this.webglFailed());
  protected readonly show3d = computed(() => this.shown() === '3d');
  protected readonly formLabel = bottleFormLabel;
  /** Views on offer for this wine; the switch appears only when there is more than the front. */
  protected readonly viewOptions = computed(() => {
    const wine = this.wine();
    return wine ? viewOptions(wine, this.webglOk()) : [];
  });
  /** The view the user chose, or the front if it is gone (e.g. the back image was just removed). */
  protected readonly shown = computed(() => resolveView(this.view(), this.viewOptions()));
  protected readonly backBusy = signal(false);
  protected readonly bottleEditor = signal<{ url: string } | null>(null);
  protected readonly bottleBusy = signal(false);

  protected onWebglUnavailable(): void {
    this.webglFailed.set(true);
  }

  protected async openBottleEditor(): Promise<void> {
    const sourceId = this.wine()?.labelSourceImageId;
    if (!sourceId) return;
    try {
      this.bottleEditor.set({ url: await this.images.url(sourceId) });
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  /** Outline and label placement: the server cuts the bottle again (no research, no quota). */
  protected async saveBottle(request: SetBottleShapeRequest): Promise<void> {
    this.bottleBusy.set(true);
    try {
      this.wineResource.set(await this.api.setBottleShape(this.id(), request));
      this.bottleEditor.set(null);
      this.toast.info('Flasche gespeichert.');
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.bottleBusy.set(false);
    }
  }

  /** One research on the original photo; counts towards the daily limit, so it is confirmed first. */
  protected async detectBottle(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Flasche erkennen?',
      message: 'Die Flasche wird auf dem Originalfoto erkannt. Das zählt als eine Recherche deines Tageslimits und kann eine Weile dauern.',
      confirmLabel: 'Erkennen',
    });
    if (!ok) return;
    this.bottleBusy.set(true);
    try {
      this.wineResource.set(await this.api.detectBottle(this.id()));
      this.toast.info('Flasche erkannt.');
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.bottleBusy.set(false);
    }
  }

  protected async pickLabel(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const photo = await preparePhoto(file);
      this.labelEditor.set({ url: URL.createObjectURL(photo), corners: null, photo });
    } catch {
      this.toast.error('Das Foto konnte nicht gelesen werden. Bitte ein anderes Foto wählen.');
    }
  }

  protected async adjustLabel(): Promise<void> {
    const wine = this.wine();
    if (!wine?.labelSourceImageId) return;
    try {
      const url = await this.images.url(wine.labelSourceImageId);
      this.labelEditor.set({ url, corners: wine.labelCorners ?? null, photo: null });
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  protected closeLabelEditor(): void {
    const editor = this.labelEditor();
    if (editor?.photo) URL.revokeObjectURL(editor.url);
    this.labelEditor.set(null);
  }

  /** The server cuts the label out of the photo with the confirmed corners (no research, no quota). */
  protected async saveLabel(corners: LabelPoint[]): Promise<void> {
    const editor = this.labelEditor();
    if (!editor) return;
    this.labelBusy.set(true);
    try {
      const updated = editor.photo
        ? await this.api.setLabelImage(this.id(), editor.photo, corners)
        : await this.api.setLabelCorners(this.id(), corners);
      this.wineResource.set(updated);
      this.closeLabelEditor();
      this.toast.info('Etikettenbild gespeichert.');
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.labelBusy.set(false);
    }
  }

  protected async removeLabel(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Etikettenbild entfernen?',
      message: 'Das Etikettenbild und das zugehörige Originalfoto werden gelöscht.',
      confirmLabel: 'Entfernen',
      danger: true,
    });
    if (!ok) return;
    this.labelBusy.set(true);
    try {
      this.wineResource.set(await this.api.removeLabelImage(this.id()));
      this.toast.info('Etikettenbild entfernt.');
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.labelBusy.set(false);
    }
  }

  // ----- Back label: cut out with four corners like the front label, set, adjusted or removed independently -----

  /** Corner editor for the back label: a new photo (blob) or the stored original / unedited back photo. */
  protected readonly backEditor = signal<{ url: string; corners: LabelPoint[] | null; photo: Blob | null } | null>(null);

  protected async pickBack(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const photo = await preparePhoto(file);
      this.backEditor.set({ url: URL.createObjectURL(photo), corners: null, photo });
    } catch {
      this.toast.error('Das Foto konnte nicht gelesen werden. Bitte ein anderes Foto wählen.');
    }
  }

  /** Opens the editor on the original photo; an older wine without one uses its unedited back photo. */
  protected async adjustBack(): Promise<void> {
    const wine = this.wine();
    const sourceId = wine?.backSourceImageId ?? wine?.backImageId;
    if (!wine || !sourceId) return;
    try {
      const url = await this.images.url(sourceId);
      this.backEditor.set({ url, corners: wine.backCorners ?? null, photo: null });
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  protected closeBackEditor(): void {
    const editor = this.backEditor();
    if (editor?.photo) URL.revokeObjectURL(editor.url);
    this.backEditor.set(null);
  }

  /** The server cuts the back label out of the photo with the confirmed corners (no research, no quota). */
  protected async saveBack(corners: LabelPoint[]): Promise<void> {
    const editor = this.backEditor();
    if (!editor) return;
    this.backBusy.set(true);
    try {
      const updated = editor.photo
        ? await this.api.setBackImage(this.id(), editor.photo, corners)
        : await this.api.setBackCorners(this.id(), corners);
      this.wineResource.set(updated);
      this.closeBackEditor();
      this.view.set('back');
      this.toast.info('Rückseite gespeichert.');
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.backBusy.set(false);
    }
  }

  protected async removeBack(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Rückseite entfernen?',
      message: 'Das Rückseitenbild und das zugehörige Originalfoto werden gelöscht.',
      confirmLabel: 'Entfernen',
      danger: true,
    });
    if (!ok) return;
    this.backBusy.set(true);
    try {
      this.wineResource.set(await this.api.removeBackImage(this.id()));
      this.toast.info('Rückseite entfernt.');
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.backBusy.set(false);
    }
  }

  protected readonly choosingRack = signal(false);
  protected readonly racks = signal<RackSummary[]>([]);

  protected slotText(slot: SlotLocation): string {
    return slotLabel(slot);
  }

  /** Choose a rack, then a free slot there (rack page in placing mode). */
  protected async startPlacing(): Promise<void> {
    try {
      this.racks.set(await this.api.listRacks());
      this.choosingRack.set(true);
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  /** "Einlagerung vorschlagen": the placing step for all not placed bottles. */
  protected readonly suggesting = signal(false);

  protected suggestionClosed(): void {
    this.suggesting.set(false);
    this.wineResource.reload();
  }

  protected suggestionManual(rackId: string | null): void {
    this.suggesting.set(false);
    if (rackId) void this.router.navigate(['/racks', rackId], { queryParams: { place: this.id() } });
    else void this.startPlacing();
  }

  protected placeIn(rackId: string): void {
    this.choosingRack.set(false);
    void this.router.navigate(['/racks', rackId], { queryParams: { place: this.id() } });
  }

  protected async addBottles(): Promise<void> {
    this.busy.set(true);
    try {
      this.wineResource.set(await this.api.addBottles(this.id(), this.bottles()));
      this.toast.info('Flaschen hinzugefügt.');
      this.bottles.set(1);
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected onConsumed(): void {
    this.consuming.set(false);
    this.wineResource.reload();
    this.entriesResource.reload();
  }

  protected onEntryChanged(): void {
    this.wineResource.reload();
    this.entriesResource.reload();
  }

  protected async remove(): Promise<void> {
    const wine = this.wine();
    if (!wine) return;
    const confirmed = await this.confirm.ask({
      title: 'Wein löschen?',
      message: `„${wine.name}“ wird samt allen zugehörigen Archiveinträgen unwiderruflich gelöscht.`,
      confirmLabel: 'Löschen',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await this.api.deleteWine(wine.id);
      this.toast.info('Wein gelöscht.');
      await this.router.navigateByUrl('/cellar');
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }
}
