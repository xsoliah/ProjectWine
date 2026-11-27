import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { LabelPoint } from './models';

const corners: LabelPoint[] = [
  { x: 0.1, y: 0.1 },
  { x: 0.9, y: 0.1 },
  { x: 0.9, y: 0.9 },
  { x: 0.1, y: 0.9 },
];

describe('ApiService back label', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the photo together with the four corners', async () => {
    const promise = api.setBackImage('w1', new Blob(['x'], { type: 'image/jpeg' }), corners);
    const req = http.expectOne('/api/wines/w1/back-image');
    expect(req.request.method).toBe('PUT');
    const form = req.request.body as FormData;
    expect(form.get('image')).toBeInstanceOf(Blob);
    expect(JSON.parse(form.get('corners') as string)).toEqual(corners);
    req.flush({ id: 'w1', backImageId: 'b1' });
    expect((await promise).backImageId).toBe('b1');
  });

  it('cuts again with adjusted corners', async () => {
    const promise = api.setBackCorners('w1', corners);
    const req = http.expectOne('/api/wines/w1/back-image/corners');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ corners });
    req.flush({ id: 'w1', backImageId: 'b2', backSourceImageId: 's1' });
    expect((await promise).backSourceImageId).toBe('s1');
  });
});
