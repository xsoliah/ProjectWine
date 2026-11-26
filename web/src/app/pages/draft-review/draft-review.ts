import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { STATUS_LABELS, captureMarks, captureToInitial } from '../../core/capture';
import { CaptureCountsService } from '../../core/capture-counts.service';
import { errorMessage } from '../../core/errors';
import { AuthImage, ImageCache } from '../../core/images';
import { CaptureDetail, LabelPoint, SaveWineRequest, SetBottleShapeRequest } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { hasWebGl } from '../../core/webgl';
import { Bottle3d } from '../../shared/bottle-3d';
import { BottleShapeEditor } from '../../shared/bottle-shape-editor';
import { Icon } from '../../shared/icon';
import { LabelCornerEditor } from '../../shared/label-corner-editor';
import { Stepper } from '../../shared/stepper';
import { TypeBadge } from '../../shared/type-badge';
import { WineForm } from '../wine-form/wine-form';

const NO_CORNERS_HINT = 'Zuschnitt prüfen: Die Ecken des Etiketts wurden nicht sicher erkannt. Bitte die vier Punkte auf die Ecken des Etiketts setzen.';

/**
 * Review of a finished draft: the cut-out label (with "Zuschnitt anpassen"), the wine form prefilled with the
 * researched values marked "Etikett"/"Web", and the sources. Only saving creates the wine; cancelling keeps the draft.
 */
@Component({
  selector: 'app-draft-review',
  imports: [RouterLink, Icon, Stepper, TypeBadge, WineForm, AuthImage, LabelCornerEditor, Bottle3d, BottleShapeEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './draft-review.html',
  styleUrl: './draft-review.css',
})
export class DraftReview {
  readonly id = input.required<string>();

  private readonly api = inject(ApiService);
  private readonly images = inject(ImageCache);
  private readonly counts = inject(CaptureCountsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly detail = signal<CaptureDetail | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  /** The user chose "Trotzdem neu anlegen" although the wine seems to be in the cellar. */
  protected readonly createAnyway = signal(false);
  protected readonly bottles = signal(1);

  protected readonly editorOpen = signal(false);
  protected readonly editorHint = signal<string | null>(null);
  protected readonly frontUrl = signal<string | null>(null);
  private autoOpened = false;

  protected readonly initial = computed(() => {
    const d = this.detail();
    return d ? captureToInitial(d) : {};
  });
  protected readonly marks = computed(() => {
    const d = this.detail();
    return d ? captureMarks(d) : {};
  });
  protected readonly statusLabel = computed(() => {
    const d = this.detail();
    return d ? STATUS_LABELS[d.summary.status] : '';
  });

  constructor() {
    effect(() => void this.load(this.id()));
  }

  protected openEditor(hint: string | null = null): void {
    this.editorHint.set(hint);
    this.editorOpen.set(true);
  }

  protected async saveCorners(corners: LabelPoint[]): Promise<void> {
    this.busy.set(true);
    try {
      this.detail.set(await this.api.setCaptureCorners(this.id(), corners));
      this.editorOpen.set(false);
      this.toast.info('Zuschnitt übernommen.');
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected readonly bottleEditorOpen = signal(false);
  /** The 3D preview needs WebGL; without it the draft only shows the notice and the editor. */
  protected readonly webgl = signal(hasWebGl());

  /** Outline and label placement of the bottle: the server cuts the bottle again (no research, no quota). */
  protected async saveBottle(request: SetBottleShapeRequest): Promise<void> {
    this.busy.set(true);
    try {
      this.detail.set(await this.api.setCaptureBottleShape(this.id(), request));
      this.bottleEditorOpen.set(false);
      this.toast.info('Flasche übernommen.');
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  /** Creates the wine from the form, then takes over the draft (label image, draft removed). */
  protected async create(request: SaveWineRequest): Promise<void> {
    this.busy.set(true);
    try {
      const wine = await this.api.createWine(request);
      await this.api.acceptCapture(this.id(), { wineId: wine.id });
      void this.counts.refresh();
      this.toast.info('Wein zum Keller hinzugefügt.');
      await this.router.navigate(['/wines', wine.id]);
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async addToExisting(wineId: string): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.acceptCapture(this.id(), { addToWineId: wineId, count: this.bottles() });
      void this.counts.refresh();
      this.toast.info('Flaschen hinzugefügt.');
      await this.router.navigate(['/wines', wineId]);
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected back(): void {
    void this.router.navigateByUrl('/drafts');
  }

  private async load(id: string): Promise<void> {
    try {
      const d = await this.api.getCapture(id);
      this.detail.set(d);
      this.bottles.set(d.summary.bottleCount);
      this.frontUrl.set(await this.images.url(d.summary.frontImageId));
      // Without detected corners the editor opens by itself (once).
      if (d.summary.status === 'Ready' && !d.labelCornersDetected && !d.existingWine && !this.autoOpened) {
        this.autoOpened = true;
        this.openEditor(NO_CORNERS_HINT);
      }
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}
