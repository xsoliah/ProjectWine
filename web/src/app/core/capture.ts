import { CaptureDetail, CaptureStatus, FieldSource, WineFormInitial } from './models';

export const CAPTURE_CONSENT_KEY = 'captureConsentV1';

export const STATUS_LABELS: Record<CaptureStatus, string> = {
  Pending: 'wartet',
  Researching: 'wird recherchiert',
  Ready: 'fertig',
  Failed: 'fehlgeschlagen',
};

export const isRunning = (status: CaptureStatus) => status === 'Pending' || status === 'Researching';

/** Form fields that can carry an "Etikett"/"Web" marker. */
export type MarkedField =
  | 'name'
  | 'producer'
  | 'vintage'
  | 'type'
  | 'country'
  | 'region'
  | 'bottleSizeMl'
  | 'drinkFrom'
  | 'drinkUntil'
  | 'drinkPeak'
  | 'drinkSpread'
  | 'barcode'
  | 'notes'
  | 'grapes';

export type FieldMarks = Partial<Record<MarkedField, FieldSource>>;

/** Prefill for the wine form from a finished draft: values by name (origin and grapes are matched by the form). */
export function captureToInitial(d: CaptureDetail): WineFormInitial {
  const initial: WineFormInitial = { quantity: d.summary.bottleCount };
  if (d.name) initial.name = d.name.value;
  if (d.producer) initial.producer = d.producer.value;
  if (d.vintage) initial.vintage = d.vintage.value;
  if (d.type) initial.type = d.type.value;
  if (d.country) initial.country = d.country.value;
  if (d.region) initial.region = d.region.value;
  if (d.bottleSizeMl) initial.bottleSizeMl = d.bottleSizeMl.value;
  if (d.drinkFrom) initial.drinkFrom = d.drinkFrom.value;
  if (d.drinkUntil) initial.drinkUntil = d.drinkUntil.value;
  if (d.drinkPeak && d.drinkSpread) {
    initial.drinkPeak = d.drinkPeak.value;
    initial.drinkSpread = d.drinkSpread.value;
  }
  if (d.barcode) initial.barcode = d.barcode.value;
  const notes = [d.notes?.value, d.userNote].filter((n): n is string => !!n);
  if (notes.length > 0) initial.notes = notes.join('\n');
  if (d.grapes.length > 0) initial.grapes = d.grapes.map((g) => ({ name: g.name, percent: g.percent }));
  return initial;
}

/** Which form fields came from the label and which from the web. */
export function captureMarks(d: CaptureDetail): FieldMarks {
  const marks: FieldMarks = {};
  const fields: [MarkedField, { source: FieldSource } | null][] = [
    ['name', d.name],
    ['producer', d.producer],
    ['vintage', d.vintage],
    ['type', d.type],
    ['country', d.country],
    ['region', d.region],
    ['bottleSizeMl', d.bottleSizeMl],
    ['drinkFrom', d.drinkFrom],
    ['drinkUntil', d.drinkUntil],
    ['drinkPeak', d.drinkPeak],
    ['drinkSpread', d.drinkSpread],
    ['barcode', d.barcode],
    ['notes', d.notes],
  ];
  for (const [field, value] of fields) if (value) marks[field] = value.source;
  if (d.grapes.length > 0) marks.grapes = d.grapes.some((g) => g.source === 'Web') ? 'Web' : 'Label';
  return marks;
}
