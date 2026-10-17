import type { Block, Level, V } from './levels';
import { INFINITY_LEVELS } from './infinityLevels';

const TIERS = ['Photon', 'Event Horizon', 'Quasar', 'Paradox', 'Singularity'];

function makeVariant(source: Level, index: number): Level {
  const tier = Math.floor(index / 11);
  const scale = 0.82 + tier * 0.018 + (index % 11 % 4) * 0.004;
  const mirror = index % 2 === 1;
  const direction = mirror ? -1 : 1;
  const point = (v: V): V => ({
    x: 180 + direction * (v.x - 180) * scale,
    y: 300 + (v.y - 300) * scale,
  });
  const vector = (v: V): V => ({ x: v.x * direction, y: v.y });
  const angle = (value?: number) => value === undefined ? undefined : value * direction;
  const block = (b: Block): Block => ({
    ...b,
    ...point(b),
    w: b.w * scale,
    h: b.h * scale,
    angle: angle(b.angle),
  });

  const timeLimit = 27 - tier * 1.5;
  return {
    ...source,
    id: index + 1,
    name: `${TIERS[tier]} · ${source.name}`,
    visualMode: 'singularity',
    lesson: `Paradox ${index + 1}: ${source.lesson}`,
    hintText: source.hintText,
    drop: point(source.drop),
    flower: { ...point(source.flower), base: point({ x: source.flower.x, y: source.flower.base }).y },
    soil: source.soil.map(block),
    wood: source.wood.map(block),
    stones: source.stones.map((s) => ({ ...point(s), r: s.r * scale })),
    thorns: source.thorns.map((t) => ({ ...point({ x: t.x + t.w / 2, y: t.y }), w: t.w * scale })),
    hint: source.hint.map((h) => ({ ...h, pts: h.pts.map(point) })),
    ropes: source.ropes?.map((r) => ({
      ...r,
      pointA: r.pointA ? { x: r.pointA.x * direction * scale, y: r.pointA.y * scale } : undefined,
      pointB: r.pointB ? { x: r.pointB.x * direction * scale, y: r.pointB.y * scale } : undefined,
    })),
    winds: source.winds?.map((z) => ({
      ...block(z),
      force: vector(z.force),
    })),
    movers: source.movers?.map((m) => ({ ...block(m), amplitude: m.amplitude * scale })),
    portals: source.portals?.map((p) => ({
      entry: point(p.entry),
      exit: point(p.exit),
      r: p.r * scale,
      rotation: angle(p.rotation),
    })),
    switches: source.switches?.map((s) => ({
      ...s,
      button: block(s.button),
      gate: block(s.gate),
    })),
    weights: source.weights?.map(block),
    lasers: source.lasers?.map((l) => ({ ...l, a: point(l.a), b: point(l.b), width: (l.width ?? 6) * scale })),
    gravityZones: source.gravityZones?.map((z) => block(z) as typeof z),
    rotatingBarriers: source.rotatingBarriers?.map((b) => ({ ...block(b), speed: b.speed === undefined ? undefined : b.speed * direction })),
    crushingWalls: source.crushingWalls?.map((c) => ({
      ...c,
      y: point({ x: 180, y: c.y }).y,
      h: c.h * scale,
      width: c.width * scale,
      startGap: c.startGap * scale,
      endGap: c.endGap * scale,
      speed: c.speed * scale,
    })),
    thermalZones: source.thermalZones?.map(block),
    magneticField: source.magneticField ? vector(source.magneticField) : undefined,
    magneticZones: source.magneticZones?.map((z) => ({
      ...block(z),
      field: z.field ? vector(z.field) : undefined,
    })),
    ink: source.ink * scale,
    maxInkLength: source.maxInkLength === undefined ? undefined : source.maxInkLength * scale,
    rotatingBarrierSpeed: source.rotatingBarrierSpeed === undefined ? undefined : source.rotatingBarrierSpeed * direction,
    par: source.hint.length,
    hardcore: {
      timeLimit,
      goldTime: timeLimit - 4,
      maxStrokes: Math.max(1, source.hint.length),
      gravityScale: 1.08 + tier * 0.035,
    },
  };
}

/** A separate, mirrored and rescaled set of challenge layouts and progress IDs. */
export const SINGULARITY_LEVELS: Level[] = INFINITY_LEVELS.map(makeVariant);
