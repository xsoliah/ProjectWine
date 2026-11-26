import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';

/** A native <dialog> opened as soon as it is rendered; wrap it in @if to show and hide it. */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      [class.wide]="wide()"
      [attr.aria-label]="label()"
      (close)="closed.emit()"
      (click)="onBackdrop($event)"
    >
      <div class="modal-body"><ng-content /></div>
    </dialog>
  `,
  styles: `
    dialog {
      width: min(32rem, calc(100vw - 2rem));
      max-height: calc(100dvh - 2rem);
      padding: 0;
      border: 1px solid var(--line);
      border-radius: var(--radius-l);
      background: var(--surface);
      color: var(--ink);
      box-shadow: var(--shadow-lifted);
    }
    dialog.wide {
      width: min(60rem, calc(100vw - 2rem));
    }
    dialog::backdrop {
      background: rgb(20 8 12 / 0.55);
    }
    dialog[open] {
      animation: rise 160ms ease-out;
    }
    .modal-body {
      padding: var(--space-5);
    }
    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(0.75rem);
      }
    }
    @media (max-width: 599px) {
      dialog {
        margin: auto auto 0;
        width: 100vw;
        max-width: 100vw;
        border-radius: var(--radius-l) var(--radius-l) 0 0;
      }
      .modal-body {
        padding-bottom: calc(var(--space-5) + env(safe-area-inset-bottom));
      }
    }
    @media (prefers-reduced-motion: reduce) {
      dialog[open] {
        animation: none;
      }
    }
  `,
})
export class Modal {
  readonly label = input.required<string>();
  /** Wider dialog, e.g. for the label corner editor. */
  readonly wide = input(false);
  readonly closed = output<void>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.dialog().nativeElement.close();
    }
  }
}
