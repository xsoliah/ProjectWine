import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const PATHS = {
  bottle: 'M10 2h4v4c0 1.5 2 2.5 2 5v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-9c0-2.5 2-3.5 2-5V2Z M8 14h8',
  archive: 'M3 5h18v4H3z M5 9v10h14V9 M10 13h4',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z',
  chart: 'M12 3a9 9 0 1 0 9 9h-9V3Z M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3 M16 4h3a1 1 0 0 1 1 1v3 M20 16v3a1 1 0 0 1-1 1h-3 M8 20H5a1 1 0 0 1-1-1v-3 M7 12h10',
  back: 'M15 5l-7 7 7 7',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Z M13 7l4 4',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  undo: 'M9 14 4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  inbox: 'M4 13h4l2 3h4l2-3h4 M4 13l2-8h12l2 8v6H4z',
  image: 'M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4 M15 9.5h.01',
  rack: 'M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18',
  cube: 'M12 2 21 7v10l-9 5-9-5V7l9-5Z M3 7l9 5 9-5 M12 12v10',
  list: 'M8 6h13 M8 12h13 M8 18h13 M3.5 6h.01 M3.5 12h.01 M3.5 18h.01',
  close: 'M6 6l12 12 M18 6 6 18',
  reset: 'M3 12a9 9 0 1 0 3-6.7 M3 4v5h5',
} as const;

export type IconName = keyof typeof PATHS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg
    viewBox="0 0 24 24"
    width="1.25em"
    height="1.25em"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="path()" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly path = computed(() => PATHS[this.name()]);
}
