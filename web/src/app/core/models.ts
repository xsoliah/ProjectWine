export type WineType = 'Red' | 'White' | 'Rose' | 'Sparkling' | 'Dessert' | 'Fortified' | 'Other';
export type ConsumptionKind = 'Drunk' | 'Sold' | 'Gifted';
export type LookupSource = 'Cellar' | 'External' | 'None';

export interface Wine {
  id: string;
  barcode: string | null;
  name: string;
  producer: string | null;
  vintage: number | null;
  type: WineType;
  country: OriginRef | null;
  region: OriginRef | null;
  /** Grape varieties in the wine's order. */
  grapes: WineGrape[];
  /** Two or more grape varieties. */
  isCuvee: boolean;
  bottleSizeMl: number;
  quantity: number;
  /** Rack slots holding bottles of this wine (sorted by rack name, row, column). */
  slots: SlotLocation[];
  /** Bottles in the cellar that lie in no rack slot. */
  unplacedCount: number;
  /** Extracted label (standard 3:4 format); load with appAuthImage. */
  labelImageId?: string | null;
  /** Original photo the label was cut from (only for the corner editor). */
  labelSourceImageId?: string | null;
  labelCorners?: LabelPoint[] | null;
  drinkFrom: number | null;
  drinkUntil: number | null;
  purchasePrice: number | null;
  notes: string | null;
}

export type SaveWineRequest = Omit<Wine, 'id' | 'country' | 'region' | 'grapes' | 'isCuvee' | 'slots' | 'unplacedCount' | 'labelImageId' | 'labelSourceImageId' | 'labelCorners'> & {
  countryId: string | null;
  regionId: string | null;
  grapes: WineGrapeRequest[];
};

/** Initial values for the wine form: origin is given by name and resolved against the origin list. */
export type WineFormInitial = Partial<Omit<SaveWineRequest, 'countryId' | 'regionId' | 'grapes'>> & {
  country?: string | null;
  region?: string | null;
  /** Grapes by name, resolved against the user's grape list (unknown names are offered for creation). */
  grapes?: GrapeEntry[];
};

export interface WineQuery {
  search: string;
  type: WineType | null;
}

export interface ConsumeRequest {
  kind: ConsumptionKind;
  quantity: number;
  date: string;
  counterparty: string | null;
  price: number | null;
  rating: number | null;
  tastingNote: string | null;
}

export interface ArchiveEntry {
  id: string;
  wineId: string;
  wineName: string;
  producer: string | null;
  vintage: number | null;
  wineType: WineType;
  kind: ConsumptionKind;
  quantity: number;
  date: string;
  counterparty: string | null;
  price: number | null;
  rating: number | null;
  tastingNote: string | null;
  /** Slots freed automatically because not enough bottles were unplaced. */
  freedSlots?: SlotLocation[] | null;
}

export interface UpdateArchiveEntryRequest {
  rating: number | null;
  tastingNote: string | null;
  counterparty: string | null;
  price: number | null;
}

export interface WineDraft {
  name: string | null;
  producer: string | null;
  vintage: number | null;
  type: WineType | null;
  region: string | null;
  country: string | null;
  grapes: string | null;
  bottleSizeMl: number | null;
}

export interface BarcodeLookupResult {
  barcode: string;
  source: LookupSource;
  existingWine: Wine | null;
  draft: WineDraft | null;
  /** Own country matching draft.country (case-insensitive), if any. */
  draftCountryId?: string | null;
  /** Grapes of the draft, split and matched to own varieties where the name exists. */
  draftGrapes?: DraftGrape[] | null;
}

export interface TokenResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

export interface OriginRef {
  id: string;
  name: string;
}

export interface Region {
  id: string;
  name: string;
  wineCount: number;
}

export interface Country {
  id: string;
  name: string;
  wineCount: number;
  regions: Region[];
}

export type StatisticsGrouping = 'Type' | 'Country' | 'Region' | 'Producer' | 'Grape';

export interface StatisticsTotals {
  bottles: number;
  wines: number;
  totalValue: number;
  winesWithoutPrice: number;
}

export interface StatisticsSegment {
  /** Wine type name, country/region id, normalized producer, 'none', 'none:<countryId>' or 'other'. */
  key: string;
  label: string;
  bottles: number;
  percent: number;
  isUnknown: boolean;
  /** Only for the 'other' ("Sonstige") segment. */
  children: StatisticsSegment[] | null;
}

export interface Statistics {
  totals: StatisticsTotals;
  groupBy: StatisticsGrouping;
  /** Set in the country drill-down. */
  country: OriginRef | null;
  segments: StatisticsSegment[];
  /** 'cuvee' in the cuvée drill-down (compositions). */
  drillDown?: string | null;
}

export interface WineGrape {
  id: string;
  name: string;
  percent: number | null;
}

export interface WineGrapeRequest {
  grapeId: string;
  percent: number | null;
}

/** A grape in the wine form: by name, with optional share. */
export interface GrapeEntry {
  name: string;
  percent: number | null;
}

export interface DraftGrape {
  name: string;
  grapeId: string | null;
}

export interface GrapeVariety {
  id: string;
  name: string;
  wineCount: number;
}

// ----- Wine racks -----

/** Where one bottle lies: row 1 is the top row, column 1 the left column. */
export interface SlotLocation {
  slotId: string;
  rackId: string;
  rackName: string;
  row: number;
  column: number;
}

export interface RackSummary {
  id: string;
  name: string;
  height: number;
  width: number;
  capacity: number;
  occupied: number;
  free: number;
}

export interface RackWine {
  id: string;
  name: string;
  producer: string | null;
  vintage: number | null;
  type: WineType;
  /** Label image of the wine (load via ImageCache); null if it has none. */
  labelImageId?: string | null;
}

export interface RackSlot {
  id: string;
  row: number;
  column: number;
  wine: RackWine;
}

/** A rack with its occupied slots (free slots are not listed). */
export interface Rack extends RackSummary {
  slots: RackSlot[];
}

export interface SaveRackRequest {
  name: string;
  height: number;
  width: number;
}

// ----- Photo capture and label images -----

/** A corner of the label, normalized 0..1 (x from the left, y from the top). */
export interface LabelPoint {
  x: number;
  y: number;
}

export type CaptureStatus = 'Pending' | 'Researching' | 'Ready' | 'Failed';
export type FieldSource = 'Label' | 'Web';

export interface CaptureQuota {
  limit: number;
  used: number;
  remaining: number;
  enabled: boolean;
}

export interface CaptureCounts {
  ready: number;
  total: number;
}

export interface CaptureSummary {
  id: string;
  status: CaptureStatus;
  frontImageId: string;
  labelPreviewImageId: string | null;
  name: string | null;
  vintage: number | null;
  bottleCount: number;
  error: string | null;
  createdAt: string;
}

export interface Field<T> {
  value: T;
  source: FieldSource;
}

export interface CaptureGrape {
  name: string;
  percent: number | null;
  source: FieldSource;
  grapeId: string | null;
}

export interface WebSource {
  title: string;
  url: string;
}

export interface CaptureDetail {
  summary: CaptureSummary;
  backImageId: string | null;
  userNote: string | null;
  labelCorners: LabelPoint[] | null;
  labelCornersDetected: boolean;
  researchSummary: string | null;
  nothingFoundOnWeb: boolean;
  name: Field<string> | null;
  producer: Field<string> | null;
  vintage: Field<number> | null;
  type: Field<WineType> | null;
  country: Field<string> | null;
  region: Field<string> | null;
  bottleSizeMl: Field<number> | null;
  drinkFrom: Field<number> | null;
  drinkUntil: Field<number> | null;
  barcode: Field<string> | null;
  notes: Field<string> | null;
  grapes: CaptureGrape[];
  sources: WebSource[];
  countryId: string | null;
  regionId: string | null;
  existingWine: Wine | null;
}

export interface AcceptCaptureRequest {
  wineId?: string;
  addToWineId?: string;
  count?: number;
}
