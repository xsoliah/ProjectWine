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
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  HemisphereLight,
  InstancedMesh,
  LatheGeometry,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Rack, WineType } from '../core/models';
import { cellFromIndex, cellIndex } from '../core/racks';
import { Icon } from './icon';

/** One slot is 1 x 1 unit; a Bordeaux bottle is about 4 times as long as it is wide. */
const CELL = 1;
const DEPTH = 3.2;
const BOARD = 0.06;
const BOTTLE_RADIUS = 0.36;
const BOTTLE_LENGTH = 2.9;
/** Pointer movement (px) up to which a press counts as a tap, not as rotating. */
const TAP_TOLERANCE = 6;
const MAX_AZIMUTH = (45 * Math.PI) / 180;
const MAX_TILT = (25 * Math.PI) / 180;

const TYPE_VARS: Record<WineType, string> = {
  Red: '--t-red',
  White: '--t-white',
  Rose: '--t-rose',
  Sparkling: '--t-sparkling',
  Dessert: '--t-dessert',
  Fortified: '--t-fortified',
  Other: '--t-other',
};

/**
 * Bordeaux bottle as a surface of revolution: straight body, high pronounced shoulders, short neck, lip.
 * Built along +Y with the base at 0, then turned so the neck points to the viewer (+Z) and centred.
 */
function bordeauxBottle(): BufferGeometry {
  const profile: [number, number][] = [
    [0, 0], [0.33, 0], [0.36, 0.03], [0.36, 1.85], [0.345, 1.98], [0.29, 2.1], [0.2, 2.19],
    [0.14, 2.26], [0.12, 2.36], [0.12, 2.78], [0.135, 2.8], [0.135, 2.88], [0.1, 2.9], [0, 2.9],
  ];
  const geometry = new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), 20);
  geometry.translate(0, -BOTTLE_LENGTH / 2, 0);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** Foil capsule over the neck. */
function capsule(): BufferGeometry {
  const geometry = new CylinderGeometry(0.128, 0.128, 0.5, 16);
  geometry.translate(0, 2.66 - BOTTLE_LENGTH / 2, 0);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** 3D view of one rack (WebGL via three.js). Tapping a bottle or slot selects its row. */
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

  private readonly bottleGeometry = bordeauxBottle();
  private readonly capsuleGeometry = capsule();
  private readonly glass = new MeshStandardMaterial({ roughness: 0.22, metalness: 0.15 });
  private readonly foil = new MeshStandardMaterial({ color: '#2a1f1a', roughness: 0.45, metalness: 0.5 });
  private readonly wood = new MeshStandardMaterial({ color: '#8b5e34', roughness: 0.8 });
  private readonly backWood = new MeshStandardMaterial({ color: '#5c3b21', roughness: 0.9 });
  private readonly hitMaterial = new MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  private readonly highlightMaterial = new MeshBasicMaterial({ color: '#e8c255' });

  /** Meshes of the current rack size; rebuilt when height or width change. */
  private built: { key: string; bottles: InstancedMesh; capsules: InstancedMesh; hits: InstancedMesh; highlight: Mesh; disposables: (BufferGeometry | Material)[]; objects: Mesh[] } | null = null;
  private typeColors = new Map<WineType, Color>();
  private pointerStart: { x: number; y: number } | null = null;
  private readonly raycaster = new Raycaster();
  /** True once the user rotated or zoomed; until then the camera follows size changes (e.g. the row panel). */
  private userMoved = false;

  constructor() {
    afterNextRender(() => this.init());

    effect(() => {
      const rack = this.rack();
      const row = this.selectedRow();
      if (!this.ready()) return;
      this.sync(rack, row);
    });

    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  /** Back to the start view: the whole rack from the front. */
  resetView(): void {
    if (!this.camera) return;
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, 0, this.startDistance);
    this.controls.update();
    this.userMoved = false;
    this.requestRender();
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
    this.scene.add(new HemisphereLight(0xfff4e0, 0x3a2a20, 1.4));
    const sun = new DirectionalLight(0xffffff, 1.8);
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

    this.readTypeColors();
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
    this.pointerStart = { x: event.clientX, y: event.clientY };
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const start = this.pointerStart;
    this.pointerStart = null;
    if (!start || !this.built) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_TOLERANCE) return;

    const rect = this.canvas().nativeElement.getBoundingClientRect();
    const pointer = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.built.hits, false)[0];
    if (hit?.instanceId === undefined) return;
    this.rowSelected.emit(cellFromIndex(hit.instanceId, this.rack().width).row);
  };

  private resize(): void {
    const { clientWidth, clientHeight } = this.host.nativeElement;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    if (this.built) this.fitCamera(this.rack(), !this.userMoved);
    this.requestRender();
  }

  /** Distance at which the whole front of the rack fits into the view. */
  private fitCamera(rack: Rack, moveCamera: boolean): void {
    const halfFov = ((this.camera.fov / 2) * Math.PI) / 180;
    const height = rack.height * CELL + BOARD;
    const width = rack.width * CELL + BOARD;
    const byHeight = height / 2 / Math.tan(halfFov);
    const byWidth = width / 2 / (Math.tan(halfFov) * this.camera.aspect);
    this.startDistance = Math.max(byHeight, byWidth) * 1.1 + DEPTH / 2;
    this.controls.minDistance = Math.max(DEPTH, this.startDistance * 0.2);
    this.controls.maxDistance = this.startDistance * 1.6;
    if (moveCamera) this.resetView();
  }

  private readTypeColors(): void {
    const style = getComputedStyle(document.documentElement);
    for (const [type, variable] of Object.entries(TYPE_VARS) as [WineType, string][]) {
      const value = style.getPropertyValue(variable).trim();
      this.typeColors.set(type, new Color(value || '#7b746d'));
    }
  }

  /** Rebuilds the frame when the size changed, then places bottles and the row highlight. */
  private sync(rack: Rack, selectedRow: number | null): void {
    const key = `${rack.id}:${rack.height}x${rack.width}`;
    if (this.built?.key !== key) {
      this.build(rack, key);
      this.fitCamera(rack, true);
    }
    const built = this.built!;
    const matrix = new Matrix4();
    const highlight = new Color('#ffffff');

    rack.slots.forEach((slot, i) => {
      const { x, y } = this.cellCenter(rack, slot.row, slot.column);
      matrix.makeTranslation(x, y - CELL / 2 + BOARD / 2 + BOTTLE_RADIUS, 0);
      built.bottles.setMatrixAt(i, matrix);
      built.capsules.setMatrixAt(i, matrix);
      const color = (this.typeColors.get(slot.wine.type) ?? new Color('#7b746d')).clone();
      if (slot.row === selectedRow) color.lerp(highlight, 0.1);
      built.bottles.setColorAt(i, color);
    });
    built.bottles.count = rack.slots.length;
    built.capsules.count = rack.slots.length;
    built.bottles.instanceMatrix.needsUpdate = true;
    built.capsules.instanceMatrix.needsUpdate = true;
    if (built.bottles.instanceColor) built.bottles.instanceColor.needsUpdate = true;

    built.highlight.visible = selectedRow !== null;
    if (selectedRow !== null) {
      built.highlight.position.set(0, this.cellCenter(rack, selectedRow, 1).y, DEPTH / 2 + 0.04);
    }
    this.requestRender();
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

    const bottles = new InstancedMesh(this.bottleGeometry, this.glass, capacity);
    bottles.setColorAt(0, new Color('#ffffff'));
    const capsules = new InstancedMesh(this.capsuleGeometry, this.foil, capacity);

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

    for (const object of [shelves, dividers, back, hits, bottles, capsules, highlight]) {
      this.scene.add(object);
      objects.push(object);
    }
    disposables.push(shelfGeometry, dividerGeometry, backGeometry, hitGeometry, highlightGeometry);
    this.built = { key, bottles, capsules, hits, highlight, disposables, objects };
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
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    if (!this.renderer) return;
    const canvas = this.canvas().nativeElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.controls.dispose();
    this.clearBuilt();
    for (const item of [this.bottleGeometry, this.capsuleGeometry, this.glass, this.foil, this.wood, this.backWood, this.hitMaterial, this.highlightMaterial]) {
      item.dispose();
    }
    this.renderer.dispose();
  }
}
