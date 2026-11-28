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
  untracked,
  viewChild,
} from '@angular/core';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PMREMGenerator,
  PerspectiveCamera,
  Plane,
  Quaternion,
  PlaneGeometry,
  Raycaster,
  Scene,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CELL_CM,
  CellarRoom,
  DOOR_WIDTH_CM,
  RACK_DEPTH_CM,
  RackPlacement,
  Rect,
  RoomDoor,
  RoomRack,
  checkFit,
  doorHeight,
  footprint,
  projectToWall,
  snapPosition,
} from '../core/cellar-room';
import { Icon } from './icon';
import { GLASS_BY_TYPE } from './rack-3d-look';

/** Live state of a rack being dragged in the arrange mode. */
export interface DragInfo {
  id: string;
  x: number;
  z: number;
  valid: boolean;
  reason: string | null;
}

const IDENTITY = new Quaternion();
const CM = 0.01;
const CELL = CELL_CM * CM;
const BOARD = 0.02;
const BOTTLE_LENGTH = 0.3;
const BOTTLE_RADIUS = 0.037;
const WALL = 0.06;
const TAP_TOLERANCE = 6;
const FLY_MS = 450;
const COLOR_SELECTED = '#e8c255';
const COLOR_VALID = '#3f9d52';
const COLOR_INVALID = '#d64541';

interface RackNode {
  key: string;
  group: Group;
  hit: Mesh;
  instanced: InstancedMesh[];
}

interface Walls {
  meshes: { mesh: Mesh; outward: Vector3 }[];
  objects: Object3D[];
  disposables: (BufferGeometry | Material)[];
  key: string;
  /** The door leaf; dragged in the arrange mode. */
  doorLeaf: Mesh | null;
}

/** 3D view of the cellar room: floor, walls and all racks to scale. Racks can be selected and, in the arrange mode, dragged. */
@Component({
  selector: 'app-cellar-room-3d',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas #canvas aria-hidden="true"></canvas>
    <button type="button" class="btn btn-small reset" (click)="resetView()">
      <app-icon name="reset" /> Ansicht zurücksetzen
    </button>
    <p class="help muted" aria-hidden="true">
      {{ arrange() ? 'Regal ziehen zum Verschieben, sonst Ziehen zum Drehen und Mausrad zum Zoomen.' : 'Ziehen zum Drehen, Mausrad oder Zwei-Finger-Geste zum Zoomen, Tippen wählt ein Regal.' }}
    </p>
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
export class CellarRoom3d {
  readonly room = input.required<CellarRoom>();
  readonly selectedId = input<string | null>(null);
  readonly arrange = input(false);
  /** A rack was tapped (id) or the empty floor (null). */
  readonly rackTapped = output<string | null>();
  /** A rack was dropped on a valid spot. */
  readonly rackMoved = output<{ id: string; placement: RackPlacement }>();
  /** The door was dropped on a wall (always a valid spot). */
  readonly doorMoved = output<RoomDoor>();
  readonly dragChange = output<DragInfo | null>();
  /** WebGL is unavailable or was lost: the page switches to the list. */
  readonly contextLost = output<void>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly ready = signal(false);

  private renderer!: WebGLRenderer;
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private controls!: OrbitControls;
  private observer?: ResizeObserver;
  private environment?: Texture;
  private frame = 0;
  private flyFrame = 0;
  private disposed = false;
  private cameraPlaced = false;
  private instant = false;
  private readonly reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  private readonly boxGeometry = new BoxGeometry(1, 1, 1);
  private readonly bottleGeometry = new CylinderGeometry(BOTTLE_RADIUS, BOTTLE_RADIUS, BOTTLE_LENGTH, 14).rotateX(Math.PI / 2);
  private readonly wood = new MeshStandardMaterial({ color: '#8b5e34', roughness: 0.8 });
  private readonly backWood = new MeshStandardMaterial({ color: '#7a5230', roughness: 0.9 });
  private readonly glass = new MeshStandardMaterial({ roughness: 0.25, metalness: 0, envMapIntensity: 1.2 });
  private readonly podiumMaterial = new MeshStandardMaterial({ color: '#8f8c86', roughness: 0.9 });
  private readonly hitMaterial =new MeshBasicMaterial({ visible: false });
  private readonly outlineMaterial = new LineBasicMaterial({ color: COLOR_SELECTED });
  private readonly decalMaterial = new MeshBasicMaterial({ color: COLOR_SELECTED, transparent: true, opacity: 0.45, depthWrite: false });
  private readonly decalGeometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private outline: LineSegments | null = null;
  private decal: Mesh | null = null;

  private walls: Walls | null = null;
  private readonly nodes = new Map<string, RackNode>();
  private roomSize = { widthCm: 400, depthCm: 300, heightCm: 250 };

  private readonly raycaster = new Raycaster();
  private readonly floorPlane = new Plane(new Vector3(0, 1, 0), 0);
  private pointerStart: { x: number; y: number } | null = null;
  private drag: { id: string; offsetX: number; offsetZ: number; moved: boolean; last: DragInfo | null } | null = null;
  private doorDrag: { moved: boolean; last: RoomDoor | null } | null = null;
  /** The door while it is being dragged (shown instead of the stored one). */
  private previewDoor: RoomDoor | null = null;
  private startDistance = 8;

  constructor() {
    afterNextRender(() => this.init());

    effect(() => {
      const room = this.room();
      const selected = this.selectedId();
      this.arrange();
      if (!this.ready()) return;
      untracked(() => this.sync(room, selected));
    });

    // Fly to a newly selected rack when just looking around (not while arranging).
    let lastFocus: string | null = null;
    effect(() => {
      const id = this.selectedId();
      const arrange = this.arrange();
      if (!this.ready()) return;
      untracked(() => {
        if (id !== null && id !== lastFocus && !arrange) this.focusRack(id);
        lastFocus = id;
      });
    });

    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  /** Back to the overview that shows the whole room. */
  resetView(): void {
    if (!this.camera) return;
    const { widthCm, depthCm, heightCm } = this.roomSize;
    const center = new Vector3((widthCm * CM) / 2, Math.min(heightCm * CM, 1.8) / 3, (depthCm * CM) / 2);
    const position = center.clone().add(new Vector3(0, this.startDistance * 0.62, this.startDistance * 0.78));
    this.flyTo(position, center);
  }

  /** Moves the camera in front of a rack, inside the room. */
  focusRack(id: string): void {
    const rack = this.room().racks.find((r) => r.id === id);
    if (!rack?.placement || !this.camera) return;
    const rect = footprint(rack, rack.placement);
    const height = rack.height * CELL;
    const lift = (rack.placement.elevationCm ?? 0) * CM;
    const target = new Vector3((rect.x + rect.w / 2) * CM, lift + height / 2, (rect.z + rect.d / 2) * CM);
    const front = new Vector3(0, 0, 1).applyAxisAngle(new Vector3(0, 1, 0), -rack.placement.rotation * (Math.PI / 2));
    const halfFov = ((this.camera.fov / 2) * Math.PI) / 180;
    const fitHeight = height / 2 / Math.tan(halfFov);
    const fitWidth = (rack.width * CELL) / 2 / (Math.tan(halfFov) * this.camera.aspect);
    const distance = Math.max(fitHeight, fitWidth) * 1.25 + (RACK_DEPTH_CM * CM) / 2 + 0.3;
    const position = target.clone().addScaledVector(front, distance).add(new Vector3(0, height * 0.35, 0));
    const { widthCm, depthCm, heightCm } = this.roomSize;
    position.x = Math.min(Math.max(position.x, 0.2), widthCm * CM - 0.2);
    position.z = Math.min(Math.max(position.z, 0.2), depthCm * CM - 0.2);
    position.y = Math.min(Math.max(position.y, 0.3), heightCm * CM - 0.1);
    this.flyTo(position, target);
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
    const env = new RoomEnvironment();
    this.environment = pmrem.fromScene(env, 0.04).texture;
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.5;
    env.dispose();
    pmrem.dispose();
    this.scene.add(new HemisphereLight(0xfff4e0, 0x3a2a20, 0.4));
    const sun = new DirectionalLight(0xffffff, 0.9);
    sun.position.set(3, 6, 5);
    this.scene.add(sun);

    this.camera = new PerspectiveCamera(40, 1, 0.05, 200);
    // Registered before OrbitControls so that a rack drag can switch the camera controls off first.
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('webglcontextlost', this.onContextLost);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = false;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.controls.addEventListener('change', () => {
      this.updateWalls();
      this.requestRender();
    });

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.host.nativeElement);
    this.resize();
    this.ready.set(true);
  }

  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.contextLost.emit();
  };

  // ----- Scene building -----

  private sync(room: CellarRoom, selectedId: string | null): void {
    const sizeChanged =
      room.widthCm !== this.roomSize.widthCm || room.depthCm !== this.roomSize.depthCm || room.heightCm !== this.roomSize.heightCm;
    this.roomSize = { widthCm: room.widthCm, depthCm: room.depthCm, heightCm: room.heightCm };
    if (!this.walls || this.walls.key !== this.wallKey(room, room.door ?? null)) this.buildWalls(room);

    const alive = new Set<string>();
    for (const rack of room.racks) {
      if (!rack.placement) continue;
      alive.add(rack.id);
      const key = `${rack.height}x${rack.width}x${rack.placement.elevationCm ?? 0}|${rack.slots.map((s) => `${s.row},${s.column},${s.type}`).join(';')}`;
      let node = this.nodes.get(rack.id);
      if (node?.key !== key) {
        if (node) this.removeNode(rack.id);
        node = this.buildNode(rack, key);
        this.nodes.set(rack.id, node);
        this.scene.add(node.group);
      }
      this.positionNode(node, footprint(rack, rack.placement), rack.placement.rotation, rack.placement.elevationCm ?? 0);
    }
    for (const id of [...this.nodes.keys()]) if (!alive.has(id)) this.removeNode(id);

    this.showOutline(selectedId, COLOR_SELECTED);
    if (sizeChanged || !this.cameraPlaced) this.fitCamera(true);
    this.updateWalls();
    this.requestRender();
  }

  private wallKey(room: CellarRoom, door: RoomDoor | null): string {
    return `${room.widthCm}x${room.depthCm}x${room.heightCm}|${door ? `${door.wall}:${door.offsetCm}` : '-'}`;
  }

  private buildWalls(room: CellarRoom): void {
    this.clearWalls();
    const door = this.previewDoor ?? room.door ?? null;
    const w = room.widthCm * CM;
    const d = room.depthCm * CM;
    const h = room.heightCm * CM;
    const disposables: (BufferGeometry | Material)[] = [];
    const objects: Object3D[] = [];
    const meshes: { mesh: Mesh; outward: Vector3 }[] = [];
    let doorLeaf: Mesh | null = null;

    const floorGeometry = new PlaneGeometry(w, d).rotateX(-Math.PI / 2);
    const floor = new Mesh(floorGeometry, new MeshStandardMaterial({ color: '#a39679', roughness: 0.95 }));
    floor.position.set(w / 2, 0, d / 2);
    objects.push(floor);
    disposables.push(floorGeometry, floor.material as Material);

    // Grid every 50 cm helps judging distances.
    const points: number[] = [];
    for (let x = 0.5; x < w; x += 0.5) points.push(x, 0.002, 0, x, 0.002, d);
    for (let z = 0.5; z < d; z += 0.5) points.push(0, 0.002, z, w, 0.002, z);
    const gridGeometry = new BufferGeometry();
    gridGeometry.setAttribute('position', new Float32BufferAttribute(points, 3));
    const gridMaterial = new LineBasicMaterial({ color: '#7f735c', transparent: true, opacity: 0.5 });
    objects.push(new LineSegments(gridGeometry, gridMaterial));
    disposables.push(gridGeometry, gridMaterial);

    // Walls in the order of the door wall index: 0 back, 1 right, 2 front, 3 left.
    // `lo`/`hi` span the wall along its axis (x for back/front, z for left/right).
    const wallSpecs = [
      { axis: 'x', fixed: -WALL / 2, lo: -WALL, hi: w + WALL, outward: new Vector3(0, 0, -1) },
      { axis: 'z', fixed: w + WALL / 2, lo: 0, hi: d, outward: new Vector3(1, 0, 0) },
      { axis: 'x', fixed: d + WALL / 2, lo: -WALL, hi: w + WALL, outward: new Vector3(0, 0, 1) },
      { axis: 'z', fixed: -WALL / 2, lo: 0, hi: d, outward: new Vector3(-1, 0, 0) },
    ];
    const material = (color: string, roughness: number) => {
      const m = new MeshStandardMaterial({ color, roughness, transparent: true });
      disposables.push(m);
      return m;
    };
    wallSpecs.forEach((spec, wall) => {
      const wallMaterial = material('#ddd5c6', 0.9);
      // A box piece of the wall: along its axis from `from` to `to`, in height from `y0` to `y1`.
      const piece = (from: number, to: number, y0: number, y1: number, m: Material, thickness = WALL): Mesh | null => {
        if (to - from <= 0.001 || y1 - y0 <= 0.001) return null;
        const mesh = new Mesh(this.boxGeometry, m);
        const along = (from + to) / 2;
        if (spec.axis === 'x') {
          mesh.scale.set(to - from, y1 - y0, thickness);
          mesh.position.set(along, (y0 + y1) / 2, spec.fixed);
        } else {
          mesh.scale.set(thickness, y1 - y0, to - from);
          mesh.position.set(spec.fixed, (y0 + y1) / 2, along);
        }
        objects.push(mesh);
        meshes.push({ mesh, outward: spec.outward });
        return mesh;
      };
      if (door?.wall !== wall) {
        piece(spec.lo, spec.hi, 0, h, wallMaterial);
        return;
      }
      const a = door.offsetCm * CM;
      const b = a + DOOR_WIDTH_CM * CM;
      const top = doorHeight(room.heightCm) * CM;
      const jamb = 0.05;
      const frameMaterial = material('#c9b79a', 0.7);
      const leafMaterial = material('#3f6f8f', 0.6);
      const handleMaterial = material('#d9c27a', 0.4);
      piece(spec.lo, a, 0, h, wallMaterial);
      piece(b, spec.hi, 0, h, wallMaterial);
      piece(a, b, top, h, wallMaterial);
      piece(a, a + jamb, 0, top, frameMaterial);
      piece(b - jamb, b, 0, top, frameMaterial);
      piece(a + jamb, b - jamb, top - jamb, top, frameMaterial);
      doorLeaf = piece(a + jamb, b - jamb, 0, top - jamb, leafMaterial, 0.035);
      piece(b - jamb - 0.12, b - jamb - 0.09, Math.min(1, top - 0.2), Math.min(1.08, top - 0.12), handleMaterial, WALL + 0.03);
    });
    for (const object of objects) this.scene.add(object);
    this.walls = { meshes, objects, disposables, key: this.wallKey(room, door), doorLeaf };
  }

  private clearWalls(): void {
    if (!this.walls) return;
    for (const object of this.walls.objects) this.scene.remove(object);
    for (const item of this.walls.disposables) item.dispose();
    this.walls = null;
  }

  private buildNode(rack: RoomRack, key: string): RackNode {
    const group = new Group();
    const w = rack.width * CELL;
    const h = rack.height * CELL;
    const d = RACK_DEPTH_CM * CM;
    const instanced: InstancedMesh[] = [];
    const matrix = new Matrix4();
    const scale = new Vector3();
    const position = new Vector3();

    const boards = new InstancedMesh(this.boxGeometry, this.wood, rack.height + 1 + rack.width + 1);
    let index = 0;
    for (let i = 0; i <= rack.height; i++) {
      matrix.compose(position.set(0, i * CELL + BOARD / 2, 0), IDENTITY, scale.set(w + BOARD, BOARD, d));
      boards.setMatrixAt(index++, matrix);
    }
    for (let j = 0; j <= rack.width; j++) {
      matrix.compose(position.set(-w / 2 + j * CELL, h / 2 + BOARD / 2, 0), IDENTITY, scale.set(BOARD, h, d));
      boards.setMatrixAt(index++, matrix);
    }
    instanced.push(boards);
    group.add(boards);

    const back = new Mesh(this.boxGeometry, this.backWood);
    back.scale.set(w, h, 0.01);
    back.position.set(0, h / 2 + BOARD / 2, -d / 2 + 0.005);
    group.add(back);

    if (rack.slots.length > 0) {
      const bottles = new InstancedMesh(this.bottleGeometry, this.glass, rack.slots.length);
      const color = new Color();
      rack.slots.forEach((slot, i) => {
        const x = -w / 2 + (slot.column - 0.5) * CELL;
        const y = (rack.height - slot.row + 0.5) * CELL + BOARD / 2;
        matrix.compose(position.set(x, y, d / 2 - BOTTLE_LENGTH / 2 - 0.015), IDENTITY, scale.set(1, 1, 1));
        bottles.setMatrixAt(i, matrix);
        bottles.setColorAt(i, color.set(GLASS_BY_TYPE[slot.type] ?? GLASS_BY_TYPE.Other));
      });
      instanced.push(bottles);
      group.add(bottles);
    }

    // A rack above the floor stands on a podium of exactly its floor area; the group origin is the rack's underside.
    const lift = (rack.placement?.elevationCm ?? 0) * CM;
    if (lift > 0) {
      const podium = new Mesh(this.boxGeometry, this.podiumMaterial);
      podium.scale.set(w + BOARD, lift, d);
      podium.position.set(0, -lift / 2, 0);
      group.add(podium);
    }

    const hit = new Mesh(this.boxGeometry, this.hitMaterial);
    hit.scale.set(w + BOARD, h + BOARD + lift, d);
    hit.position.set(0, (h + BOARD - lift) / 2, 0);
    hit.userData['rackId'] = rack.id;
    group.add(hit);

    return { key, group, hit, instanced };
  }

  private removeNode(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;
    this.scene.remove(node.group);
    for (const mesh of node.instanced) mesh.dispose();
    this.nodes.delete(id);
  }

  /** Places the rack group over the given floor area (cm), rotated like the placement. */
  private positionNode(node: RackNode, rect: Rect, rotation: number, elevationCm: number): void {
    node.group.position.set((rect.x + rect.w / 2) * CM, elevationCm * CM, (rect.z + rect.d / 2) * CM);
    node.group.rotation.y = -rotation * (Math.PI / 2);
  }

  private showOutline(id: string | null, color: string, rect?: Rect): void {
    if (this.outline) {
      this.scene.remove(this.outline);
      this.outline.geometry.dispose();
      this.outline = null;
    }
    if (this.decal) {
      this.scene.remove(this.decal);
      this.decal = null;
    }
    if (id === null) return;
    const rack = this.room().racks.find((r) => r.id === id);
    if (!rack?.placement) return;
    const box = rect ?? footprint(rack, rack.placement);
    const height = rack.height * CELL + BOARD;
    const edges = new EdgesGeometry(new BoxGeometry(box.w * CM + 0.04, height + 0.04, box.d * CM + 0.04));
    this.outlineMaterial.color.set(color);
    this.outline = new LineSegments(edges, this.outlineMaterial);
    const lift = (rack.placement.elevationCm ?? 0) * CM;
    this.outline.position.set((box.x + box.w / 2) * CM, lift + height / 2 + 0.02, (box.z + box.d / 2) * CM);
    this.scene.add(this.outline);

    this.decalMaterial.color.set(color);
    this.decal = new Mesh(this.decalGeometry, this.decalMaterial);
    this.decal.scale.set(box.w * CM, 1, box.d * CM);
    this.decal.position.set((box.x + box.w / 2) * CM, 0.004, (box.z + box.d / 2) * CM);
    this.scene.add(this.decal);
  }

  /** Walls between the camera and the middle of the room become see-through. */
  private updateWalls(): void {
    if (!this.walls || !this.camera) return;
    const { widthCm, depthCm } = this.roomSize;
    const fromCenter = this.camera.position.clone().sub(new Vector3((widthCm * CM) / 2, 0, (depthCm * CM) / 2));
    for (const { mesh, outward } of this.walls.meshes) {
      const material = mesh.material as MeshStandardMaterial;
      const facing = fromCenter.dot(outward) > 0;
      material.opacity = facing ? 0.1 : 1;
      material.depthWrite = !facing;
    }
  }

  // ----- Camera -----

  private fitCamera(move: boolean): void {
    const { widthCm, depthCm, heightCm } = this.roomSize;
    const radius = 0.5 * Math.hypot(widthCm * CM, depthCm * CM, Math.min(heightCm * CM, 2.5));
    const halfFov = ((this.camera.fov / 2) * Math.PI) / 180;
    const byHeight = radius / Math.sin(halfFov);
    const byWidth = radius / Math.sin(Math.atan(Math.tan(halfFov) * Math.max(this.camera.aspect, 0.2)));
    this.startDistance = Math.max(byHeight, byWidth) * 0.95;
    this.controls.minDistance = 0.8;
    this.controls.maxDistance = this.startDistance * 2.5;
    if (move) {
      this.cameraPlaced = true;
      this.instant = true;
      this.resetView();
      this.instant = false;
    }
  }

  private flyTo(position: Vector3, target: Vector3): void {
    cancelAnimationFrame(this.flyFrame);
    if (this.reducedMotion || this.instant) {
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      this.controls.update();
      this.requestRender();
      return;
    }
    const fromPosition = this.camera.position.clone();
    const fromTarget = this.controls.target.clone();
    const start = performance.now();
    const step = (now: number) => {
      if (this.disposed) return;
      const t = Math.min(1, (now - start) / FLY_MS);
      const e = t * t * (3 - 2 * t);
      this.camera.position.lerpVectors(fromPosition, position, e);
      this.controls.target.lerpVectors(fromTarget, target, e);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      if (t < 1) this.flyFrame = requestAnimationFrame(step);
    };
    this.flyFrame = requestAnimationFrame(step);
  }

  // ----- Pointer handling -----

  private pointerRay(event: PointerEvent): void {
    const rect = this.canvas().nativeElement.getBoundingClientRect();
    const pointer = new Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(pointer, this.camera);
  }

  private rackAt(event: PointerEvent): string | null {
    this.pointerRay(event);
    const hits = this.raycaster.intersectObjects([...this.nodes.values()].map((n) => n.hit), false);
    return (hits[0]?.object.userData['rackId'] as string | undefined) ?? null;
  }

  private floorPoint(event: PointerEvent): { x: number; z: number } | null {
    this.pointerRay(event);
    const point = this.raycaster.ray.intersectPlane(this.floorPlane, new Vector3());
    return point ? { x: point.x / CM, z: point.z / CM } : null;
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    this.pointerStart = { x: event.clientX, y: event.clientY };
    if (!this.arrange()) return;
    if (this.doorUnderPointer(event)) {
      this.doorDrag = { moved: false, last: null };
      this.captureDrag(event);
      return;
    }
    const id = this.rackAt(event);
    const rack = id ? this.room().racks.find((r) => r.id === id) : undefined;
    const point = this.floorPoint(event);
    if (!rack?.placement || !point) return;
    const rect = footprint(rack, rack.placement);
    this.drag = { id: rack.id, offsetX: point.x - rect.x, offsetZ: point.z - rect.z, moved: false, last: null };
    this.captureDrag(event);
  };

  private captureDrag(event: PointerEvent): void {
    this.controls.enabled = false;
    try {
      this.canvas().nativeElement.setPointerCapture(event.pointerId);
    } catch {
      // Capture is a convenience (moves outside the canvas); dragging works without it.
    }
  }

  /** Whether the pointer is on the door leaf and no rack is in front of it. */
  private doorUnderPointer(event: PointerEvent): boolean {
    const leaf = this.walls?.doorLeaf;
    if (!leaf) return false;
    this.pointerRay(event);
    const doorHit = this.raycaster.intersectObject(leaf, false)[0];
    if (!doorHit) return false;
    const rackHit = this.raycaster.intersectObjects([...this.nodes.values()].map((n) => n.hit), false)[0];
    return !rackHit || doorHit.distance < rackHit.distance;
  }

  private moveDoor(event: PointerEvent): void {
    const doorDrag = this.doorDrag;
    const start = this.pointerStart;
    if (!doorDrag || !start) return;
    if (!doorDrag.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= TAP_TOLERANCE) return;
    const point = this.floorPoint(event);
    if (!point) return;
    doorDrag.moved = true;
    const door = projectToWall(this.room(), point);
    if (doorDrag.last?.wall === door.wall && doorDrag.last.offsetCm === door.offsetCm) return;
    doorDrag.last = door;
    this.previewDoor = door;
    this.buildWalls(this.room());
    this.updateWalls();
    this.requestRender();
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    if (this.doorDrag) {
      this.moveDoor(event);
      return;
    }
    const drag = this.drag;
    const start = this.pointerStart;
    if (!drag || !start) return;
    if (!drag.moved && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= TAP_TOLERANCE) return;
    const point = this.floorPoint(event);
    const room = this.room();
    const rack = room.racks.find((r) => r.id === drag.id);
    if (!point || !rack?.placement) return;
    drag.moved = true;

    const base = footprint(rack, rack.placement);
    const others = room.racks.filter((r) => r.id !== rack.id && r.placement).map((r) => footprint(r, r.placement!));
    const snapped = snapPosition({ ...base, x: point.x - drag.offsetX, z: point.z - drag.offsetZ }, room, others);
    const placement: RackPlacement = {
      x: snapped.x,
      z: snapped.z,
      rotation: rack.placement.rotation,
      elevationCm: rack.placement.elevationCm,
    };
    const fit = checkFit(room, rack, placement, room.racks);
    const rect = footprint(rack, placement);
    const node = this.nodes.get(rack.id);
    if (node) this.positionNode(node, rect, placement.rotation, placement.elevationCm ?? 0);
    this.showOutline(rack.id, fit.ok ? COLOR_VALID : COLOR_INVALID, rect);
    drag.last = { id: rack.id, x: placement.x, z: placement.z, valid: fit.ok, reason: fit.ok ? null : fit.reason };
    this.dragChange.emit(drag.last);
    this.requestRender();
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const start = this.pointerStart;
    this.pointerStart = null;
    const drag = this.drag;
    const doorDrag = this.doorDrag;
    this.drag = null;
    this.doorDrag = null;
    this.controls.enabled = true;
    if (doorDrag) {
      this.previewDoor = null;
      if (doorDrag.moved && doorDrag.last) {
        // The preview stays on screen until the page stores the door (or the view returns to the stored one).
        this.doorMoved.emit(doorDrag.last);
        return;
      }
    }
    if (drag?.moved && drag.last) {
      const rack = this.room().racks.find((r) => r.id === drag.id);
      this.dragChange.emit(null);
      if (rack?.placement && drag.last.valid) {
        this.rackMoved.emit({
          id: drag.id,
          placement: { x: drag.last.x, z: drag.last.z, rotation: rack.placement.rotation, elevationCm: rack.placement.elevationCm },
        });
      } else {
        this.sync(this.room(), this.selectedId()); // springs back to the last valid position
      }
      return;
    }
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_TOLERANCE) return;
    this.rackTapped.emit(this.rackAt(event));
  };

  private readonly onPointerCancel = () => {
    this.pointerStart = null;
    this.controls.enabled = true;
    if (this.doorDrag?.moved) {
      this.doorDrag = null;
      this.previewDoor = null;
      this.sync(this.room(), this.selectedId());
    }
    this.doorDrag = null;
    if (this.drag?.moved) {
      this.drag = null;
      this.dragChange.emit(null);
      this.sync(this.room(), this.selectedId());
    }
    this.drag = null;
  };

  // ----- Rendering -----

  private resize(): void {
    const { clientWidth, clientHeight } = this.host.nativeElement;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.fitCamera(false);
    this.requestRender();
  }

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
    cancelAnimationFrame(this.flyFrame);
    this.observer?.disconnect();
    if (!this.renderer) return;
    const canvas = this.canvas().nativeElement;
    for (const [type, handler] of [
      ['pointerdown', this.onPointerDown],
      ['pointermove', this.onPointerMove],
      ['pointerup', this.onPointerUp],
      ['pointercancel', this.onPointerCancel],
      ['webglcontextlost', this.onContextLost],
    ] as [string, EventListener][]) {
      canvas.removeEventListener(type, handler);
    }
    this.controls.dispose();
    for (const id of [...this.nodes.keys()]) this.removeNode(id);
    this.clearWalls();
    this.showOutline(null, COLOR_SELECTED);
    for (const item of [this.boxGeometry, this.bottleGeometry, this.decalGeometry, this.wood, this.backWood, this.glass, this.podiumMaterial, this.hitMaterial, this.outlineMaterial, this.decalMaterial]) {
      item.dispose();
    }
    this.environment?.dispose();
    this.renderer.dispose();
  }
}
