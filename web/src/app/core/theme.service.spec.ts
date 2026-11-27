import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;

  beforeEach(() => {
    localStorage.removeItem('theme');
    delete root.dataset['theme'];
    delete root.dataset['scheme'];
  });

  it('starts with Klassik when nothing is stored', async () => {
    const service = TestBed.inject(ThemeService);
    await service.init();
    expect(service.theme()).toBe('klassik');
    expect(root.dataset['theme']).toBe('klassik');
  });

  it('ignores a corrupt stored value', async () => {
    localStorage.setItem('theme', 'gibtsnicht');
    const service = TestBed.inject(ThemeService);
    await service.init();
    expect(service.theme()).toBe('klassik');
  });

  it('applies and remembers a chosen theme', async () => {
    const service = TestBed.inject(ThemeService);
    await service.set('nacht');
    expect(root.dataset['theme']).toBe('nacht');
    expect(root.dataset['scheme']).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('nacht');
    await service.set('riesling');
    expect(root.dataset['scheme']).toBe('light');
  });

  it('restores the stored theme on init', async () => {
    localStorage.setItem('theme', 'bordeaux');
    const service = TestBed.inject(ThemeService);
    await service.init();
    expect(service.theme()).toBe('bordeaux');
    expect(service.scheme()).toBe('dark');
  });
});
