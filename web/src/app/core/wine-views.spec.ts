import { resolveView, viewOptions } from './wine-views';

const ids = (wine: Parameters<typeof viewOptions>[0], webgl: boolean) => viewOptions(wine, webgl).map((o) => o.id);

describe('viewOptions', () => {
  it('offers only the label without back, bottle and WebGL', () => expect(ids({}, false)).toEqual(['label']));

  it('keeps the name "Etikett" for the front when there is no back image', () =>
    expect(viewOptions({}, true)[0].label).toBe('Etikett'));

  it('offers front and back, front first, when the wine has a back image', () => {
    expect(ids({ backImageId: 'b1' }, false)).toEqual(['label', 'back']);
    expect(viewOptions({ backImageId: 'b1' }, false).map((o) => o.label)).toEqual(['Vorderseite', 'Rückseite']);
  });

  it('puts the back right behind the front, before bottle and 3D', () =>
    expect(ids({ backImageId: 'b1', bottleImageId: 'f1' }, true)).toEqual(['label', 'back', 'bottle', '3d']));

  it('treats a null back image like none', () => expect(ids({ backImageId: null }, false)).toEqual(['label']));
});

describe('resolveView', () => {
  it('keeps a view that is offered', () =>
    expect(resolveView('back', viewOptions({ backImageId: 'b1' }, false))).toBe('back'));

  it('falls back to the front when the back image is gone', () =>
    expect(resolveView('back', viewOptions({ backImageId: null }, false))).toBe('label'));

  it('falls back to the front when 3D is no longer available', () =>
    expect(resolveView('3d', viewOptions({}, false))).toBe('label'));
});
