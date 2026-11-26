import { TestBed } from '@angular/core/testing';
import { ApiConfigService, isValidServerUrl, normalizeServerUrl } from './api-config.service';

describe('server url helpers', () => {
  it('trims whitespace and trailing slashes', () => {
    expect(normalizeServerUrl('  https://wein.example.com// ')).toBe('https://wein.example.com');
  });

  it('accepts only http(s) urls', () => {
    expect(isValidServerUrl('https://wein.example.com')).toBe(true);
    expect(isValidServerUrl('wein.example.com')).toBe(false);
    expect(isValidServerUrl('ftp://wein.example.com')).toBe(false);
  });
});

describe('ApiConfigService on the web', () => {
  it('uses relative urls and needs no setup', async () => {
    localStorage.setItem('serverUrl', 'https://ignored.example.com');
    const service = TestBed.inject(ApiConfigService);
    await service.init();
    expect(service.isNative).toBe(false);
    expect(service.baseUrl()).toBe('');
    expect(service.needsSetup()).toBe(false);
  });
});
