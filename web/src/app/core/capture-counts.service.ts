import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { CaptureCounts } from './models';

/** Finished and total drafts for the navigation (badge; on phones "Entwürfe" only appears when there are any). */
@Injectable({ providedIn: 'root' })
export class CaptureCountsService {
  private readonly api = inject(ApiService);
  readonly counts = signal<CaptureCounts>({ ready: 0, total: 0 });

  async refresh(): Promise<void> {
    try {
      this.counts.set(await this.api.getCaptureCounts());
    } catch {
      // The badge is optional; keep the last value.
    }
  }
}
