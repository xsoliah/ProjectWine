import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ConfirmService } from '../../core/confirm.service';
import { errorMessage } from '../../core/errors';
import { BOTTLE_FORM_OPTIONS, WINE_TYPES } from '../../core/labels';
import { BottleForm, Country, GrapeEntry, GrapeVariety, SaveWineRequest, WineFormInitial, WineType } from '../../core/models';
import { findCountry, findRegion } from '../../core/origins';
import { ToastService } from '../../core/toast.service';
import { GrapePicker } from '../../shared/grape-picker';
import { SourceMark } from '../../shared/source-mark';
import { DrinkingCurveChart } from '../../shared/drinking-curve-chart';
import { Curve } from '../../core/drinking-curve.logic';
import { FieldMarks } from '../../core/capture';
import { sumPercent, toRequests, unknownNames } from '../../shared/grape-picker.logic';

const blankToNull = (value: string | null): string | null => value?.trim() || null;

@Component({
  selector: 'app-wine-form',
  imports: [ReactiveFormsModule, GrapePicker, SourceMark, DrinkingCurveChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wine-form.html',
})
export class WineForm implements OnInit {
  readonly initial = input<WineFormInitial>({});
  readonly submitLabel = input('Speichern');
  readonly minQuantity = input(1);
  readonly busy = input(false);
  /** Photo capture: which values came from the label and which from the web. */
  readonly marks = input<FieldMarks>({});
  readonly saved = output<SaveWineRequest>();
  readonly cancelled = output<void>();

  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly types = WINE_TYPES;
  protected readonly bottleForms = BOTTLE_FORM_OPTIONS;
  protected readonly form = inject(NonNullableFormBuilder).group({
    barcode: '',
    name: ['', Validators.required],
    producer: '',
    vintage: new FormControl<number | null>(null, [Validators.min(1500), Validators.max(2200)]),
    type: 'Red' as WineType,
    country: '',
    region: '',
    bottleSizeMl: [750, [Validators.required, Validators.min(1)]],
    bottleForm: new FormControl<BottleForm | null>(null),
    quantity: [1, [Validators.required, Validators.min(1)]],
    drinkFrom: new FormControl<number | null>(null),
    drinkUntil: new FormControl<number | null>(null),
    drinkPeak: new FormControl<number | null>(null, [Validators.min(1800), Validators.max(2300)]),
    drinkSpread: new FormControl<number | null>(null, [Validators.min(0.1), Validators.max(50)]),
    purchasePrice: new FormControl<number | null>(null, Validators.min(0)),
    notes: '',
  });

  /** The user's countries with their regions (origin master data). */
  protected readonly countries = signal<Country[]>([]);
  protected readonly creatingOrigin = signal(false);

  /** The user's grape varieties and the wine's grapes (by name, in order). */
  protected readonly varieties = signal<GrapeVariety[]>([]);
  protected readonly grapes = signal<GrapeEntry[]>([]);
  protected readonly saving = signal(false);

  private readonly peakValue = toSignal(this.form.controls.drinkPeak.valueChanges, { initialValue: null as number | null });
  private readonly spreadValue = toSignal(this.form.controls.drinkSpread.valueChanges, { initialValue: null as number | null });
  protected readonly year = new Date().getFullYear();

  /** Preview of the entered curve (only when both values are valid). */
  protected readonly previewCurve = computed<Curve | null>(() => {
    const peak = this.peakValue() ?? this.form.controls.drinkPeak.value;
    const spread = this.spreadValue() ?? this.form.controls.drinkSpread.value;
    return peak != null && spread != null && spread > 0 && peak >= 1800
      ? { peak, spread, derived: false }
      : null;
  });

  private readonly countryText =toSignal(this.form.controls.country.valueChanges, { initialValue: '' });
  private readonly regionText = toSignal(this.form.controls.region.valueChanges, { initialValue: '' });

  protected readonly selectedCountry = computed(() => findCountry(this.countries(), this.countryText()));
  protected readonly selectedRegion = computed(() => findRegion(this.selectedCountry(), this.regionText()));
  /** Typed country name that does not exist yet (offered for creation). */
  protected readonly newCountryName = computed(() =>
    this.countryText().trim() && !this.selectedCountry() ? this.countryText().trim() : null,
  );
  protected readonly newRegionName = computed(() =>
    this.selectedCountry() && this.regionText().trim() && !this.selectedRegion()
      ? this.regionText().trim()
      : null,
  );
  protected readonly regionOptions = computed(() => this.selectedCountry()?.regions ?? []);

  /** Set on submit when a typed country/region has not been created yet. */
  protected readonly originError = signal<string | null>(null);

  private lastCountryId: string | null = null;

  ngOnInit(): void {
    const { barcode, producer, region, country, grapes, notes, ...rest } =
      this.initial();
    this.grapes.set(grapes ?? []);
    this.form.patchValue({
      ...rest,
      barcode: barcode ?? '',
      producer: producer ?? '',
      country: country ?? '',
      region: region ?? '',
      notes: notes ?? '',
    });
    this.form.controls.quantity.setValidators([
      Validators.required,
      Validators.min(this.minQuantity()),
    ]);
    this.form.controls.quantity.updateValueAndValidity();
    void this.loadOrigins();
    void this.loadGrapes();
  }

  /** A region only belongs to one country: switching to another country clears it. */
  protected onCountryInput(): void {
    this.originError.set(null);
    const id = this.selectedCountry()?.id ?? null;
    if (id !== this.lastCountryId && this.lastCountryId !== null) {
      this.form.controls.region.setValue('');
    }
    this.lastCountryId = id;
  }

  protected async createCountry(): Promise<void> {
    const name = this.newCountryName();
    if (!name) return;
    await this.createOrigin(async () => {
      const created = await this.api.createCountry(name);
      this.form.controls.country.setValue(created.name);
    });
    this.lastCountryId = this.selectedCountry()?.id ?? null;
  }

  protected async createRegion(): Promise<void> {
    const country = this.selectedCountry();
    const name = this.newRegionName();
    if (!country || !name) return;
    await this.createOrigin(async () => {
      const created = await this.api.createRegion(country.id, name);
      this.form.controls.region.setValue(created.name);
    });
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  protected async loadGrapes(): Promise<void> {
    try {
      this.varieties.set(await this.api.listGrapes());
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const curve = this.form.getRawValue();
    if ((curve.drinkPeak === null) !== (curve.drinkSpread === null)) {
      this.originError.set('Trinkzeitpunkt und Streuung müssen gemeinsam angegeben werden.');
      return;
    }
    if (this.newCountryName()) {
      this.originError.set(`Das Land „${this.newCountryName()}“ gibt es noch nicht – bitte anlegen oder auswählen.`);
      return;
    }
    if (this.regionText().trim() && !this.selectedCountry()) {
      this.originError.set('Eine Region kann nur zusammen mit einem Land angegeben werden.');
      return;
    }
    if (this.newRegionName()) {
      this.originError.set(`Die Region „${this.newRegionName()}“ gibt es noch nicht – bitte anlegen oder auswählen.`);
      return;
    }
    if (sumPercent(this.grapes()) > 100) {
      this.originError.set('Die Anteile der Rebsorten dürfen zusammen höchstens 100 % ergeben.');
      return;
    }
    this.originError.set(null);

    // Grapes suggested from outside (barcode) may not exist yet: create them only after confirmation.
    const missing = unknownNames(this.grapes(), this.varieties());
    if (missing.length > 0) {
      const ok = await this.confirm.ask({
        title: 'Neue Rebsorten anlegen?',
        message: `Diese Rebsorten gibt es noch nicht in deiner Liste: ${missing.join(', ')}. Sollen sie angelegt werden?`,
        confirmLabel: 'Anlegen und speichern',
      });
      if (!ok) return;
      this.saving.set(true);
      try {
        for (const name of missing) await this.api.createGrape(name);
        await this.loadGrapes();
      } catch (error) {
        this.toast.error(errorMessage(error));
        return;
      } finally {
        this.saving.set(false);
      }
    }

    const v = this.form.getRawValue();
    this.saved.emit({
      barcode: blankToNull(v.barcode),
      name: v.name.trim(),
      producer: blankToNull(v.producer),
      vintage: v.vintage,
      type: v.type,
      countryId: this.selectedCountry()?.id ?? null,
      regionId: this.selectedRegion()?.id ?? null,
      grapes: toRequests(this.grapes(), this.varieties()),
      bottleSizeMl: v.bottleSizeMl,
      bottleForm: v.bottleForm,
      quantity: v.quantity,
      drinkFrom: v.drinkFrom,
      drinkUntil: v.drinkUntil,
      drinkPeak: v.drinkPeak,
      drinkSpread: v.drinkSpread,
      purchasePrice: v.purchasePrice,
      notes: blankToNull(v.notes),
    });
  }

  private async loadOrigins(): Promise<void> {
    try {
      this.countries.set(await this.api.listOrigins());
      this.lastCountryId = this.selectedCountry()?.id ?? null;
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  private async createOrigin(create: () => Promise<void>): Promise<void> {
    this.creatingOrigin.set(true);
    try {
      // Reload first so the new entry is in the list before the text field points to it.
      await create().then(() => this.loadOrigins());
      this.originError.set(null);
    } catch (error) {
      this.toast.error(errorMessage(error));
    } finally {
      this.creatingOrigin.set(false);
    }
  }
}
