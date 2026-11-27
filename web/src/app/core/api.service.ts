import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AcceptCaptureRequest,
  ArchiveEntry,
  BarcodeLookupResult,
  CaptureCounts,
  CaptureDetail,
  CaptureQuota,
  CaptureSummary,
  LabelPoint,
  ConsumeRequest,
  ConsumptionKind,
  Country,
  GrapeVariety,
  OriginRef,
  PlaceBottleTarget,
  PlacementSuggestion,
  Rack,
  RackSummary,
  SaveRackRequest,
  SlotLocation,
  SaveWineRequest,
  SetBottleShapeRequest,
  Statistics,
  StatisticsGrouping,
  UpdateArchiveEntryRequest,
  Wine,
  WineQuery,
} from './models';
import { CellarRoom, RackPlacement } from './cellar-room';

/** Typed access to the wine cellar API. Base URL and auth are handled by the interceptor. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  listWines(query: WineQuery): Promise<Wine[]> {
    let params = new HttpParams().set('inCellarOnly', true);
    if (query.search) params = params.set('search', query.search);
    if (query.type) params = params.set('type', query.type);
    return firstValueFrom(this.http.get<Wine[]>('/api/wines', { params }));
  }

  lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
    return firstValueFrom(
      this.http.get<BarcodeLookupResult>(`/api/wines/lookup/${encodeURIComponent(barcode)}`),
    );
  }

  getWine(id: string): Promise<Wine> {
    return firstValueFrom(this.http.get<Wine>(`/api/wines/${id}`));
  }

  createWine(wine: SaveWineRequest): Promise<Wine> {
    return firstValueFrom(this.http.post<Wine>('/api/wines', wine));
  }

  updateWine(id: string, wine: SaveWineRequest): Promise<Wine> {
    return firstValueFrom(this.http.put<Wine>(`/api/wines/${id}`, wine));
  }

  deleteWine(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/wines/${id}`));
  }

  addBottles(id: string, count: number): Promise<Wine> {
    return firstValueFrom(this.http.post<Wine>(`/api/wines/${id}/bottles`, { count }));
  }

  /** Rule-based proposal for the not placed bottles of a wine (changes nothing). */
  getPlacementSuggestion(wineId: string, count?: number): Promise<PlacementSuggestion> {
    const params = count === undefined ? undefined : { count: String(count) };
    return firstValueFrom(this.http.get<PlacementSuggestion>(`/api/wines/${wineId}/placement-suggestion`, { params }));
  }

  /** Puts several bottles of one wine into free slots, all or nothing. */
  placeBottles(wineId: string, slots: PlaceBottleTarget[]): Promise<SlotLocation[]> {
    return firstValueFrom(this.http.post<SlotLocation[]>('/api/racks/placements', { wineId, slots }));
  }

  consume(id: string, request: ConsumeRequest): Promise<ArchiveEntry> {
    return firstValueFrom(this.http.post<ArchiveEntry>(`/api/wines/${id}/consume`, request));
  }

  listArchive(kind: ConsumptionKind | null): Promise<ArchiveEntry[]> {
    let params = new HttpParams();
    if (kind) params = params.set('kind', kind);
    return firstValueFrom(this.http.get<ArchiveEntry[]>('/api/archive', { params }));
  }

  updateArchiveEntry(id: string, request: UpdateArchiveEntryRequest): Promise<ArchiveEntry> {
    return firstValueFrom(this.http.put<ArchiveEntry>(`/api/archive/${id}`, request));
  }

  undoArchiveEntry(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/archive/${id}`));
  }

  // ----- Origins -----

  listOrigins(): Promise<Country[]> {
    return firstValueFrom(this.http.get<Country[]>('/api/origins'));
  }

  createCountry(name: string): Promise<OriginRef> {
    return firstValueFrom(this.http.post<OriginRef>('/api/origins/countries', { name }));
  }

  renameCountry(id: string, name: string): Promise<OriginRef> {
    return firstValueFrom(this.http.put<OriginRef>(`/api/origins/countries/${id}`, { name }));
  }

  deleteCountry(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/origins/countries/${id}`));
  }

  mergeCountry(id: string, targetId: string): Promise<OriginRef> {
    return firstValueFrom(
      this.http.post<OriginRef>(`/api/origins/countries/${id}/merge-into/${targetId}`, null),
    );
  }

  createRegion(countryId: string, name: string): Promise<OriginRef> {
    return firstValueFrom(
      this.http.post<OriginRef>(`/api/origins/countries/${countryId}/regions`, { name }),
    );
  }

  renameRegion(id: string, name: string): Promise<OriginRef> {
    return firstValueFrom(this.http.put<OriginRef>(`/api/origins/regions/${id}`, { name }));
  }

  deleteRegion(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/origins/regions/${id}`));
  }

  mergeRegion(id: string, targetId: string): Promise<OriginRef> {
    return firstValueFrom(
      this.http.post<OriginRef>(`/api/origins/regions/${id}/merge-into/${targetId}`, null),
    );
  }

  // ----- Grape varieties -----

  listGrapes(): Promise<GrapeVariety[]> {
    return firstValueFrom(this.http.get<GrapeVariety[]>('/api/grapes'));
  }

  createGrape(name: string): Promise<GrapeVariety> {
    return firstValueFrom(this.http.post<GrapeVariety>('/api/grapes', { name }));
  }

  renameGrape(id: string, name: string): Promise<GrapeVariety> {
    return firstValueFrom(this.http.put<GrapeVariety>(`/api/grapes/${id}`, { name }));
  }

  deleteGrape(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/grapes/${id}`));
  }

  mergeGrape(id: string, targetId: string): Promise<GrapeVariety> {
    return firstValueFrom(this.http.post<GrapeVariety>(`/api/grapes/${id}/merge-into/${targetId}`, null));
  }

  // ----- Cellar room -----

  getCellarRoom(): Promise<CellarRoom> {
    return firstValueFrom(this.http.get<CellarRoom>('/api/cellar-room'));
  }

  saveCellarRoom(widthCm: number, depthCm: number, heightCm: number): Promise<CellarRoom> {
    return firstValueFrom(this.http.put<CellarRoom>('/api/cellar-room', { widthCm, depthCm, heightCm }));
  }

  placeRack(id: string, p: RackPlacement): Promise<CellarRoom> {
    return firstValueFrom(this.http.put<CellarRoom>(`/api/racks/${id}/placement`, { x: p.x, z: p.z, rotation: p.rotation }));
  }

  removeRackPlacement(id: string): Promise<CellarRoom> {
    return firstValueFrom(this.http.delete<CellarRoom>(`/api/racks/${id}/placement`));
  }

  // ----- Wine racks -----

  listRacks(): Promise<RackSummary[]> {
    return firstValueFrom(this.http.get<RackSummary[]>('/api/racks'));
  }

  getRack(id: string): Promise<Rack> {
    return firstValueFrom(this.http.get<Rack>(`/api/racks/${id}`));
  }

  createRack(request: SaveRackRequest): Promise<Rack> {
    return firstValueFrom(this.http.post<Rack>('/api/racks', request));
  }

  updateRack(id: string, request: SaveRackRequest): Promise<Rack> {
    return firstValueFrom(this.http.put<Rack>(`/api/racks/${id}`, request));
  }

  deleteRack(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/racks/${id}`));
  }

  /** Puts one bottle of a wine into a free slot; returns the updated rack. */
  placeBottle(rackId: string, wineId: string, row: number, column: number): Promise<Rack> {
    return firstValueFrom(this.http.post<Rack>(`/api/racks/${rackId}/slots`, { wineId, row, column }));
  }

  /** Moves a bottle; returns the target rack. */
  moveBottle(slotId: string, rackId: string, row: number, column: number): Promise<Rack> {
    return firstValueFrom(this.http.put<Rack>(`/api/racks/slots/${slotId}`, { rackId, row, column }));
  }

  /** Takes a bottle out of its slot (it stays in the cellar); returns the rack. */
  removeBottle(slotId: string): Promise<Rack> {
    return firstValueFrom(this.http.delete<Rack>(`/api/racks/slots/${slotId}`));
  }

  consumeFromSlot(slotId: string, request: ConsumeRequest): Promise<ArchiveEntry> {
    return firstValueFrom(this.http.post<ArchiveEntry>(`/api/racks/slots/${slotId}/consume`, request));
  }

  // ----- Photo capture -----

  getCaptureQuota(): Promise<CaptureQuota> {
    return firstValueFrom(this.http.get<CaptureQuota>('/api/captures/quota'));
  }

  getCaptureCounts(): Promise<CaptureCounts> {
    return firstValueFrom(this.http.get<CaptureCounts>('/api/captures/counts'));
  }

  /** Uploads the photos; the research runs in the background on the server. */
  createCapture(
    front: Blob,
    back: Blob | null,
    bottleCount: number,
    note: string | null,
    barcode: string | null = null,
  ): Promise<CaptureSummary> {
    const form = new FormData();
    if (barcode) form.append('barcode', barcode);
    form.append('front', front, 'front.jpg');
    if (back) form.append('back', back, 'back.jpg');
    form.append('bottleCount', String(bottleCount));
    if (note) form.append('note', note);
    return firstValueFrom(this.http.post<CaptureSummary>('/api/captures', form));
  }

  listCaptures(): Promise<CaptureSummary[]> {
    return firstValueFrom(this.http.get<CaptureSummary[]>('/api/captures'));
  }

  getCapture(id: string): Promise<CaptureDetail> {
    return firstValueFrom(this.http.get<CaptureDetail>(`/api/captures/${id}`));
  }

  retryCapture(id: string): Promise<CaptureSummary> {
    return firstValueFrom(this.http.post<CaptureSummary>(`/api/captures/${id}/retry`, null));
  }

  setCaptureCorners(id: string, corners: LabelPoint[]): Promise<CaptureDetail> {
    return firstValueFrom(this.http.put<CaptureDetail>(`/api/captures/${id}/label-corners`, { corners }));
  }

  /** Adjusts outline and/or label placement of the bottle of a draft (no research, no quota). */
  setCaptureBottleShape(id: string, request: SetBottleShapeRequest): Promise<CaptureDetail> {
    return firstValueFrom(this.http.put<CaptureDetail>(`/api/captures/${id}/bottle-shape`, request));
  }

  acceptCapture(id: string, request: AcceptCaptureRequest): Promise<Wine> {
    return firstValueFrom(this.http.post<Wine>(`/api/captures/${id}/accept`, request));
  }

  discardCapture(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/captures/${id}`));
  }

  // ----- Images -----

  /** Protected image as a blob (img src cannot send the bearer token). */
  getImage(id: string): Promise<Blob> {
    return firstValueFrom(this.http.get(`/api/images/${id}`, { responseType: 'blob' }));
  }

  /** Sets or replaces the label image: the server cuts the label out of the photo with the corners. */
  setLabelImage(wineId: string, photo: Blob, corners: LabelPoint[]): Promise<Wine> {
    const form = new FormData();
    form.append('image', photo, 'label.jpg');
    form.append('corners', JSON.stringify(corners));
    return firstValueFrom(this.http.put<Wine>(`/api/wines/${wineId}/label-image`, form));
  }

  setLabelCorners(wineId: string, corners: LabelPoint[]): Promise<Wine> {
    return firstValueFrom(this.http.put<Wine>(`/api/wines/${wineId}/label-image/corners`, { corners }));
  }

  removeLabelImage(wineId: string): Promise<Wine> {
    return firstValueFrom(this.http.delete<Wine>(`/api/wines/${wineId}/label-image`));
  }

  /** Sets or replaces the back label: the server cuts it out of the photo with the corners (no research, no quota). */
  setBackImage(wineId: string, photo: Blob, corners: LabelPoint[]): Promise<Wine> {
    const form = new FormData();
    form.append('image', photo, 'back.jpg');
    form.append('corners', JSON.stringify(corners));
    return firstValueFrom(this.http.put<Wine>(`/api/wines/${wineId}/back-image`, form));
  }

  /** Cuts the back label again from the original (or the unedited back photo). */
  setBackCorners(wineId: string, corners: LabelPoint[]): Promise<Wine> {
    return firstValueFrom(this.http.put<Wine>(`/api/wines/${wineId}/back-image/corners`, { corners }));
  }

  removeBackImage(wineId: string): Promise<Wine> {
    return firstValueFrom(this.http.delete<Wine>(`/api/wines/${wineId}/back-image`));
  }

  /** Adjusts outline and/or label placement of a wine's bottle (no research, no quota). */
  setBottleShape(wineId: string, request: SetBottleShapeRequest): Promise<Wine> {
    return firstValueFrom(this.http.put<Wine>(`/api/wines/${wineId}/bottle-shape`, request));
  }

  /** Detects the bottle on the stored original photo: one research, counts towards the daily limit. */
  detectBottle(wineId: string): Promise<Wine> {
    return firstValueFrom(this.http.post<Wine>(`/api/wines/${wineId}/bottle-shape/detect`, null));
  }

  /** Estimates peak year and spread of the drinking curve on the web: one research, counts towards the daily limit. */
  estimateDrinkingCurve(wineId: string): Promise<Wine> {
    return firstValueFrom(this.http.post<Wine>(`/api/wines/${wineId}/estimate-drinking-curve`, null));
  }

  // ----- Statistics -----

  getStatistics(
    groupBy: StatisticsGrouping,
    countryId: string | null = null,
    cuvee = false,
  ): Promise<Statistics> {
    let params = new HttpParams().set('groupBy', groupBy);
    if (countryId) params = params.set('countryId', countryId);
    if (cuvee) params = params.set('cuvee', true);
    return firstValueFrom(this.http.get<Statistics>('/api/statistics', { params }));
  }
}
