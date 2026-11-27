import {
  BufferGeometry,
  CylinderGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { radiusAt } from '../core/bottle';
import { BottleForm, BottleShape } from '../core/models';

/** Only the sparkling wine bottle has its own detailed model (punt, foil, wire cage, cork); every other form is a plain lathe. */
export function hasSparklingModel(form: BottleForm): boolean {
  return form === 'Champagne';
}

/** Heights as a share of the bottle length. */
export const FOIL_END = 0.945;
export const CAGE_RING = 0.957;
export const CORK_BOTTOM = 0.985;
export const CORK_TOP = 1.012;
export const PLATE_HEIGHT = 1.02;

/**
 * Wall of the glass body as [radius, height] pairs for a bottle of the given length, closed on the axis:
 * starts in the apex of the punt (the dent in the base), runs out to the standing ring and then follows the wall.
 */
export function sparklingGlassPoints(wall: readonly (readonly [number, number])[], length: number): [number, number][] {
  const first = wall[0];
  const last = wall[wall.length - 1];
  const r0 = first[0];
  const punt: [number, number][] = [
    [0, first[1] + 0.05 * length],
    [r0 * 0.3, first[1] + 0.045 * length],
    [r0 * 0.62, first[1] + 0.022 * length],
    [r0 * 0.9, first[1] + 0.004 * length],
  ];
  return [...punt, ...wall.map(([r, y]) => [r, y] as [number, number]), [0, last[1]]];
}

export interface SparklingParts {
  /** Foil over the neck. */
  foil: BufferGeometry;
  /** Wire cage: ring under the lip, four wires and the plate on the cork. */
  wire: BufferGeometry;
  /** Cork head above the mouth. */
  cork: BufferGeometry;
}

/** A thin round bar from a to b. */
function bar(a: Vector3, b: Vector3, radius: number): BufferGeometry {
  const direction = b.clone().sub(a);
  const geometry = new CylinderGeometry(radius, radius, direction.length(), 6);
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize());
  geometry.applyMatrix4(new Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), rotation, new Vector3(1, 1, 1)));
  return geometry;
}

/**
 * Foil, wire cage and cork of a sparkling wine bottle with the base at height -length / 2, the mouth up (+Y).
 * `lift` thickens the foil (so it does not flicker against the glass).
 */
export function sparklingParts(shape: BottleShape, length: number, lift = 0): SparklingParts {
  const r = (height: number) => radiusAt(shape, height) * length;
  const y = (height: number) => height * length - length / 2;
  const start = 0.76;

  // Foil: slightly wider than the neck, swelling towards the lip, with a rippled edge on top.
  const steps = 8;
  const foilPoints: Vector2[] = [new Vector2(r(start) * 1.04 + lift, y(start))];
  for (let i = 1; i <= steps; i++) {
    const h = start + ((FOIL_END - start) * i) / steps;
    foilPoints.push(new Vector2(r(h) * 1.06 + lift + (i === steps ? 0.01 * length : 0), y(h)));
  }
  foilPoints.push(new Vector2(r(FOIL_END) * 1.03 + lift, y(FOIL_END) + 0.006 * length));
  const foil = new LatheGeometry(foilPoints, 20);

  // Wire cage: ring under the lip, a second turn on the neck, four wires up to the plate.
  const ringRadius = r(CAGE_RING) * 1.1;
  const ring = new TorusGeometry(ringRadius, 0.006 * length, 6, 20);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, y(CAGE_RING), 0);
  const lowerRing = new TorusGeometry(r(0.9) * 1.08, 0.005 * length, 6, 20);
  lowerRing.rotateX(Math.PI / 2);
  lowerRing.translate(0, y(0.9), 0);
  const plateRadius = r(CORK_BOTTOM) * 0.95;
  const parts: BufferGeometry[] = [ring, lowerRing];
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const from = new Vector3(Math.cos(angle) * ringRadius, y(CAGE_RING), Math.sin(angle) * ringRadius);
    const to = new Vector3(Math.cos(angle) * plateRadius * 0.9, y(PLATE_HEIGHT), Math.sin(angle) * plateRadius * 0.9);
    parts.push(bar(from, to, 0.0045 * length));
  }
  const plate = new CylinderGeometry(plateRadius * 1.05, plateRadius * 1.05, 0.008 * length, 16);
  plate.translate(0, y(PLATE_HEIGHT), 0);
  parts.push(plate);
  const wire = mergeGeometries(parts)!;
  for (const part of parts) part.dispose();

  // Cork head: a short cylinder that stands out of the mouth.
  const corkRadius = r(CORK_BOTTOM) * 0.95;
  const cork = new CylinderGeometry(corkRadius, corkRadius * 0.92, (CORK_TOP - CORK_BOTTOM) * length, 16);
  cork.translate(0, y((CORK_TOP + CORK_BOTTOM) / 2), 0);

  return { foil, wire, cork };
}
