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
  Rack,
  RackSummary,
  SaveRackRequest,
  SaveWineRequest,
  Statistics,
  StatisticsGrouping,
  UpdateArchiveEntryRequest,
  Wine,
  WineQuery,
} from './models';

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
  createCapture(front: Blob, back: Blob | null, bottleCount: number, note: string | null): Promise<CaptureSummary> {
    const form = new FormData();
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
