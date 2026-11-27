import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  BufferGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Texture,
  Vector2,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BOTTLE_LENGTH,
  MAX_AZIMUTH,
  backLabelFrame,
  MAX_TILT,
  bottleScale,
  capsuleDimensions,
  effectiveShape,
  resolveForm,
  labelFrame,
  labelUvCrop,
  lathePoints,
  radiusAt,
  stepView,
  wallPoints,
} from '../core/bottle';
import { ImageCache } from '../core/images';
import { BottleForm, BottleShape, WineType } from '../core/models';
import { Icon } from './icon';
import { CAPSULE_BY_TYPE, GLASS_BY_TYPE } from './rack-3d-look';

/** The label floats slightly above the glass so the two surfaces do not flicker. */
const LABEL_LIFT = 0.004;
const START_DISTANCE_FACTOR = 1.35;
const TURN_MS = 450;

/**
 * Label as a curved patch that follows the bottle wall between its lower and upper edge: it keeps its size and its
 * proportions (the texture is cropped to the label itself) and sits at its angle around the bottle.
 */
export function labelGeometry(shape: BottleShape, length: number): BufferGeometry {
  const frame = labelFrame(shape, length);
  return patchGeometry(shape, length, shape.label.bottom, shape.label.top, frame.startAngle, frame.arc, labelUvCrop(frame.aspect));
}

/**
 * Curved patch on the bottle wall between two heights (0..1) and from a start angle over an arc; the texture
 * section `crop` is stretched over it.
 */
export function patchGeometry(
  shape: BottleShape,
  length: number,
  bottom: number,
  top: number,
  startAngle: number,
  arc: number,
  crop: { u0: number; v0: number; du: number; dv: number },
): BufferGeometry {
  const frame = { startAngle, arc };
  const columns = Math.max(4, Math.ceil(frame.arc / 0.1));
  const rows = 16;
  const lift = LABEL_LIFT * (length / BOTTLE_LENGTH);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= rows; j++) {
    const t = j / rows;
    const height = bottom + t * (top - bottom);
    const radius = radiusAt(shape, height) * length + lift;
    for (let i = 0; i <= columns; i++) {
      const s = i / columns;
      const angle = frame.startAngle + s * frame.arc;
      positions.push(radius * Math.sin(angle), height * length - length / 2, radius * Math.cos(angle));
      uvs.push(crop.u0 + crop.du * s, crop.v0 + crop.dv * t);
    }
  }
  const stride = columns + 1;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const a = j * stride + i;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Rotatable 3D bottle (WebGL via three.js) in the shape of the measured bottle with the label in its real size
 * and position. Rotation is limited like in the rack view; the arrow keys turn the bottle too.
 */
@Component({
  selector: 'app-bottle-3d',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'img',
    tabindex: '0',
    '[attr.aria-label]': '"3D-Ansicht der Flasche " + name()',
    '(keydown)': 'onKey($event)',
  },
  template: `
    <canvas #canvas aria-hidden="true"></canvas>
    <div class="actions">
      @if (backImageId()) {
        <button type="button" class="btn btn-small" (click)="toggleSide()">
          <app-icon name="reset" /> {{ showingBack() ? 'Vorderseite zeigen' : 'Rückseite zeigen' }}
        </button>
      }
      <button type="button" class="btn btn-small" (click)="resetView()">
        <app-icon name="reset" /> Ansicht zurücksetzen
      </button>
    </div>
    <p class="help muted" aria-hidden="true">
      Ziehen oder Pfeiltasten zum Drehen{{ backImageId() ? ' (rundum)' : '' }}, Mausrad zum Zoomen.
    </p>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      height: min(65dvh, 30rem);
      border: 1px solid var(--line);
      border-radius: var(--radius-m);
      background: radial-gradient(ellipse at 50% 40%, var(--surface), var(--surface-2));
      overflow: hidden;
      touch-action: none;
    }
    :host(:focus-visible) {
      outline: 3px solid var(--focus, #3b6fd8);
      outline-offset: 2px;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: grab;
    }
    .actions {
      position: absolute;
      top: var(--space-2);
      right: var(--space-2);
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-2);
    }
    .help {
      position: absolute;
      left: var(--space-3);
      bottom: var(--space-2);
      margin: 0;
      font-size: 0.8125rem;
      pointer-events: none;
    }
  `,
})
export class Bottle3d {
  /** Measured bottle; null shows the standard bottle of the wine type. */
  readonly shape = input<BottleShape | null | undefined>(null);
  readonly type = input<WineType>('Red');
  /** Chosen bottle form; null = automatic (follows the wine type). */
  readonly form = input<BottleForm | null | undefined>(null);
  readonly sizeMl = input<number | null | undefined>(750);
  /** Label image of the wine (load via ImageCache); without it the bottle has no label. */
  readonly labelImageId = input<string | null | undefined>(null);
  /** Photo of the back label; with it the bottle shows the label on its back and can be turned all the way round. */
  readonly backImageId = input<string | null | undefined>(null);
  readonly name = input.required<string>();
  /** WebGL cannot be used (not supported, or the context was lost): the page shows the flat label instead. */
  readonly unavailable = output<void>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly images = inject(ImageCache);
  private readonly ready = signal(false);

  private renderer!: WebGLRenderer;
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private controls!: OrbitControls;
  private environment?: Texture;
  private observer?: ResizeObserver;
  private frame = 0;
  private disposed = false;
  private startDistance = 8;
  private userMoved = false;

  private readonly glass = new MeshStandardMaterial({ roughness: 0.12, metalness: 0, envMapIntensity: 1.3 });
  private readonly foil = new MeshStandardMaterial({ roughness: 0.4, metalness: 0.6 });
  private readonly labelMaterial = new MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  private readonly group = new Group();
  private geometries: BufferGeometry[] = [];
  private labelTexture: Texture | null = null;
  private labelRequest = 0;

  private readonly backMaterial = new MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  private backTexture: Texture | null = null;
  private backRequest = 0;
  /** The back photo that is loaded (and its width over height), so a rebuild does not load it again. */
  private backLoaded: { id: string; aspect: number } | null = null;
  private current: { shape: BottleShape; length: number } | null = null;
  private animation = 0;
  /** Whether the bottle is turned to its back (nearer to 180° than to 0°). */
  protected readonly showingBack = signal(false);

  constructor() {
    afterNextRender(() => this.init());

    effect(() => {
      const form = resolveForm(this.form(), this.type());
      const shape = effectiveShape(this.shape(), this.type(), form);
      const type = this.type();
      const scale = bottleScale(this.sizeMl());
      const labelId = this.labelImageId();
      const backId = this.backImageId();
      if (!this.ready()) return;
      this.build(shape, type, form, scale, labelId, backId);
    });

    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  resetView(): void {
    if (!this.camera) return;
    this.stopAnimation();
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, 0, this.startDistance);
    this.controls.update();
    this.userMoved = false;
    this.showingBack.set(false);
    this.requestRender();
  }

  /** Turns the bottle to its back, or to the front when it already shows the back. */
  protected toggleSide(): void {
    if (!this.camera) return;
    const toBack = !this.showingBack();
    const current = this.controls.getAzimuthalAngle();
    // The nearest full-turn equivalent of the target, so the bottle takes the short way.
    const base = toBack ? Math.PI : 0;
    const target = base + Math.round((current - base) / (2 * Math.PI)) * 2 * Math.PI;
    this.turnTo(target);
    this.userMoved = true;
    this.showingBack.set(toBack);
  }

  private turnTo(azimuth: number): void {
    this.stopAnimation();
    const distance = this.camera.position.distanceTo(this.controls.target);
    const tilt = Math.PI / 2 - this.controls.getPolarAngle();
    const from = this.controls.getAzimuthalAngle();
    const place = (value: number) => {
      const phi = Math.PI / 2 - tilt;
      this.camera.position
        .set(Math.sin(phi) * Math.sin(value), Math.cos(phi), Math.sin(phi) * Math.cos(value))
        .multiplyScalar(distance)
        .add(this.controls.target);
      this.controls.update();
      this.requestRender();
    };
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      place(azimuth);
      return;
    }
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / TURN_MS);
      const eased = t * t * (3 - 2 * t);
      place(from + (azimuth - from) * eased);
      this.animation = t < 1 ? requestAnimationFrame(step) : 0;
    };
    this.animation = requestAnimationFrame(step);
  }

  private stopAnimation(): void {
    cancelAnimationFrame(this.animation);
    this.animation = 0;
  }

  protected onKey(event: KeyboardEvent): void {
    if (!this.camera) return;
    const next = stepView(
      { azimuth: this.controls.getAzimuthalAngle(), tilt: Math.PI / 2 - this.controls.getPolarAngle() },
      event.key,
      event.shiftKey,
      this.backImageId() ? Infinity : MAX_AZIMUTH,
    );
    if (!next) return;
    event.preventDefault();
    this.stopAnimation();
    const distance = this.camera.position.distanceTo(this.controls.target);
    const phi = Math.PI / 2 - next.tilt;
    this.camera.position
      .set(Math.sin(phi) * Math.sin(next.azimuth), Math.cos(phi), Math.sin(phi) * Math.cos(next.azimuth))
      .multiplyScalar(distance)
      .add(this.controls.target);
    this.controls.update();
    this.userMoved = true;
    this.updateSide();
    this.requestRender();
  }

  private updateSide(): void {
    this.showingBack.set(Math.abs(this.controls.getAzimuthalAngle()) > Math.PI / 2);
  }

  /** Free horizontal turning only with a back label; otherwise as limited as in the rack. */
  private applyLimits(hasBack: boolean): void {
    this.controls.minAzimuthAngle = hasBack ? -Infinity : -MAX_AZIMUTH;
    this.controls.maxAzimuthAngle = hasBack ? Infinity : MAX_AZIMUTH;
    if (!hasBack && Math.abs(this.controls.getAzimuthalAngle()) > MAX_AZIMUTH) this.resetView();
  }

  private init(): void {
    const canvas = this.canvas().nativeElement;
    try {
      this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      this.unavailable.emit();
      return;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new Scene();
    const pmrem = new PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04).texture;
    this.scene.environment = this.environment;
    room.dispose();
    pmrem.dispose();
    this.scene.add(new HemisphereLight(0xfff4e0, 0x3a2a20, 0.5));
    const sun = new DirectionalLight(0xffffff, 1.4);
    sun.position.set(4, 6, 10);
    this.scene.add(sun);
    this.scene.add(this.group);

    this.camera = new PerspectiveCamera(30, 1, 0.1, 1000);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = false;
    this.controls.minAzimuthAngle = -MAX_AZIMUTH;
    this.controls.maxAzimuthAngle = MAX_AZIMUTH;
    this.controls.minPolarAngle = Math.PI / 2 - MAX_TILT;
    this.controls.maxPolarAngle = Math.PI / 2 + MAX_TILT;
    this.controls.addEventListener('change', () => this.requestRender());
    let interacting = false;
    this.controls.addEventListener('start', () => (interacting = true));
    this.controls.addEventListener('end', () => (interacting = false));
    this.controls.addEventListener('change', () => {
      if (interacting) {
        this.userMoved = true;
        this.stopAnimation();
        this.updateSide();
      }
    });
    canvas.addEventListener('webglcontextlost', this.onContextLost);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.host.nativeElement);
    this.resize();
    this.ready.set(true);
  }

  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.unavailable.emit();
  };

  private resize(): void {
    const { clientWidth, clientHeight } = this.host.nativeElement;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.fitCamera(!this.userMoved);
    this.requestRender();
  }

  /**
   * Distance at which the whole bottle fits into the view. The reference is the standard 750 ml bottle: smaller bottles
   * (half bottles) stay smaller in the picture, larger ones (magnums) move the camera back so they remain fully visible.
   */
  private fitCamera(moveCamera: boolean): void {
    const length = BOTTLE_LENGTH * Math.max(1, bottleScale(this.sizeMl()));
    const halfFov = ((this.camera.fov / 2) * Math.PI) / 180;
    const byHeight = (length / 2) / Math.tan(halfFov);
    const byWidth = (length * 0.2) / (Math.tan(halfFov) * this.camera.aspect);
    this.startDistance = Math.max(byHeight, byWidth) * START_DISTANCE_FACTOR;
    this.controls.minDistance = this.startDistance * 0.4;
    this.controls.maxDistance = this.startDistance * 1.6;
    if (moveCamera) this.resetView();
  }

  /** Builds glass, capsule and label for the shape; replaces the previous meshes. */
  private build(
    shape: BottleShape,
    type: WineType,
    form: BottleForm,
    scale: number,
    labelId: string | null | undefined,
    backId: string | null | undefined,
  ): void {
    this.clearMeshes();
    const length = BOTTLE_LENGTH * scale;
    this.current = { shape, length };
    this.applyLimits(!!backId);

    this.glass.color.set(GLASS_BY_TYPE[type] ?? GLASS_BY_TYPE.Other);
    this.foil.color.set(CAPSULE_BY_TYPE[type] ?? CAPSULE_BY_TYPE.Other);

    const body = new LatheGeometry(lathePoints(wallPoints(shape, length)).map(([r, y]) => new Vector2(r, y)), 48);
    body.translate(0, -length / 2, 0);

    const foil = capsuleDimensions(shape, form);
    const lift = LABEL_LIFT * scale;
    const capsule = new CylinderGeometry(
      foil.topRadius * length + lift, foil.bottomRadius * length + lift, (foil.top - foil.start) * length, 24);
    capsule.translate(0, ((foil.top + foil.start) / 2) * length - length / 2, 0);

    this.geometries = [body, capsule];
    this.group.add(new Mesh(body, this.glass), new Mesh(capsule, this.foil));

    if (labelId) {
      const label = labelGeometry(shape, length);
      this.geometries.push(label);
      this.group.add(new Mesh(label, this.labelMaterial));
      void this.loadLabel(labelId);
    } else {
      this.labelMaterial.map = null;
    }
    if (backId) {
      if (this.backLoaded?.id === backId) this.addBackLabel();
      else void this.loadBack(backId);
    } else {
      this.backRequest++;
      this.backLoaded = null;
      this.backTexture?.dispose();
      this.backTexture = null;
      this.backMaterial.map = null;
    }
    this.fitCamera(!this.userMoved);
    this.requestRender();
  }

  /** Adds the back label to the current bottle (needs the loaded photo for its proportions). */
  private addBackLabel(): void {
    if (!this.current || !this.backLoaded) return;
    const { shape, length } = this.current;
    const frame = backLabelFrame(shape, length, this.backLoaded.aspect);
    if (!frame) return;
    const geometry = patchGeometry(
      shape, length, frame.bottom / length, frame.top / length, frame.startAngle, frame.arc, { u0: 0, v0: 0, du: 1, dv: 1 });
    this.geometries.push(geometry);
    this.group.add(new Mesh(geometry, this.backMaterial));
  }

  private async loadBack(imageId: string): Promise<void> {
    const request = ++this.backRequest;
    try {
      const url = await this.images.url(imageId);
      const image = new Image();
      image.src = url;
      await image.decode();
      if (this.disposed || request !== this.backRequest) return;
      this.backTexture?.dispose();
      const texture = new Texture(image);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      this.backTexture = texture;
      this.backMaterial.map = texture;
      this.backMaterial.needsUpdate = true;
      this.backLoaded = { id: imageId, aspect: image.naturalWidth / Math.max(1, image.naturalHeight) };
      this.addBackLabel();
      this.requestRender();
    } catch {
      // Without the photo the back stays plain glass.
    }
  }

  private async loadLabel(imageId: string): Promise<void> {
    const request = ++this.labelRequest;
    try {
      const url = await this.images.url(imageId);
      const image = new Image();
      image.src = url;
      await image.decode();
      if (this.disposed || request !== this.labelRequest) return;
      this.labelTexture?.dispose();
      const texture = new Texture(image);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      this.labelTexture = texture;
      this.labelMaterial.map = texture;
      this.labelMaterial.needsUpdate = true;
      this.requestRender();
    } catch {
      // The label stays plain paper colour.
    }
  }

  private clearMeshes(): void {
    this.group.clear();
    for (const geometry of this.geometries) geometry.dispose();
    this.geometries = [];
  }

  /** Renders on demand (camera or data changed), not in a loop. */
  private requestRender(): void {
    if (this.frame || !this.renderer || this.disposed) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.renderer.render(this.scene, this.camera);
    });
  }

  private dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    if (!this.renderer) return;
    this.canvas().nativeElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.controls.dispose();
    this.clearMeshes();
    this.labelTexture?.dispose();
    this.backTexture?.dispose();
    this.stopAnimation();
    for (const item of [this.glass, this.foil, this.labelMaterial, this.backMaterial]) item.dispose();
    this.environment?.dispose();
    this.renderer.dispose();
  }
}
