import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

export class ScannerUnavailableError extends Error {}

const NATIVE_FORMATS = [
  BarcodeFormat.Ean13,
  BarcodeFormat.Ean8,
  BarcodeFormat.UpcA,
  BarcodeFormat.UpcE,
  BarcodeFormat.Code128,
];

@Injectable({ providedIn: 'root' })
export class BarcodeScannerService {
  /** Set while the web overlay is open; the overlay resolves it with the code or null. */
  readonly webRequest = signal<{ resolve: (code: string | null) => void } | null>(null);

  /** Resolves the scanned code, or null when the user cancelled. */
  scan(): Promise<string | null> {
    return Capacitor.isNativePlatform() ? this.scanNative() : this.scanWeb();
  }

  private scanWeb(): Promise<string | null> {
    return new Promise((resolve) => this.webRequest.set({ resolve }));
  }

  private async scanNative(): Promise<string | null> {
    const { supported } = await BarcodeScanner.isSupported();
    if (!supported) {
      throw new ScannerUnavailableError('Dieses Gerät unterstützt keinen Barcode-Scanner.');
    }
    let { camera } = await BarcodeScanner.checkPermissions();
    if (camera !== 'granted') {
      camera = (await BarcodeScanner.requestPermissions()).camera;
    }
    if (camera !== 'granted') {
      throw new ScannerUnavailableError(
        'Der Kamerazugriff ist nicht erlaubt. Erlaube ihn in den Geräteeinstellungen.',
      );
    }
    if (Capacitor.getPlatform() === 'android') {
      const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!available) {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
        throw new ScannerUnavailableError(
          'Das Scanner-Modul von Google wird gerade installiert. Versuche es in einem Moment erneut.',
        );
      }
    }
    try {
      const { barcodes } = await BarcodeScanner.scan({ formats: NATIVE_FORMATS });
      return barcodes[0]?.rawValue ?? null;
    } catch (error) {
      if (error instanceof Error && /cancel/i.test(error.message)) {
        return null;
      }
      throw error;
    }
  }
}
