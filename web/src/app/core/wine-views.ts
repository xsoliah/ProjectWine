/** Pictures the label panel of the detail view can show. */
export type WineView = 'label' | 'back' | 'bottle' | '3d';

export interface ViewOption {
  id: WineView;
  label: string;
}

/**
 * The views offered for a wine, in display order. The front always comes first; "Rückseite" exists only with a
 * back image. The front is called "Vorderseite" once there is a back to switch to, otherwise "Etikett".
 */
export function viewOptions(wine: { bottleImageId?: string | null; backImageId?: string | null }, webgl: boolean): ViewOption[] {
  const options: ViewOption[] = [{ id: 'label', label: wine.backImageId ? 'Vorderseite' : 'Etikett' }];
  if (wine.backImageId) options.push({ id: 'back', label: 'Rückseite' });
  if (wine.bottleImageId) options.push({ id: 'bottle', label: 'Flasche' });
  if (webgl) options.push({ id: '3d', label: '3D-Ansicht' });
  return options;
}

/** The view actually shown: the chosen one if it is still offered (e.g. not after the back image was removed), else the front. */
export function resolveView(view: WineView, options: readonly ViewOption[]): WineView {
  return options.some((o) => o.id === view) ? view : 'label';
}
