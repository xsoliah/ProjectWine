import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { BarcodeScannerService } from '../core/barcode-scanner.service';

type Controls = { stop(): void };

function cameraProblem(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Der Kamerazugriff wurde verweigert. Erlaube ihn in den Browser-Einstellungen oder gib den Barcode von Hand ein.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Es wurde keine Kamera gefunden. Gib den Barcode von Hand ein.';
  }
  return 'Die Kamera konnte nicht gestartet werden. Gib den Barcode von Hand ein.';
}

/** Full-screen camera view for the web; resolves the pending scan request of the service. */
@Component({
  selector: 'app-scanner-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'finish(null)' },
  template: `
    <div class="overlay" role="dialog" aria-modal="true" aria-label="Barcode scannen">
      <video #video playsinline muted></video>
      @if (problem(); as text) {
        <p class="problem">{{ text }}</p>
      } @else {
        <div class="frame" aria-hidden="true"></div>
        <p class="hint">Halte den Barcode der Flasche in den Rahmen.</p>
      }
      <button type="button" class="btn cancel" (click)="finish(null)">Abbrechen</button>
    </div>
  `,
  styles: `
    .overlay {
      position: fixed;
      z-index: 200;
      inset: 0;
      display: grid;
      place-items: center;
      background: #0d0709;
      color: #f4ecdc;
    }
    video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .frame {
      position: relative;
      width: min(80vw, 24rem);
      aspect-ratio: 3 / 2;
      border: 2px solid var(--gold);
      border-radius: var(--radius-m);
      box-shadow: 0 0 0 100vmax rgb(13 7 9 / 0.55);
    }
    .hint,
    .problem {
      position: absolute;
      inset-inline: var(--space-4);
      margin: 0;
      text-align: center;
    }
    .hint {
      bottom: calc(6rem + env(safe-area-inset-bottom));
      text-shadow: 0 1px 4px #000;
    }
    .problem {
      max-width: 28rem;
      margin-inline: auto;
      font-size: 1.0625rem;
    }
    .cancel {
      position: absolute;
      bottom: calc(var(--space-5) + env(safe-area-inset-bottom));
    }
  `,
})
export class ScannerOverlay implements OnDestroy {
  private readonly scanner = inject(BarcodeScannerService);
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private controls: Controls | null = null;
  private closed = false;

  protected readonly problem = signal<string | null>(null);

  constructor() {
    afterNextRender(() => void this.start());
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  protected finish(code: string | null): void {
    if (this.closed) return;
    this.closed = true;
    this.stopCamera();
    this.scanner.webRequest()?.resolve(code);
    this.scanner.webRequest.set(null);
  }

  private async start(): Promise<void> {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.problem.set(
        'Die Kamera ist nur über eine sichere Verbindung (HTTPS) verfügbar. Rufe die App über https:// auf oder gib den Barcode von Hand ein.',
      );
      return;
    }
    try {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
        import('@zxing/browser'),
        import('@zxing/library'),
      ]);
      const hints = new Map([
        [
          DecodeHintType.POSSIBLE_FORMATS,
          [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E],
        ],
      ]);
      const reader = new BrowserMultiFormatReader(hints);
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        this.video().nativeElement,
        (result) => {
          if (result) this.finish(result.getText());
        },
      );
      if (this.closed) {
        controls.stop();
        return;
      }
      this.controls = controls;
    } catch (error) {
      if (!this.closed) this.problem.set(cameraProblem(error));
    }
  }

  private stopCamera(): void {
    this.controls?.stop();
    this.controls = null;
    const stream = this.video().nativeElement.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }
}
