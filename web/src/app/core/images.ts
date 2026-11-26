import { Directive, ElementRef, Injectable, effect, inject, input } from '@angular/core';
import { ApiService } from './api.service';

const MAX_CACHED = 120;

/**
 * Protected images (label images, photos) as object URLs. Images never change under the same id, so the URLs are
 * cached; the oldest ones are released when the cache is full.
 */
@Injectable({ providedIn: 'root' })
export class ImageCache {
  private readonly api = inject(ApiService);
  private readonly urls = new Map<string, Promise<string>>();

  url(id: string): Promise<string> {
    let url = this.urls.get(id);
    if (!url) {
      url = this.api.getImage(id).then((blob) => URL.createObjectURL(blob));
      url.catch(() => this.urls.delete(id));
      this.urls.set(id, url);
      this.trim();
    }
    return url;
  }

  private trim(): void {
    while (this.urls.size > MAX_CACHED) {
      const [oldest, url] = this.urls.entries().next().value!;
      this.urls.delete(oldest);
      void url.then((u) => URL.revokeObjectURL(u)).catch(() => undefined);
    }
  }
}

/** `<img [appAuthImage]="id">` loads a protected image with the bearer token. */
@Directive({
  selector: 'img[appAuthImage]',
  host: { '[class.loading]': '!loaded' },
})
export class AuthImage {
  readonly appAuthImage = input<string | null | undefined>();

  private readonly img = inject(ElementRef<HTMLImageElement>);
  private readonly cache = inject(ImageCache);
  protected loaded = false;

  constructor() {
    effect(() => {
      const id = this.appAuthImage();
      const element = this.img.nativeElement;
      if (!id) {
        element.removeAttribute('src');
        return;
      }
      this.cache
        .url(id)
        .then((url) => {
          if (this.appAuthImage() === id) {
            element.src = url;
            this.loaded = true;
          }
        })
        .catch(() => element.removeAttribute('src'));
    });
  }
}
