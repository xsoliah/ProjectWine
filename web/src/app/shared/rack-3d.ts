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
  Box3,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  InstancedBufferAttribute,
  DirectionalLight,
  HemisphereLight,
  InstancedMesh,
  LatheGeometry,
  Material,
  Matrix4,
  Mesh,
  PMREMGenerator,
  Quaternion,
  SRGBColorSpace,
  Texture,
  Vector3,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BOTTLE_FORM_SPECS,
  BOTTLE_LENGTH,
  capsuleDimensions,
  formBodyRadius,
  lathePoints,
  rackBottleScale,
  resolveForm,
  standardShape,
} from '../core/bottle';
import { BottleForm } from '../core/models';
import { ImageCache } from '../core/images';
import { Rack, RackSlot } from '../core/models';
import { cellFromIndex, cellIndex } from '../core/racks';
import { Icon } from './icon';
import { hasSparklingModel, sparklingGlassPoints, sparklingParts } from './sparkling-bottle';
import {
  ATLAS_SIZE,
  CAPSULE_BY_TYPE,
  FOCUS_DURATION_MS,
  FOCUS_INSET,
  GLASS_BY_TYPE,
  LabelAtlas,
  NEIGHBOR_DURATION_MS,
  TILE_COUNT,
  PULL_DISTANCE,
  PULL_DURATION_MS,
  PULL_PITCH,
  UPRIGHT_LIFT,
  easeOutCubic,
  focusDistance,
  focusTarget,
  slidePose,
} from './rack-3d-look';

/** One slot is 1 x 1 unit; a Bordeaux bottle is about 4 times as long as it is wide. */
const CELL = 1;
const DEPTH = 3.2;
const BOARD = 0.06;
/** Pointer movement (px) up to which a press counts as a tap, not as rotating. */
const TAP_TOLERANCE = 6;
/** Horizontal swipe (px, within SWIPE_MAX_MS) that moves to the neighbouring bottle while a bottle is focused. */
const SWIPE_MIN = 40;
const SWIPE_MAX_MS = 500;
/** Width of the hit box of a pulled-out bottle, in rack units (times its scale). */
const BOTTLE_HIT_WIDTH = 0.8;
/** How far an upright pulled-out bottle reaches above/below its row. */
const PULL_OVERHANG = 1.15;
const MAX_AZIMUTH = (45 * Math.PI) / 180;
const MAX_TILT = (25 * Math.PI) / 180;

const FORMS = Object.keys(BOTTLE_FORM_SPECS) as BottleForm[];

/**
 * A bottle as a surface of revolution (straight body, shoulders, neck, lip) of the given form.
 * Built along +Y with the base at 0, then turned so the neck points to the viewer (+Z) and centred.
 */
function bottleBody(form: BottleForm): BufferGeometry {
  const wall = BOTTLE_FORM_SPECS[form].wall;
  const outline = hasSparklingModel(form) ? sparklingGlassPoints(wall, BOTTLE_LENGTH) : lathePoints(wall);
  const geometry = new LatheGeometry(outline.map(([r, y]) => new Vector2(r, y)), 20);
  geometry.translate(0, -BOTTLE_LENGTH / 2, 0);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** Foil capsule over the neck (a slightly tapering cylinder; long on sparkling wine bottles). */
function capsule(form: BottleForm): BufferGeometry {
  const foil = capsuleDimensions(standardShape('Red', form), form);
  const length = (foil.top - foil.start) * BOTTLE_LENGTH;
  const geometry = new CylinderGeometry(foil.topRadius * BOTTLE_LENGTH, foil.bottomRadius * BOTTLE_LENGTH, length, 16);
  geometry.translate(0, ((foil.top + foil.start) / 2) * BOTTLE_LENGTH - BOTTLE_LENGTH / 2, 0);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** Foil, wire cage and cork of the sparkling wine model, turned like the other rack geometries. */
function sparklingRackParts(form: BottleForm): { foil: BufferGeometry; wire: BufferGeometry; cork: BufferGeometry } | null {
  if (!hasSparklingModel(form)) return null;
  const parts = sparklingParts(standardShape('Sparkling', form), BOTTLE_LENGTH);
  for (const geometry of [parts.foil, parts.wire, parts.cork]) geometry.rotateX(Math.PI / 2);
  return parts;
}

/** Slightly curved label on top of the bottle body (the side that faces the viewer once the rolled bottle stands upright). */
function labelPatch(form: BottleForm): BufferGeometry {
  const arc = (110 * Math.PI) / 180;
  const radius = formBodyRadius(form) + 0.004;
  const geometry = new CylinderGeometry(radius, radius, 1.0, 16, 1, true, Math.PI - arc / 2, arc);
  geometry.translate(0, 0.95 - BOTTLE_LENGTH / 2, 0);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** Instanced meshes of one bottle form; the instances are the slots whose wine has this form. */
interface FormMeshes {
  bottles: InstancedMesh;
  capsules: InstancedMesh;
  labels: InstancedMesh;
  /** Wire cage and cork of the sparkling wine model; other forms have none. */
  extras: InstancedMesh[];
  labelRects: InstancedBufferAttribute;
}

/** Which form mesh, which instance and which size a slot's bottle has. */
interface Placement {
  form: BottleForm;
  index: number;
  scale: number;
}

/** Camera as the point it looks at, the direction toward the camera and the distance. */
interface CameraPose {
  target: Vector3;
  direction: Vector3;
  distance: number;
  /** Share of the view's height at the bottom that is covered (the picture is centred above it). */
  inset: number;
}

/** 3D view of one rack (WebGL via three.js). Tapping a bottle or slot selects its row, whose bottles slide out. */
@Component({
  selector: 'app-rack-3d',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas #canvas aria-hidden="true"></canvas>
    <button type="button" class="btn btn-small reset" (click)="resetView()">
      <app-icon name="reset" /> Ansicht zurücksetzen
    </button>
    <p class="help muted" aria-hidden="true">Ziehen zum Drehen, Zwei-Finger-Geste oder Mausrad zum Zoomen, Tippen wählt eine Reihe.</p>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      height: min(70dvh, 36rem);
      border: 1px solid var(--line);
      border-radius: var(--radius-m);
      background: radial-gradient(ellipse at 50% 40%, var(--surface), var(--surface-2));
      overflow: hidden;
      touch-action: none;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: pointer;
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
export class Rack3d {
  readonly rack = input.required<Rack>();
  readonly selectedRow = input<number | null>(null);
  readonly rowSelected = output<number>();
  /** Id of the slot whose bottle the camera zooms onto (its row must be the selected one); null = row view. */
  readonly focusedSlot = input<string | null>(null);
  /** A pulled-out bottle of the selected row was tapped. */
  readonly bottleTapped = output<RackSlot>();
  /** Tap on empty space, or on the selected row, while a bottle is focused. */
  readonly emptyTapped = output<void>();
  /** Horizontal swipe while a bottle is focused: wants the previous/next bottle. */
  readonly swipe = output<'prev' | 'next'>();
  /** "Ansicht zurücksetzen" was used while a bottle is focused. */
  readonly viewReset = output<void>();
  /** The browser dropped the WebGL context: the page switches to the grid. */
  readonly contextLost = output<void>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly ready = signal(false);

  private renderer!: WebGLRenderer;
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private controls!: OrbitControls;
  private observer?: ResizeObserver;
  private frame = 0;
  private startDistance = 10;

  private readonly formGeometries = new Map<BottleForm, { bottle: BufferGeometry; capsule: BufferGeometry; label: BufferGeometry; wire?: BufferGeometry; cork?: BufferGeometry }>(
    FORMS.map((form) => {
      const sparkling = sparklingRackParts(form);
      return [form, { bottle: bottleBody(form), capsule: sparkling?.foil ?? capsule(form), label: labelPatch(form), wire: sparkling?.wire, cork: sparkling?.cork }];
    }),
  );
  private readonly wireMaterial = new MeshStandardMaterial({ color: '#b8a77a', roughness: 0.35, metalness: 0.8 });
  private readonly corkMaterial = new MeshStandardMaterial({ color: '#c9a577', roughness: 0.9, metalness: 0 });
  private placements: Placement[] = [];
  private readonly images = inject(ImageCache);
  private readonly glass = new MeshStandardMaterial({ roughness: 0.12, metalness: 0, envMapIntensity: 1.3 });
  private readonly foil = new MeshStandardMaterial({ roughness: 0.4, metalness: 0.6 });
  private readonly atlasCanvas = document.createElement('canvas');
  private readonly atlas = new LabelAtlas();
  private readonly atlasTexture = new CanvasTexture(this.atlasCanvas);
  private readonly labelMaterial = new MeshStandardMaterial({ map: this.atlasTexture, roughness: 0.85, metalness: 0 });
  private readonly wood = new MeshStandardMaterial({ color: '#8b5e34', roughness: 0.8 });
  private readonly backWood = new MeshStandardMaterial({ color: '#5c3b21', roughness: 0.9 });
  private readonly hitMaterial = new MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  private readonly highlightMaterial = new MeshBasicMaterial({ color: '#e8c255' });

  /** Meshes of the current rack size; rebuilt when height or width change. */
  private built: { key: string; forms: Map<BottleForm, FormMeshes>; hits: InstancedMesh; highlight: Mesh; disposables: (BufferGeometry | Material)[]; objects: Mesh[] } | null = null;
  private environment?: Texture;
  /** Pull-out progress (0 = in the shelf, 1 = fully out) of every row that is not at rest. */
  private readonly pull = new Map<number, number>();
  private pullTarget: number | null = null;
  private currentRack: Rack | null = null;
  private animFrame = 0;
  private lastTick = 0;
  private disposed = false;
  private readonly reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly unit = new Vector3(1, 1, 1);
  private readonly axisX = new Vector3(1, 0, 0);
  private readonly axisZ = new Vector3(0, 0, 1);
  private readonly rollRotation = new Quaternion();
  private readonly matrix = new Matrix4();
  private pointerStart: { x: number; y: number; time: number } | null = null;
  /** Camera move in progress (to a bottle, to the next bottle, or back to the row view). */
  private cameraMove: { from: CameraPose; to: CameraPose; start: number; duration: number } | null = null;
  /** Row-view camera remembered while a bottle is focused. */
  private savedView: CameraPose | null = null;
  private focused = false;
  private minDistance = 1;
  private readonly raycaster = new Raycaster();
  /** True once the user rotated or zoomed; until then the camera follows size changes (e.g. the row panel). */
  private userMoved = false;

  constructor() {
    this.atlasCanvas.width = this.atlasCanvas.height = ATLAS_SIZE;
    this.atlasTexture.colorSpace = SRGBColorSpace;
    this.atlasTexture.anisotropy = 4;
    this.paintNeutralLabel();
    this.patchLabelShader();

    afterNextRender(() => this.init());

    effect(() => {
      const rack = this.rack();
      const row = this.selectedRow();
      if (!this.ready()) return;
      this.sync(rack, row);
    });

    effect(() => {
      const rack = this.rack();
      const id = this.focusedSlot();
      if (!this.ready()) return;
      this.applyFocus(rack, id);
    });

    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  /** Back to the start view: the whole rack from the front. While a bottle is focused the page is asked to leave the focus first. */
  resetView(): void {
    if (!this.camera) return;
    if (this.focused) {
      this.savedView = null;
      this.viewReset.emit();
      return;
    }
    this.cameraMove = null;
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, 0, this.startDistance);
    this.controls.update();
    this.userMoved = false;
    this.requestRender();
  }

  // ----- Zooming onto a bottle -----

  private focusedId: string | null = null;

  private applyFocus(rack: Rack, id: string | null): void {
    const slot = id ? (rack.slots.find((s) => s.id === id) ?? null) : null;
    if (!slot) {
      if (this.focused) this.leaveFocus();
      return;
    }
    if (this.focused && this.focusedId === slot.id) return;
    const wasFocused = this.focused;
    if (!wasFocused) this.savedView = this.currentPose();
    this.focused = true;
    this.focusedId = slot.id;
    this.controls.enableRotate = false;
    this.controls.minDistance = 1.5;
    const { x, y } = this.cellCenter(rack, slot.row, slot.column);
    const scale = rackBottleScale(slot.wine.bottleSizeMl);
    const target = focusTarget(x, y, scale);
    this.moveCamera(
      {
        target: new Vector3(target.x, target.y, target.z),
        direction: new Vector3(0, 0, 1),
        distance: focusDistance(this.camera.fov, scale, FOCUS_INSET),
        inset: FOCUS_INSET,
      },
      wasFocused ? NEIGHBOR_DURATION_MS : FOCUS_DURATION_MS,
    );
  }

  private leaveFocus(): void {
    this.focused = false;
    this.focusedId = null;
    this.controls.enableRotate = true;
    this.controls.minDistance = this.minDistance;
    const back = this.savedView ?? {
      target: new Vector3(0, 0, 0),
      direction: new Vector3(0, 0, 1),
      distance: this.startDistance,
      inset: 0,
    };
    this.savedView = null;
    this.moveCamera(back, FOCUS_DURATION_MS);
  }

  private currentPose(): CameraPose {
    const target = this.controls.target.clone();
    const offset = this.camera.position.clone().sub(target);
    const distance = offset.length();
    return { target, direction: distance > 0 ? offset.divideScalar(distance) : new Vector3(0, 0, 1), distance, inset: this.currentInset };
  }

  private currentInset = 0;

  /** Moves the camera to a pose, smoothly (or at once with reduced motion). */
  private moveCamera(to: CameraPose, duration: number): void {
    if (this.reducedMotion || duration <= 0) {
      this.cameraMove = null;
      this.applyPose(to);
      return;
    }
    this.cameraMove = { from: this.currentPose(), to, start: performance.now(), duration };
    this.startAnimation();
  }

  private applyPose(pose: CameraPose): void {
    this.camera.position.copy(pose.direction).multiplyScalar(pose.distance).add(pose.target);
    this.controls.target.copy(pose.target);
    this.currentInset = pose.inset;
    this.updateViewOffset();
    this.controls.update();
    this.requestRender();
  }

  /** Shifts the picture up so that its centre lies in the free part of the view above the description sheet. */
  private updateViewOffset(): void {
    const { clientWidth: w, clientHeight: h } = this.host.nativeElement;
    if (this.currentInset > 0.001 && w > 0 && h > 0) {
      this.camera.setViewOffset(w, h, 0, Math.round((h * this.currentInset) / 2), w, h);
    } else if (this.camera.view?.enabled) {
      this.camera.clearViewOffset();
    }
  }

  /** Advances the camera move by the time `now`; true while it is still running. */
  private stepCamera(now: number): boolean {
    const move = this.cameraMove;
    if (!move) return false;
    const t = Math.min(1, (now - move.start) / move.duration);
    const e = easeOutCubic(t);
    this.applyPose({
      target: move.from.target.clone().lerp(move.to.target, e),
      direction: move.from.direction.clone().lerp(move.to.direction, e).normalize(),
      distance: move.from.distance + (move.to.distance - move.from.distance) * e,
      inset: move.from.inset + (move.to.inset - move.from.inset) * e,
    });
    if (t >= 1) this.cameraMove = null;
    return t < 1;
  }

  /** The pulled-out bottle of the selected row under the pointer ray, if any (boxes around the upright bottles). */
  private hitBottle(): RackSlot | null {
    const row = this.pullTarget;
    if (row === null || (this.pull.get(row) ?? 0) < 1) return null;
    const rack = this.rack();
    const box = new Box3();
    const point = new Vector3();
    let best: RackSlot | null = null;
    let bestDistance = Infinity;
    for (const slot of rack.slots) {
      if (slot.row !== row) continue;
      const { x, y } = this.cellCenter(rack, slot.row, slot.column);
      const scale = rackBottleScale(slot.wine.bottleSizeMl);
      const halfWidth = (BOTTLE_HIT_WIDTH * scale) / 2;
      const halfHeight = (BOTTLE_LENGTH * scale) / 2;
      const centerY = y + UPRIGHT_LIFT * scale;
      box.min.set(x - halfWidth, centerY - halfHeight, PULL_DISTANCE - halfWidth);
      box.max.set(x + halfWidth, centerY + halfHeight, PULL_DISTANCE + halfWidth);
      if (!this.raycaster.ray.intersectBox(box, point)) continue;
      const distance = point.distanceToSquared(this.raycaster.ray.origin);
      if (distance < bestDistance) {
        best = slot;
        bestDistance = distance;
      }
    }
    return best;
  }

  private init(): void {
    const canvas = this.canvas().nativeElement;
    try {
      this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      this.contextLost.emit();
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

    this.camera = new PerspectiveCamera(35, 1, 0.1, 1000);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = false;
    this.controls.minAzimuthAngle = -MAX_AZIMUTH;
    this.controls.maxAzimuthAngle = MAX_AZIMUTH;
    this.controls.minPolarAngle = Math.PI / 2 - MAX_TILT;
    this.controls.maxPolarAngle = Math.PI / 2 + MAX_TILT;
    this.controls.addEventListener('change', () => this.requestRender());
    // Only real rotating or zooming counts as "moved", not a plain tap (which also fires start/end).
    let interacting = false;
    this.controls.addEventListener('start', () => (interacting = true));
    this.controls.addEventListener('end', () => (interacting = false));
    this.controls.addEventListener('change', () => {
      if (interacting) this.userMoved = true;
    });

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('webglcontextlost', this.onContextLost);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.host.nativeElement);
    this.resize();
    this.ready.set(true);
  }

  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.contextLost.emit();
  };

  private readonly onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary) {
      this.pointerStart = null; // a second finger (pinch) is no tap and no swipe
      return;
    }
    this.pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() };
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const start = this.pointerStart;
    this.pointerStart = null;
    if (!start || !this.built || !event.isPrimary) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    // A quick horizontal swipe moves to the neighbouring bottle while one is focused.
    if (this.focused && Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > 1.5 * Math.abs(dy) && performance.now() - start.time <= SWIPE_MAX_MS) {
      this.swipe.emit(dx < 0 ? 'next' : 'prev');
      return;
    }
    if (Math.hypot(dx, dy) > TAP_TOLERANCE) return;

    const rect = this.canvas().nativeElement.getBoundingClientRect();
    const pointer = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const bottle = this.hitBottle();
    if (bottle) {
      this.bottleTapped.emit(bottle);
      return;
    }
    const hit = this.raycaster.intersectObject(this.built.hits, false)[0];
    if (hit?.instanceId === undefined) {
      if (this.focused) this.emptyTapped.emit();
      return;
    }
    const row = cellFromIndex(hit.instanceId, this.rack().width).row;
    if (this.focused && row === this.pullTarget) this.emptyTapped.emit();
    else this.rowSelected.emit(row);
  };

  private resize(): void {
    const { clientWidth, clientHeight } = this.host.nativeElement;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.updateViewOffset();
    if (this.built) this.fitCamera(this.rack(), !this.userMoved);
    this.requestRender();
  }

  /** Distance at which the whole front of the rack fits into the view. */
  private fitCamera(rack: Rack, moveCamera: boolean): void {
    const halfFov = ((this.camera.fov / 2) * Math.PI) / 180;
    // Room above and below: bottles of the top/bottom row stand up beyond the rack when their row is selected.
    const height = rack.height * CELL + BOARD + 2 * PULL_OVERHANG;
    const width = rack.width * CELL + BOARD;
    const byHeight = height / 2 / Math.tan(halfFov);
    const byWidth = width / 2 / (Math.tan(halfFov) * this.camera.aspect);
    this.startDistance = Math.max(byHeight, byWidth) * 1.1 + DEPTH / 2;
    this.minDistance = Math.max(DEPTH, this.startDistance * 0.2);
    this.controls.minDistance = this.focused ? 1.5 : this.minDistance;
    this.controls.maxDistance = this.startDistance * 1.6;
    if (moveCamera && !this.focused) this.resetView();
  }

  /** Rebuilds the frame when the size changed, then places bottles, labels and the row highlight. */
  private sync(rack: Rack, selectedRow: number | null): void {
    const key = `${rack.id}:${rack.height}x${rack.width}`;
    if (this.built?.key !== key) {
      this.build(rack, key);
      this.fitCamera(rack, true);
      this.pull.clear();
    }
    const built = this.built!;
    this.currentRack = rack;

    // A row that is neither selected nor in motion is at rest; the selected row heads for 1.
    if (selectedRow !== null && !this.pull.has(selectedRow)) this.pull.set(selectedRow, 0);
    this.pullTarget = selectedRow;
    if (this.reducedMotion) {
      for (const row of [...this.pull.keys()]) this.pull.set(row, row === selectedRow ? 1 : 0);
    }

    const color = new Color();
    const counts = new Map<BottleForm, number>(FORMS.map((form) => [form, 0]));
    this.placements = rack.slots.map((slot) => {
      const form = resolveForm(slot.wine.bottleForm, slot.wine.type);
      const index = counts.get(form)!;
      counts.set(form, index + 1);
      return { form, index, scale: rackBottleScale(slot.wine.bottleSizeMl) };
    });
    rack.slots.forEach((slot, i) => {
      const { form, index } = this.placements[i];
      const meshes = built.forms.get(form)!;
      color.set(GLASS_BY_TYPE[slot.wine.type] ?? GLASS_BY_TYPE.Other);
      meshes.bottles.setColorAt(index, color);
      color.set(CAPSULE_BY_TYPE[slot.wine.type] ?? CAPSULE_BY_TYPE.Other);
      meshes.capsules.setColorAt(index, color);
      const { tile, isNew } = this.atlas.assign(slot.wine.labelImageId);
      (meshes.labelRects.array as Float32Array).set(LabelAtlas.uvRect(tile), index * 4);
      if (isNew) void this.loadLabel(slot.wine.labelImageId!, tile);
      this.placeSlot(rack, built, i, slot, this.pull.get(slot.row) ?? 0);
    });
    for (const [form, meshes] of built.forms) {
      for (const mesh of [meshes.bottles, meshes.capsules, meshes.labels, ...meshes.extras]) {
        mesh.count = counts.get(form)!;
        mesh.instanceMatrix.needsUpdate = true;
      }
      meshes.labelRects.needsUpdate = true;
      if (meshes.bottles.instanceColor) meshes.bottles.instanceColor.needsUpdate = true;
      if (meshes.capsules.instanceColor) meshes.capsules.instanceColor.needsUpdate = true;
    }

    built.highlight.visible = selectedRow !== null;
    if (selectedRow !== null) {
      built.highlight.position.set(0, this.cellCenter(rack, selectedRow, 1).y, DEPTH / 2 + 0.04);
    }
    this.startAnimation();
    this.requestRender();
  }

  /** Writes the pose of one bottle (with capsule and label): lying in its slot, or pulled out, rolled and standing by `progress`. */
  private placeSlot(rack: Rack, built: NonNullable<Rack3d['built']>, i: number, slot: RackSlot, progress: number): void {
    const { x, y } = this.cellCenter(rack, slot.row, slot.column);
    const pose = slidePose(progress);
    const { form, index, scale } = this.placements[i];
    // The bottle is scaled around its middle: it rests on the board with its own (scaled) radius.
    const lyingY = y - CELL / 2 + BOARD / 2 + formBodyRadius(form) * scale;
    const standingY = y + UPRIGHT_LIFT * scale;
    const stood = pose.pitch / PULL_PITCH;
    this.position.set(x, lyingY + (standingY - lyingY) * stood, pose.z);
    // First roll around the long axis (label from top to bottom), then stand up: Rx(-pitch) · Rz(roll).
    this.rollRotation.setFromAxisAngle(this.axisZ, pose.roll);
    this.rotation.setFromAxisAngle(this.axisX, -pose.pitch).multiply(this.rollRotation);
    this.matrix.compose(this.position, this.rotation, this.unit.setScalar(scale));
    const meshes = built.forms.get(form)!;
    meshes.bottles.setMatrixAt(index, this.matrix);
    meshes.capsules.setMatrixAt(index, this.matrix);
    meshes.labels.setMatrixAt(index, this.matrix);
    for (const extra of meshes.extras) extra.setMatrixAt(index, this.matrix);
  }

  /** Runs only while a row is moving; the scene is otherwise rendered on demand. */
  private startAnimation(): void {
    if (this.disposed) return;
    if (!this.needsAnimation()) {
      if (this.pull.size > 0) this.applyPull();
      return;
    }
    if (this.animFrame) return;
    this.lastTick = performance.now();
    this.animFrame = requestAnimationFrame(this.tick);
  }

  private needsAnimation(): boolean {
    if (this.cameraMove) return true;
    for (const [row, value] of this.pull) {
      if (value !== (row === this.pullTarget ? 1 : 0)) return true;
    }
    return false;
  }

  private readonly tick = (now: number) => {
    this.animFrame = 0;
    if (this.disposed) return;
    const step = Math.min(0.1, (now - this.lastTick) / PULL_DURATION_MS);
    this.lastTick = now;
    for (const [row, value] of this.pull) {
      const target = row === this.pullTarget ? 1 : 0;
      this.pull.set(row, value < target ? Math.min(target, value + step) : Math.max(target, value - step));
    }
    this.applyPull();
    this.stepCamera(now);
    if (this.needsAnimation()) this.animFrame = requestAnimationFrame(this.tick);
  };

  /** Rewrites the matrices of the rows in motion and drops rows that are back at rest. */
  private applyPull(): void {
    const rack = this.currentRack;
    const built = this.built;
    if (!rack || !built) return;
    rack.slots.forEach((slot, i) => {
      const progress = this.pull.get(slot.row);
      if (progress !== undefined) this.placeSlot(rack, built, i, slot, progress);
    });
    for (const meshes of built.forms.values()) {
      for (const mesh of [meshes.bottles, meshes.capsules, meshes.labels, ...meshes.extras]) mesh.instanceMatrix.needsUpdate = true;
    }
    for (const [row, value] of this.pull) {
      if (value === 0 && row !== this.pullTarget) this.pull.delete(row);
    }
    this.requestRender();
  }

  // ----- Labels -----

  private paintNeutralLabel(): void {
    const g = this.atlasCanvas.getContext('2d')!;
    const r = LabelAtlas.rect(0);
    g.fillStyle = '#efe6d2';
    g.fillRect(r.x, r.y, r.width, r.height);
    g.strokeStyle = '#b9a77f';
    g.lineWidth = 3;
    g.strokeRect(r.x + 8, r.y + 8, r.width - 16, r.height - 16);
    // Every other tile starts out as the neutral label until its image has loaded.
    for (let tile = 1; tile < TILE_COUNT; tile++) {
      const t = LabelAtlas.rect(tile);
      g.drawImage(this.atlasCanvas, r.x, r.y, r.width, r.height, t.x, t.y, t.width, t.height);
    }
    this.atlasTexture.needsUpdate = true;
  }

  private async loadLabel(imageId: string, tile: number): Promise<void> {
    try {
      const url = await this.images.url(imageId);
      const image = new Image();
      image.src = url;
      await image.decode();
      if (this.disposed) return;
      const r = LabelAtlas.rect(tile);
      this.atlasCanvas.getContext('2d')!.drawImage(image, r.x, r.y, r.width, r.height);
      this.atlasTexture.needsUpdate = true;
      this.requestRender();
    } catch {
      // The tile keeps the neutral label.
    }
  }

  /** Per-instance atlas rectangle (attribute `labelRect`) applied to the label's own UVs. */
  private patchLabelShader(): void {
    this.labelMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 labelRect;')
        .replace(
          '#include <uv_vertex>',
          '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = labelRect.xy + uv * labelRect.zw;\n#endif',
        );
    };
  }

  private cellCenter(rack: Rack, row: number, column: number): { x: number; y: number } {
    return {
      x: (column - 1 - (rack.width - 1) / 2) * CELL,
      y: ((rack.height - 1) / 2 - (row - 1)) * CELL,
    };
  }

  private build(rack: Rack, key: string): void {
    this.clearBuilt();
    const capacity = rack.height * rack.width;
    const width = rack.width * CELL;
    const height = rack.height * CELL;
    const matrix = new Matrix4();
    const disposables: (BufferGeometry | Material)[] = [];
    const objects: Mesh[] = [];

    // Shelf boards (one above and below every row) and side walls/dividers between columns.
    const shelfGeometry = new BoxGeometry(width + BOARD, BOARD, DEPTH);
    const shelves = new InstancedMesh(shelfGeometry, this.wood, rack.height + 1);
    for (let i = 0; i <= rack.height; i++) {
      shelves.setMatrixAt(i, matrix.makeTranslation(0, height / 2 - i * CELL, 0));
    }
    const dividerGeometry = new BoxGeometry(BOARD, height + BOARD, DEPTH);
    const dividers = new InstancedMesh(dividerGeometry, this.wood, rack.width + 1);
    for (let i = 0; i <= rack.width; i++) {
      dividers.setMatrixAt(i, matrix.makeTranslation(-width / 2 + i * CELL, 0, 0));
    }
    const backGeometry = new BoxGeometry(width + BOARD, height + BOARD, 0.04);
    const back = new Mesh(backGeometry, this.backWood);
    back.position.z = -DEPTH / 2;

    // Invisible box per slot: the tap target, also for free slots. Instance index = cellIndex(row, column).
    const hitGeometry = new BoxGeometry(CELL, CELL, DEPTH);
    const hits = new InstancedMesh(hitGeometry, this.hitMaterial, capacity);
    for (let row = 1; row <= rack.height; row++) {
      for (let column = 1; column <= rack.width; column++) {
        const { x, y } = this.cellCenter(rack, row, column);
        hits.setMatrixAt(cellIndex(row, column, rack.width), matrix.makeTranslation(x, y, 0));
      }
    }
    hits.computeBoundingSphere();

    // One set of meshes per bottle form, each with room for every slot (a rack may hold only one form).
    const forms = new Map<BottleForm, FormMeshes>();
    const bottleMeshes: Mesh[] = [];
    for (const form of FORMS) {
      const geometries = this.formGeometries.get(form)!;
      const bottles = new InstancedMesh(geometries.bottle, this.glass, capacity);
      bottles.setColorAt(0, new Color('#ffffff'));
      const capsules = new InstancedMesh(geometries.capsule, this.foil, capacity);
      capsules.setColorAt(0, new Color('#ffffff'));
      const labels = new InstancedMesh(geometries.label, this.labelMaterial, capacity);
      const labelRects = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
      geometries.label.setAttribute('labelRect', labelRects);
      // Instances move when a row is pulled out, so the bounding spheres computed from the first pose would be wrong.
      const extras: InstancedMesh[] = [];
      if (geometries.wire) extras.push(new InstancedMesh(geometries.wire, this.wireMaterial, capacity));
      if (geometries.cork) extras.push(new InstancedMesh(geometries.cork, this.corkMaterial, capacity));
      for (const mesh of [bottles, capsules, labels, ...extras]) {
        mesh.frustumCulled = false;
        mesh.count = 0;
      }
      forms.set(form, { bottles, capsules, labels, extras, labelRects });
      bottleMeshes.push(bottles, labels, capsules, ...extras);
    }

    // Row highlight: a gold frame around the front of the row (does not tint the bottles).
    const bar = 0.07;
    const highlightGeometry = new BoxGeometry(1, 1, 1);
    const highlight = new InstancedMesh(highlightGeometry, this.highlightMaterial, 4);
    const frame: [number, number, number, number][] = [
      [0, CELL / 2, width + 2 * bar, bar],
      [0, -CELL / 2, width + 2 * bar, bar],
      [-width / 2, 0, bar, CELL],
      [width / 2, 0, bar, CELL],
    ];
    frame.forEach(([x, y, sx, sy], i) =>
      highlight.setMatrixAt(i, new Matrix4().makeTranslation(x, y, 0).multiply(new Matrix4().makeScale(sx, sy, bar))),
    );
    highlight.visible = false;

    for (const object of [shelves, dividers, back, hits, ...bottleMeshes, highlight]) {
      this.scene.add(object);
      objects.push(object);
    }
    disposables.push(shelfGeometry, dividerGeometry, backGeometry, hitGeometry, highlightGeometry);
    this.built = { key, forms, hits, highlight, disposables, objects };
  }

  private clearBuilt(): void {
    if (!this.built) return;
    for (const object of this.built.objects) {
      this.scene.remove(object);
      if (object instanceof InstancedMesh) object.dispose();
    }
    for (const item of this.built.disposables) item.dispose();
    this.built = null;
  }

  /** Renders on demand (camera, selection or data changed), not in a loop. */
  private requestRender(): void {
    if (this.frame || !this.renderer) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.renderer.render(this.scene, this.camera);
    });
  }

  private dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    cancelAnimationFrame(this.animFrame);
    this.observer?.disconnect();
    if (!this.renderer) return;
    const canvas = this.canvas().nativeElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.controls.dispose();
    this.clearBuilt();
    for (const geometries of this.formGeometries.values()) {
      geometries.bottle.dispose();
      geometries.capsule.dispose();
      geometries.label.dispose();
      geometries.wire?.dispose();
      geometries.cork?.dispose();
    }
    for (const item of [this.glass, this.foil, this.wireMaterial, this.corkMaterial, this.labelMaterial, this.atlasTexture, this.wood, this.backWood, this.hitMaterial, this.highlightMaterial]) {
      item.dispose();
    }
    this.environment?.dispose();
    this.renderer.dispose();
  }
}
