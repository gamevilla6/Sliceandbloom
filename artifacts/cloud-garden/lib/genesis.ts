import Matter from 'matter-js';
import type { Block, Level, V } from './levels';
import { createCloud, createPlant } from './objects';

export interface ReflectionEmitter { origin: V; direction: V; width?: number }
export interface ReflectionReceiver extends V { radius?: number; gate: Block }
export interface ReflectionPuzzle {
  mirrors: Block[];
  emitters: ReflectionEmitter[];
  receivers: ReflectionReceiver[];
}
export interface PulleyPuzzle {
  stages: { weight: Block; gate: Block; button: Block; anchorY: number }[];
}
export interface SplitPuzzle {
  wedge: Block;
  buds: [{ x: number; y: number; base: number }, { x: number; y: number; base: number }];
  spread?: number;
}
export interface BeamSegment { a: V; b: V; width: number; active: boolean }
const { Bodies, Body, Composite, Constraint, Query, Vector } = Matter;
const EPS = 0.001;

export const reflectDirection = (d: V, normal: V): V => {
  const n = Vector.normalise(normal);
  const v = Vector.sub(d, Vector.mult(n, 2 * Vector.dot(d, n)));
  return Vector.normalise(v);
};

function rayEdge(origin: V, direction: V, a: V, b: V) {
  const edge = Vector.sub(b, a), den = Vector.cross(direction, edge);
  if (Math.abs(den) < 1e-9) return null;
  const delta = Vector.sub(a, origin);
  const distance = Vector.cross(delta, edge) / den;
  const fraction = Vector.cross(delta, direction) / den;
  if (distance < EPS || fraction < 0 || fraction > 1) return null;
  return { distance, normal: { x: -edge.y, y: edge.x } };
}

export function pointSegmentDistance(p: V, a: V, b: V) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/** One bounded ray trace is the source of truth for both SVG and damage. */
export function traceReflection(origin: V, direction: V, mirrors: Matter.Body[], opaque: Matter.Body[], receivers: ReflectionReceiver[] = []) {
  const segments: { a: V; b: V }[] = [];
  let start = { ...origin }, dir = Vector.normalise(direction), reflections = 0, receiver = -1;
  if (Vector.magnitude(dir) < .5) return { segments, reflections, receiver };
  for (let bounce = 0; bounce <= 6; bounce++) {
    let nearest = 1100, normal: V | null = null, mirror = false;
    for (const body of [...mirrors, ...opaque]) {
      if (body.isSensor || body.collisionFilter.mask === 0) continue;
      for (let i = 0; i < body.vertices.length; i++) {
        const hit = rayEdge(start, dir, body.vertices[i], body.vertices[(i + 1) % body.vertices.length]);
        if (hit && hit.distance < nearest) {
          nearest = hit.distance; normal = hit.normal; mirror = mirrors.includes(body);
        }
      }
    }
    for (const [i, r] of receivers.entries()) {
      const delta = Vector.sub(r, start), t = Vector.dot(delta, dir), radius = r.radius ?? 14;
      const perpendicular2 = Vector.dot(delta, delta) - t * t;
      if (t > 0 && perpendicular2 <= radius * radius) {
        const distance = Math.max(EPS, t - Math.sqrt(Math.max(0, radius * radius - perpendicular2)));
        if (distance < nearest) { nearest = distance; receiver = i; normal = null; }
      }
    }
    const end = Vector.add(start, Vector.mult(dir, nearest));
    segments.push({ a: { ...start }, b: end });
    if (receiver >= 0 || !normal || !mirror || bounce === 6) break;
    dir = reflectDirection(dir, normal);
    start = Vector.add(end, Vector.mult(dir, .02));
    reflections++;
  }
  return { segments, reflections, receiver };
}

export interface PulleyStage {
  spec: PulleyPuzzle['stages'][number];
  weight: Matter.Body;
  gate: Matter.Body;
  button: Matter.Body;
  weightRope: Matter.Constraint;
  gateRope: Matter.Constraint;
  latch: Matter.Constraint;
  released: boolean;
  active: boolean;
  totalLength: number;
}

/** Genesis-only optional mechanisms; no timers or extra loop outside Matter. */
export class GenesisMechanics {
  mirrors: Matter.Body[] = [];
  receivers: { spec: ReflectionReceiver; gate: Matter.Body; active: boolean }[] = [];
  beams: BeamSegment[] = [];
  reflectionCount = 0;
  pulleys: PulleyStage[] = [];
  pulleyOrder: number[] = [];
  wedge: Matter.Body | null = null;
  children: Matter.Body[] = [];
  buds: { spec: SplitPuzzle['buds'][number]; body: Matter.Body; complete: boolean }[] = [];
  split = false;
  private splitContact = false;
  private incomingVelocity: V = { x: 0, y: 0 };
  private collected = new Set<number>();
  private still = new Map<number, number>();
  private disposed = false;

  constructor(private world: Matter.World, private level: Level, plant: Matter.Body) {
    if (level.laserReflection && !level.reflectionPuzzle) throw new Error('Reflection puzzle geometry is missing');
    if (level.multiStagePulley && !level.pulleyPuzzle?.stages.length) throw new Error('Pulley stages are missing');
    if (level.splitDropletRequired && !level.splitPuzzle) throw new Error('Split puzzle geometry is missing');
    if (level.laserReflection) {
      this.mirrors = level.reflectionPuzzle!.mirrors.map(s => Bodies.rectangle(s.x, s.y, s.w, s.h, {
        isStatic: true, angle: s.angle ?? 0, label: 'mirror', friction: .02,
      }));
      this.receivers = level.reflectionPuzzle!.receivers.map(spec => ({
        spec, active: false,
        gate: Bodies.rectangle(spec.gate.x, spec.gate.y, spec.gate.w, spec.gate.h, { isStatic: true, label: 'reflection-gate' }),
      }));
      Composite.add(world, [...this.mirrors, ...this.receivers.map(r => r.gate)]);
    }
    if (level.multiStagePulley) {
      for (const spec of level.pulleyPuzzle!.stages) {
        const weight = Bodies.rectangle(spec.weight.x, spec.weight.y, spec.weight.w, spec.weight.h, {
          density: .008, frictionAir: .008, inertia: Infinity, label: 'pulley-weight',
        });
        const gate = Bodies.rectangle(spec.gate.x, spec.gate.y, spec.gate.w, spec.gate.h, {
          density: .0003, frictionAir: .06, inertia: Infinity, label: 'pulley-gate',
        });
        const button = Bodies.rectangle(spec.button.x, spec.button.y, spec.button.w, spec.button.h, {
          isStatic: true, isSensor: true, label: 'pulley-button',
        });
        const anchor = { x: spec.weight.x, y: spec.anchorY };
        const weightRope = Constraint.create({ pointA: { ...anchor }, bodyB: weight, stiffness: .04, damping: .04, label: 'pulley-rope' });
        const gateRope = Constraint.create({ pointA: { x: spec.gate.x, y: spec.anchorY }, bodyB: gate, stiffness: .95, damping: .2, label: 'pulley-rope' });
        const latch = Constraint.create({ pointA: { ...anchor }, bodyB: weight, stiffness: .99, damping: .3, label: 'pulley-latch' });
        this.pulleys.push({ spec, weight, gate, button, weightRope, gateRope, latch, active: false, released: false,
          totalLength: weightRope.length + gateRope.length });
        Composite.add(world, [weight, gate, button, weightRope, gateRope, latch]);
      }
    }
    if (level.splitDropletRequired) {
      const spec = level.splitPuzzle!;
      const w = spec.wedge;
      this.wedge = Bodies.fromVertices(w.x, w.y, [[{ x: w.x, y: w.y - w.h / 2 },
        { x: w.x + w.w / 2, y: w.y + w.h / 2 }, { x: w.x - w.w / 2, y: w.y + w.h / 2 }]], {
        isStatic: true, label: 'splitter', friction: .01,
      });
      // The existing plant remains the first bud for compatibility with tools.
      Body.setPosition(plant, spec.buds[0]);
      this.buds = spec.buds.map((bud, i) => ({ spec: bud, body: i === 0 ? plant : createPlant(bud), complete: false }));
      Composite.add(world, [this.wedge, this.buds[1].body]);
    }
  }

  get objectivesComplete() {
    return this.receivers.every(r => r.active) && this.pulleys.every(p => p.active);
  }
  get bothBudsComplete() { return this.split && this.buds.length === 2 && this.buds.every(b => b.complete); }
  activeDrops(parent: Matter.Body) { return this.split ? this.children.filter(b => !this.collected.has(b.id)) : [parent]; }
  isCollected(body: Matter.Body) { return this.collected.has(body.id); }
  noteContact(body: Matter.Body) { if (body === this.wedge) this.splitContact = true; }

  /** Slice through glass to set its tangent to the swipe direction. */
  slice(a: V, b: V) {
    let hits = 0;
    for (const mirror of this.mirrors) {
      if (pointSegmentDistance(mirror.position, a, b) > 8) continue;
      Body.setAngle(mirror, Math.atan2(b.y - a.y, b.x - a.x));
      hits++;
    }
    const first = this.pulleys[0];
    if (first && !first.released) {
      const p = first.latch.pointA, q = first.weight.position;
      if (segmentsIntersect(a, b, p, q)) {
        first.released = true; Composite.remove(this.world, first.latch); hits++;
      }
    }
    return hits;
  }

  beforeStep(parent?: Matter.Body) {
    if (this.disposed) return;
    if (parent && !this.split) this.incomingVelocity = { ...parent.velocity };
    for (const p of this.pulleys) {
      if (!p.released || p.active) continue;
      // The falling mass pays out one rope and takes up the other. The gate is
      // lifted by Matter's constraint solver, never by an animation timer.
      const length = Vector.magnitude(Vector.sub(p.weight.position, p.weightRope.pointA));
      p.weightRope.length = length + 8;
      p.gateRope.length = Math.max(12, p.totalLength - length);
    }
    if (!this.mirrors.length) return;
    const opaque = Composite.allBodies(this.world).filter(b => !b.isSensor && !b.label.startsWith('drop')
      && b.label !== 'mirror' && b.label !== 'blade');
    this.beams = [];
    for (const spec of this.level.reflectionPuzzle!.emitters) {
      const trace = traceReflection(spec.origin, spec.direction, this.mirrors, opaque, this.receivers.map(r => r.spec));
      const receiver = this.receivers[trace.receiver];
      if (receiver && trace.reflections > 0) {
        receiver.active = true;
        Composite.remove(this.world, receiver.gate);
        this.reflectionCount = Math.max(this.reflectionCount, trace.reflections);
      }
      const complete = this.receivers.every(r => r.active);
      this.beams.push(...trace.segments.map(s => ({ ...s, width: spec.width ?? 4, active: !complete })));
    }
    if (this.objectivesComplete) for (const b of this.beams) b.active = false;
  }

  afterStep(parent: Matter.Body, running: boolean) {
    for (const [i, p] of this.pulleys.entries()) {
      if (!p.released || p.active || (i > 0 && !this.pulleys[i - 1].active)) continue;
      if (!Query.collides(p.weight, [p.button]).length) continue;
      p.active = true; this.pulleyOrder.push(i);
      Composite.remove(this.world, [p.gate, p.gateRope, p.weightRope, p.latch]);
      Body.setStatic(p.weight, true);
      const next = this.pulleys[i + 1];
      if (next) { next.released = true; Composite.remove(this.world, next.latch); }
    }
    if (!running || !this.wedge || this.split || (!this.splitContact && !Query.collides(parent, [this.wedge]).length)) return false;
    const spec = this.level.splitPuzzle!;
    const radius = (parent.circleRadius ?? 11) / Math.sqrt(2);
    // Sample before the collision solver deflects the parent off the triangle.
    // Equal opposite separation impulses preserve its incoming momentum.
    const mass = parent.mass, velocity = this.incomingVelocity;
    this.children = [-1, 1].map(side => {
      const b = createCloud({ x: this.wedge!.position.x + side * (radius + 4),
        y: this.wedge!.bounds.max.y + radius + 3 }, radius);
      Body.setStatic(b, false); Body.setMass(b, mass / 2);
      Body.setVelocity(b, { x: velocity.x + side * (spec.spread ?? 2), y: velocity.y });
      b.plugin = { ...b.plugin, budIndex: side < 0 ? 0 : 1 };
      return b;
    });
    Composite.remove(this.world, parent);
    Composite.add(this.world, this.children);
    this.split = true;
    return true;
  }

  collectBuds() {
    if (!this.split || !this.objectivesComplete) return [] as V[];
    const blooms: V[] = [];
    for (const [i, child] of this.children.entries()) {
      if (this.collected.has(child.id) || this.buds[i].complete) continue;
      if (!Query.collides(child, [this.buds[i].body]).length) continue;
      this.buds[i].complete = true; this.collected.add(child.id);
      Body.setStatic(child, true); Composite.remove(this.world, child);
      blooms.push({ ...this.buds[i].body.position });
    }
    return blooms;
  }

  hitByBeam(body: Matter.Body) {
    return this.beams.some(b => b.active && (
      pointSegmentDistance(body.position, b.a, b.b) <= (body.circleRadius ?? 11) + b.width / 2
      || segmentsIntersect(Vector.sub(body.position, body.velocity), body.position, b.a, b.b)));
  }
  isStuck(body: Matter.Body, dt: number) {
    const age = body.speed < .12 ? (this.still.get(body.id) ?? 0) + dt : 0;
    this.still.set(body.id, age);
    return age > 2;
  }
  clear() {
    this.disposed = true;
    this.mirrors = []; this.receivers = []; this.beams = []; this.pulleys = [];
    this.children = []; this.buds = []; this.wedge = null; this.pulleyOrder = [];
    this.collected.clear(); this.still.clear(); this.split = false; this.splitContact = false; this.reflectionCount = 0;
  }
}

function segmentsIntersect(a: V, b: V, c: V, d: V) {
  const ab = Vector.sub(b, a), cd = Vector.sub(d, c), den = Vector.cross(ab, cd);
  if (Math.abs(den) < 1e-9) return false;
  const ca = Vector.sub(c, a), t = Vector.cross(ca, cd) / den, u = Vector.cross(ca, ab) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
