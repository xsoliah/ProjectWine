import {
  RoomRack,
  checkFit,
  describeDoor,
  describePlacement,
  checkHeight,
  doorHeight,
  isDoorValid,
  projectToWall,
  firstFreeSpot,
  footprint,
  overlaps,
  rotateAround,
  snapPosition,
} from './cellar-room';

const room = { widthCm: 400, depthCm: 300 };

const rack = (id: string, width = 6, placement: RoomRack['placement'] = null): RoomRack => ({
  id,
  name: id,
  height: 5,
  width,
  occupied: 0,
  free: 5 * width,
  placement,
  slots: [],
});

describe('footprint', () => {
  it('uses 12 cm per column and 38 cm depth', () => {
    expect(footprint({ width: 6 }, { x: 5, z: 7, rotation: 0 })).toEqual({ x: 5, z: 7, w: 72, d: 38 });
  });

  it('swaps width and depth for a quarter turn', () => {
    expect(footprint({ width: 6 }, { x: 0, z: 0, rotation: 1 })).toEqual({ x: 0, z: 0, w: 38, d: 72 });
    expect(footprint({ width: 6 }, { x: 0, z: 0, rotation: 2 })).toEqual({ x: 0, z: 0, w: 72, d: 38 });
  });
});

describe('overlaps / checkFit', () => {
  const a = rack('A', 6, { x: 0, z: 0, rotation: 0 });

  it('allows touching but not overlapping', () => {
    expect(overlaps(footprint(a, a.placement!), footprint(a, { x: 72, z: 0, rotation: 0 }))).toBe(false);
    expect(overlaps(footprint(a, a.placement!), footprint(a, { x: 50, z: 10, rotation: 0 }))).toBe(true);
  });

  it('refuses an overlap and names the other rack', () => {
    const b = rack('B');
    const result = checkFit(room, b, { x: 50, z: 10, rotation: 0 }, [a, b]);
    expect(result).toEqual({ ok: false, reason: expect.stringContaining('„A“') });
    expect(checkFit(room, b, { x: 72, z: 0, rotation: 0 }, [a, b]).ok).toBe(true);
  });

  it('refuses a rack that leaves the room', () => {
    const b = rack('B');
    expect(checkFit(room, b, { x: 340, z: 0, rotation: 0 }, [b]).ok).toBe(false);
    expect(checkFit(room, b, { x: 328, z: 0, rotation: 0 }, [b]).ok).toBe(true);
    expect(checkFit(room, b, { x: -1, z: 0, rotation: 0 }, [b]).ok).toBe(false);
  });
});

describe('rotateAround', () => {
  it('keeps the centre', () => {
    const turned = rotateAround({ width: 6 }, { x: 100, z: 100, rotation: 0 });
    expect(turned).toEqual({ x: 117, z: 83, rotation: 1 });
  });

  it('wraps after four turns', () => {
    let p = { x: 100, z: 100, rotation: 0 };
    for (let i = 0; i < 4; i++) p = rotateAround({ width: 6 }, p);
    expect(p.rotation).toBe(0);
  });
});

describe('snapPosition', () => {
  it('snaps to the left wall within 10 cm', () => {
    expect(snapPosition({ x: 6, z: 100, w: 72, d: 38 }, room, [])).toEqual({ x: 0, z: 100 });
  });

  it('does not snap beyond the tolerance', () => {
    expect(snapPosition({ x: 11, z: 100, w: 72, d: 38 }, room, [])).toEqual({ x: 11, z: 100 });
  });

  it('snaps to the right wall and the back wall', () => {
    expect(snapPosition({ x: 322, z: 4, w: 72, d: 38 }, room, [])).toEqual({ x: 328, z: 0 });
  });

  it('snaps to the edge of a neighbouring rack', () => {
    const other = { x: 0, z: 0, w: 72, d: 38 };
    expect(snapPosition({ x: 76, z: 2, w: 72, d: 38 }, room, [other])).toEqual({ x: 72, z: 0 });
  });

  it('ignores racks that are far away on the other axis', () => {
    const other = { x: 0, z: 0, w: 72, d: 38 };
    expect(snapPosition({ x: 76, z: 200, w: 72, d: 38 }, room, [other])).toEqual({ x: 76, z: 200 });
  });
});

describe('firstFreeSpot', () => {
  it('starts at the back left corner', () => {
    expect(firstFreeSpot(room, rack('A'), [rack('A')])).toEqual({ x: 0, z: 0, rotation: 0 });
  });

  it('skips occupied areas', () => {
    const a = rack('A', 6, { x: 0, z: 0, rotation: 0 });
    expect(firstFreeSpot(room, rack('B'), [a])).toEqual({ x: 80, z: 0, rotation: 0 });
  });

  it('tries a turned rack and gives up when nothing fits', () => {
    expect(firstFreeSpot({ widthCm: 100, depthCm: 100 }, rack('B', 10), [])).toBeNull();
    expect(firstFreeSpot({ widthCm: 100, depthCm: 130 }, rack('B', 10), [])).toEqual({ x: 0, z: 0, rotation: 1 });
  });
});

describe('describePlacement', () => {
  it('says "nicht platziert" without a placement', () => {
    expect(describePlacement(null)).toBe('nicht platziert');
    expect(describePlacement({ x: 50, z: 20, rotation: 0 })).toContain('50 cm von links');
  });
});

describe('door', () => {
  it('accepts doors that fit the wall and rejects others (same vectors as the server)', () => {
    expect(isDoorValid({ wall: 2, offsetCm: 150 }, room)).toBe(true);
    expect(isDoorValid({ wall: 2, offsetCm: 310 }, room)).toBe(true);
    expect(isDoorValid({ wall: 2, offsetCm: 330 }, room)).toBe(false);
    expect(isDoorValid({ wall: 1, offsetCm: 211 }, room)).toBe(false);
    expect(isDoorValid({ wall: 4, offsetCm: 0 }, room)).toBe(false);
    expect(isDoorValid({ wall: 0, offsetCm: -1 }, room)).toBe(false);
  });

  it('projects a floor point to the nearest wall, centred and clamped', () => {
    expect(projectToWall(room, { x: 200, z: 295 })).toEqual({ wall: 2, offsetCm: 155 });
    expect(projectToWall(room, { x: 3, z: 150 })).toEqual({ wall: 3, offsetCm: 105 });
    expect(projectToWall(room, { x: 398, z: 20 })).toEqual({ wall: 1, offsetCm: 0 });
  });

  it('snaps to the wall ends within 10 cm', () => {
    expect(projectToWall(room, { x: 50, z: 2 })).toEqual({ wall: 0, offsetCm: 0 });
    expect(projectToWall(room, { x: 354, z: 2 })).toEqual({ wall: 0, offsetCm: 310 });
    expect(projectToWall(room, { x: 100, z: 2 })).toEqual({ wall: 0, offsetCm: 55 });
  });

  it('limits the door height to the room height', () => {
    expect(doorHeight(250)).toBe(205);
    expect(doorHeight(180)).toBe(180);
  });
});

describe('elevation', () => {
  const tall = { name: 'Hoch', height: 10 };

  it('needs elevation plus rack height below the ceiling', () => {
    expect(checkHeight(250, tall, 150).ok).toBe(false);
    expect(checkHeight(250, tall, 130).ok).toBe(true);
    expect(checkHeight(250, { name: 'A', height: 5 }, 40).ok).toBe(true);
  });

  it('skips the check at elevation 0', () => {
    expect(checkHeight(100, tall, 0).ok).toBe(true);
  });

  it('keeps the elevation when rotating and describes it', () => {
    const turned = rotateAround({ width: 6 }, { x: 0, z: 0, rotation: 0, elevationCm: 40 });
    expect(turned.elevationCm).toBe(40);
    expect(describePlacement({ x: 1, z: 2, rotation: 0, elevationCm: 40 })).toContain('40 cm über dem Boden');
    expect(describePlacement({ x: 1, z: 2, rotation: 0 })).not.toContain('über dem Boden');
  });
});

describe('describeDoor', () => {
  it('names the wall in the dative case', () => {
    expect(describeDoor({ wall: 2, offsetCm: 155 })).toBe('Tür an der vorderen Wand, 155 cm vom Wandanfang');
    expect(describeDoor(null)).toBe('keine Tür');
  });
});
