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

/**
 * Label as a curved patch that follows the bottle wall between its lower and upper edge: it keeps its size and its
 * proportions (the texture is cropped to the label itself) and sits at its angle around the bottle.
 */
export function labelGeometry(shape: BottleShape, length: number): BufferGeometry {
  const frame = labelFrame(shape, length);
  const crop = labelUvCrop(frame.aspect);
  const columns = Math.max(4, Math.ceil(frame.arc / 0.1));
  const rows = 16;
  const lift = LABEL_LIFT * (length / BOTTLE_LENGTH);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= rows; j++) {
    const t = j / rows;
    const height = shape.label.bottom + t * (shape.label.top - shape.label.bottom);
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
    <button type="button" class="btn btn-small reset" (click)="resetView()">
      <app-icon name="reset" /> Ansicht zurücksetzen
    </button>
    <p class="help muted" aria-hidden="true">Ziehen oder Pfeiltasten zum Drehen, Mausrad zum Zoomen.</p>
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
    .reset {
      position: absolute;
      top: var(--space-2);
      right: var(--space-2);
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

  constructor() {
    afterNextRender(() => this.init());

    effect(() => {
      const form = resolveForm(this.form(), this.type());
      const shape = effectiveShape(this.shape(), this.type(), form);
      const type = this.type();
      const scale = bottleScale(this.sizeMl());
      const labelId = this.labelImageId();
      if (!this.ready()) return;
      this.build(shape, type, form, scale, labelId);
    });

    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  resetView(): void {
    if (!this.camera) return;
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, 0, this.startDistance);
    this.controls.update();
    this.userMoved = false;
    this.requestRender();
  }

  protected onKey(event: KeyboardEvent): void {
    if (!this.camera) return;
    const next = stepView(
      { azimuth: this.controls.getAzimuthalAngle(), tilt: Math.PI / 2 - this.controls.getPolarAngle() },
      event.key,
      event.shiftKey,
    );
    if (!next) return;
    event.preventDefault();
    const distance = this.camera.position.distanceTo(this.controls.target);
    const phi = Math.PI / 2 - next.tilt;
    this.camera.position
      .set(Math.sin(phi) * Math.sin(next.azimuth), Math.cos(phi), Math.sin(phi) * Math.cos(next.azimuth))
      .multiplyScalar(distance)
      .add(this.controls.target);
    this.controls.update();
    this.userMoved = true;
    this.requestRender();
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
      if (interacting) this.userMoved = true;
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
  private build(shape: BottleShape, type: WineType, form: BottleForm, scale: number, labelId: string | null | undefined): void {
    this.clearMeshes();
    const length = BOTTLE_LENGTH * scale;

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
    this.fitCamera(!this.userMoved);
    this.requestRender();
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
    for (const item of [this.glass, this.foil, this.labelMaterial]) item.dispose();
    this.environment?.dispose();
    this.renderer.dispose();
  }
}
