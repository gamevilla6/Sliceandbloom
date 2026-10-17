import Matter from 'matter-js';
import { GROUND, H, Level, V } from './levels';
import { createCloud, createPlant, createRope, createWood } from './objects';
import { AdvancedMechanics } from './mechanics';
import { HardcoreMechanics } from './hardcore';
import { InfinityMechanics } from './infinity';
import { VoidMechanics } from './void';
import { FX } from './fxColors';
import { GenesisMechanics } from './genesis';

const { Engine, Bodies, Body, Composite, Events, Query, Vertices } = Matter;

export type Status = 'ready' | 'running' | 'won' | 'lost';
export type GameEvent =
  | { type: 'impact'; power: number }
  | { type: 'cut' }
  | { type: 'rope' }
  | { type: 'push' }
  | { type: 'stroke' }
  | { type: 'release' }
  | { type: 'portal' }
  | { type: 'switch' }
  | { type: 'gravity' }
  | { type: 'win' }
  | { type: 'lose' };

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  color: string;
  shard?: boolean;
  shape?: 'circle' | 'petal' | 'spark' | 'droplet' | 'shard';
  rotation?: number;
  spin?: number;
}
export interface Stroke {
  pts: V[];
  bodies: Matter.Body[];
  len: number;
}

export const STEP = 1000 / 60;
export const DROP_R = 11;
const MAX_SPEED = 15;
const MAX_PARTICLES = 180;

function dist(a: V, b: V) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function segCross(p: V, p2: V, q: V, q2: V) {
  const d1x = p2.x - p.x;
  const d1y = p2.y - p.y;
  const d2x = q2.x - q.x;
  const d2y = q2.y - q.y;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-9) return false;
  const t = ((q.x - p.x) * d2y - (q.y - p.y) * d2x) / den;
  const u = ((q.x - p.x) * d1y - (q.y - p.y) * d1x) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function crossCount(poly: V[], a: V, b: V) {
  let n = 0;
  for (let i = 0; i < poly.length; i++) {
    if (segCross(a, b, poly[i], poly[(i + 1) % poly.length])) n++;
  }
  return n;
}

function splitPoly(poly: V[], a: V, b: V): [V[], V[]] | null {
  const side = (p: V) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  const L: V[] = [];
  const R: V[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const sp = side(p);
    const sq = side(q);
    if (sp >= 0) L.push(p);
    if (sp <= 0) R.push(p);
    if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) {
      const t = sp / (sp - sq);
      const ip = { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
      L.push(ip);
      R.push(ip);
    }
  }
  if (L.length < 3 || R.length < 3) return null;
  return [L, R];
}

export class GardenEngine {
  engine: Matter.Engine;
  drop: Matter.Body;
  plant: Matter.Body;
  advanced: AdvancedMechanics;
  hardcore: HardcoreMechanics;
  infinity: InfinityMechanics;
  voidProtocol: VoidMechanics;
  genesis: GenesisMechanics;
  ropes: Matter.Constraint[] = [];
  sliceTrails: { a: V; b: V; life: number }[] = [];
  private blades: Matter.Body[] = [];
  private pushed = new Set<number>();
  level: Level;
  strokes: Stroke[] = [];
  thorns: Matter.Body[] = [];
  particles: Particle[] = [];
  inkUsed = 0;
  actions = 0;
  status: Status = 'ready';
  failReason = '';
  time = 0;
  bloom = 0;
  winT = 0;
  winFrom: V = { x: 0, y: 0 };
  runTime = 0;
  stillTime = 0;
  onEvent?: (e: GameEvent) => void;
  private attached = false;
  started = false;
  elapsed = 0;
  shakeIntensity = 0;
  private slicePending = false;
  private lastImpactTime = -1;
  private bonusInkFraction: number;
  soilBodies: Matter.Body[] = [];
  revealedBodies = new Set<number>();

  constructor(level: Level, bonusInkFraction = 0) {
    this.level = level;
    this.bonusInkFraction = Number.isFinite(bonusInkFraction) ? Math.max(0, bonusInkFraction) : 0;
    this.engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.0011 } });
    const world = this.engine.world;
    const stat = { isStatic: true, friction: 0.15 };
    Composite.add(world, [
      Bodies.rectangle(180, GROUND + 30, 600, 60, { ...stat, label: 'ground' }),
      Bodies.rectangle(-20, 300, 40, 2400, { ...stat, label: 'wall' }),
      Bodies.rectangle(380, 300, 40, 2400, { ...stat, label: 'wall' }),
    ]);
    this.soilBodies = level.soil.map(b =>
      Bodies.rectangle(b.x, b.y, b.w, b.h, { ...stat, angle: b.angle ?? 0, label: 'soil' }));
    Composite.add(world, this.soilBodies);
    const woods = level.wood.map(createWood);
    Composite.add(world, woods);
    level.stones.forEach((s) =>
      Composite.add(world, Bodies.circle(s.x, s.y, s.r, { density: 0.004, friction: 0.3, label: 'stone' })),
    );
    level.thorns.forEach((t) => {
      const body = Bodies.rectangle(t.x + t.w / 2, t.y + 11, t.w, 22, { isStatic: true, isSensor: true, label: 'thorn' });
      this.thorns.push(body);
      Composite.add(world, body);
    });
    this.drop = createCloud(level.drop, DROP_R * (level.hyperSensitiveScale ?? 1));
    this.plant = createPlant(level.flower);
    Composite.add(world, [this.drop, this.plant]);
    this.advanced = new AdvancedMechanics(world, level);
    this.hardcore = new HardcoreMechanics(this.engine, level);
    this.infinity = new InfinityMechanics(level);
    this.voidProtocol = new VoidMechanics(this.engine, level, this.drop, this.soilBodies);
    this.genesis = new GenesisMechanics(world, level, this.plant);
    for (const rope of level.ropes ?? []) {
      const a = rope.fromWeight ? this.advanced.weights[rope.from] : woods[rope.from];
      const b = rope.toWeight ? this.advanced.weights[rope.to] : woods[rope.to];
      if (!a || !b) throw new Error(`Invalid rope endpoints in level ${level.id}`);
      const constraint = createRope(a, b, rope.pointA, rope.pointB);
      this.ropes.push(constraint);
      Composite.add(world, constraint);
    }
    this.thorns.push(...this.advanced.movers.map(({ body }) => body));
    this.thorns.push(...this.hardcore.lasers);
  }

  private onCollide = (e: Matter.IEventCollision<Matter.Engine>) => {
    const drops = this.activeDrops;
    if (this.level.invisibleObstacles) {
      for (const { bodyA, bodyB } of e.pairs) {
        if (drops.includes(bodyA)) this.revealedBodies.add(bodyB.id);
        if (drops.includes(bodyB)) this.revealedBodies.add(bodyA.id);
      }
    }
    // Lethal contacts take precedence over a simultaneous target contact.
    if (this.level.hardcore && this.status === 'running') {
      const beamHit = drops.find(cloud => this.genesis.hitByBeam(cloud));
      if (beamHit) {
        this.finish('lost', 'Reflected laser hit. Align the glass before Drop.', beamHit.position);
        return;
      }
      const fatal = e.pairs.find(p => (drops.includes(p.bodyA) && this.isHazard(p.bodyB))
        || (drops.includes(p.bodyB) && this.isHazard(p.bodyA)));
      if (fatal) {
        const other = drops.includes(fatal.bodyA) ? fatal.bodyB : fatal.bodyA;
        this.finish('lost', this.hazardReason(other), (drops.includes(fatal.bodyA) ? fatal.bodyA : fatal.bodyB).position);
        return;
      }
    }
    for (const pair of e.pairs) {
      if (drops.includes(pair.bodyA) || drops.includes(pair.bodyB)) {
        const cloud = drops.includes(pair.bodyA) ? pair.bodyA : pair.bodyB;
        const other = cloud === pair.bodyA ? pair.bodyB : pair.bodyA;
        if (cloud === this.drop) this.genesis.noteContact(other);
        this.voidProtocol.reveal(other);
        if (other === this.plant && !this.level.splitDropletRequired && this.genesis.objectivesComplete && this.status === 'running') {
          this.finish('won');
          continue;
        }
        if (this.isHazard(other) && this.status === 'running') {
          this.finish('lost', this.hazardReason(other), cloud.position);
          continue;
        }
        const power = cloud.speed;
        if (power > 4 && this.time - this.lastImpactTime > 0.14) {
          this.lastImpactTime = this.time;
          if (!other.isSensor) {
            this.shakeIntensity = Math.max(this.shakeIntensity, Math.min(6, power * 0.3));
            if (power > 7) this.shatter(cloud.position, this.level.hardcore ? 7 : 4);
          }
          this.onEvent?.({ type: 'impact', power });
        }
      }
    }
  };

  attach() {
    if (this.attached) return;
    this.attached = true;
    Events.on(this.engine, 'collisionStart', this.onCollide);
  }

  dispose() {
    this.attached = false;
    Events.off(this.engine, 'collisionStart', this.onCollide);
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.advanced.clear();
    this.hardcore.clear();
    this.infinity.clear();
    this.voidProtocol.clear();
    this.genesis.clear();
    this.ropes = [];
    this.blades = [];
    this.pushed.clear();
    this.particles = [];
    this.sliceTrails = [];
    this.onEvent = undefined;
    this.slicePending = false;
    this.soilBodies = [];
    this.revealedBodies.clear();
  }

  get inkLeft() {
    return Math.max(0, this.inkMax - this.inkUsed);
  }
  get inkMax() {
    const base = Math.min(this.level.ink, this.level.maxInkLength ?? Infinity,
      this.level.strictInkLength === undefined ? Infinity : 400 * this.level.strictInkLength);
    return Math.round(base * (1 + this.bonusInkFraction));
  }
  get score() {
    if (!this.level.hardcore || this.status !== 'won') return 0;
    return Math.max(100, Math.round(this.stars * 1000 + this.timeLeft * 100 + this.inkLeft * 3 - this.actions * 50));
  }
  get stars() {
    const moves = this.actions <= this.level.par ? 3 : this.actions <= this.level.par + 1 ? 2 : 1;
    if (!this.level.hardcore) return moves;
    const speed = this.elapsed <= this.level.hardcore.goldTime ? 3
      : this.elapsed <= this.level.hardcore.timeLimit * 0.85 ? 2 : 1;
    return Math.min(moves, speed);
  }
  get timeLeft() {
    const limit = this.level.hardcoreCountdown ?? this.level.countdownTimer ?? this.level.hardcore?.timeLimit;
    return limit === undefined ? Infinity : Math.max(0, limit - this.elapsed);
  }
  get gravityRemaining() { return this.hardcore.gravityRemaining; }
  get gravityActivations() { return this.hardcore.gravityActivations; }
  get lasers() { return this.hardcore.lasers; }
  get activeDrops() { return this.genesis.activeDrops(this.drop); }

  isObstacleVisible(body: Matter.Body) {
    if (this.level.voidProtocol) return this.voidProtocol.opacity(body) > 0;
    return !this.level.invisibleObstacles || this.revealedBodies.has(body.id);
  }

  revealAt(point: V) {
    if ((!this.level.invisibleObstacles && !this.level.voidProtocol?.shadow) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return 0;
    const targets = this.bodies.filter(b =>
      ['soil', 'cut', 'stone', 'weight', 'gate', 'rotating-barrier', 'crusher'].includes(b.label));
    const touch = Bodies.circle(point.x, point.y, 14, { isSensor: true });
    let revealed = 0;
    for (const hit of Query.collides(touch, targets)) {
      const body = hit.bodyA === touch ? hit.bodyB : hit.bodyA;
      this.voidProtocol.reveal(body);
      if (!this.revealedBodies.has(body.id)) { this.revealedBodies.add(body.id); revealed++; }
    }
    return revealed;
  }

  beginInput() {
    if (this.status !== 'ready' && this.status !== 'running') return false;
    if (this.level.hardcore && this.actions >= this.level.hardcore.maxStrokes) return false;
    this.started = true;
    return true;
  }

  private isHazard(body: Matter.Body) {
    return ['thorn', 'moving-hazard', 'crusher'].includes(body.label)
      || (body.label === 'laser' && body.collisionFilter.mask !== 0);
  }
  private hazardReason(body: Matter.Body) {
    return body.label === 'laser' ? 'Laser hit. Try a cleaner route.'
      : body.label === 'crusher' ? 'Crushed. Reach the center sooner.'
      : body.label === 'moving-hazard' ? 'The moving blade popped Cloud.' : 'Thorns popped Cloud.';
  }

  private shatter(at: V, count: number) {
    const palette = this.level.voidProtocol || this.level.visualMode === 'void'
      ? [FX.void.red, FX.void.magenta, FX.void.purple, '#FFFFFF']
      : this.level.visualMode === 'genesis'
        ? [FX.genesis.amber, FX.genesis.orange, FX.genesis.gold, '#FFFFFF']
        : this.level.visualMode === 'singularity'
          ? [FX.singularity.cyan, FX.singularity.gold, FX.singularity.violet, '#FFFFFF']
          : [FX.campaign.water, FX.campaign.mint, '#FFFFFF'];
    this.burst(at.x, at.y, count, palette, 3.8, 'shard');
  }
  get bodies() {
    return Composite.allBodies(this.engine.world);
  }

  burst(x: number, y: number, n: number, colors: string[], speed: number, shape: Particle['shape'] = 'spark') {
    const count = Math.min(Math.max(0, Math.floor(n)), MAX_PARTICLES - this.particles.length);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * 0.4,
        life: 0,
        max: 28 + Math.random() * 28,
        r: 2 + Math.random() * 3,
        color: colors[i % colors.length],
        shape,
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 14,
        shard: shape === 'shard',
      });
    }
  }

  private bloomFountain(x: number, y: number) {
    const palette = this.level.voidProtocol || this.level.visualMode === 'void'
      ? [FX.void.ok, FX.void.purple, FX.void.magenta, FX.void.gold]
      : this.level.visualMode === 'genesis'
        ? [FX.genesis.gold, FX.genesis.amber, FX.genesis.glow, '#FFF3D6']
        : this.level.visualMode === 'singularity'
          ? [FX.singularity.cyan, FX.singularity.gold, FX.singularity.violet, FX.singularity.glow]
          : [FX.campaign.petal, FX.campaign.gold, FX.campaign.leaf, FX.campaign.mint, FX.campaign.water];
    const count = Math.min(34, MAX_PARTICLES - this.particles.length);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.7;
      const speed = 2.1 + Math.random() * 3.4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        max: 42 + Math.random() * 24,
        r: 2.4 + Math.random() * 3.2,
        color: palette[i % palette.length],
        shape: 'petal',
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 9,
      });
    }
  }

  release() {
    if (this.status !== 'ready') return false;
    this.started = true;
    Body.setStatic(this.drop, false);
    this.status = 'running';
    this.onEvent?.({ type: 'release' });
    return true;
  }

  addStroke(pts: V[]) {
    if (this.status !== 'ready' && this.status !== 'running') return false;
    if (this.level.hardcore && this.actions >= this.level.hardcore.maxStrokes) return false;
    if (pts.length < 2) return false;
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
    if (!Number.isFinite(len) || len < 16 || this.inkUsed + len > this.inkMax + (this.level.hardcore ? 0 : 0.5)) return false;
    this.started = true;
    const bodies: Matter.Body[] = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const l = dist(a, b);
      if (l < 0.5) continue;
      bodies.push(
        Bodies.rectangle((a.x + b.x) / 2, (a.y + b.y) / 2, l + 4, 7, {
          isStatic: true,
          friction: 0.1,
          angle: Math.atan2(b.y - a.y, b.x - a.x),
          label: 'ink',
        }),
      );
    }
    Composite.add(this.engine.world, bodies);
    this.voidProtocol.trackStroke(bodies);
    this.strokes.push({ pts: pts.map((p) => ({ ...p })), bodies, len });
    this.inkUsed += len;
    this.actions++;
    this.onEvent?.({ type: 'stroke' });
    return true;
  }

  undo() {
    if (this.status !== 'ready' && this.status !== 'running') return false;
    const s = this.strokes.pop();
    if (!s) return false;
    Composite.remove(this.engine.world, s.bodies);
    this.voidProtocol.forget(s.bodies);
    if (!this.level.hardcore) {
      this.inkUsed = Math.max(0, this.inkUsed - s.len);
      this.actions = Math.max(0, this.actions - 1);
    }
    return true;
  }

  slice(a: V, b: V) {
    if (this.status === 'won' || this.status === 'lost' || dist(a, b) < 6) return 0;
    if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) return 0;
    if (this.level.hardcore && !this.slicePending && !this.beginInput()) return 0;
    this.slicePending = true;
    let cuts = this.genesis.slice(a, b);
    if (cuts) {
      this.burst((a.x + b.x) / 2, (a.y + b.y) / 2, 10, [FX.genesis.gold, FX.genesis.amber], 2);
      this.onEvent?.({ type: 'rope' });
    }
    this.started = true;
    this.sliceTrails.push({ a: { ...a }, b: { ...b }, life: 0 });
    if (this.sliceTrails.length > 24) this.sliceTrails.shift();
    const length = dist(a, b);
    const blade = Bodies.rectangle((a.x + b.x) / 2, (a.y + b.y) / 2, length, 6, {
      isStatic: true,
      isSensor: true,
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      label: 'blade',
    });
    Composite.add(this.engine.world, blade);
    this.blades.push(blade);
    for (const rope of [...this.ropes]) {
      const ends = this.endpoints(rope);
      if (segCross(a, b, ends.a, ends.b)) {
        this.removeRope(rope);
        const ropeColors = this.level.voidProtocol || this.level.visualMode === 'void' ? [FX.void.red, FX.void.magenta, FX.void.purple]
          : this.level.visualMode === 'genesis' ? [FX.genesis.amber, FX.genesis.gold, FX.genesis.orange]
            : this.level.visualMode === 'singularity' ? [FX.singularity.cyan, FX.singularity.gold, FX.singularity.violet]
              : [FX.campaign.wood, FX.campaign.woodDeep, FX.campaign.white];
        this.burst((ends.a.x + ends.b.x) / 2, (ends.a.y + ends.b.y) / 2, 14, ropeColors, 2.8, 'spark');
        this.onEvent?.({ type: 'rope' });
        if (this.level.hardcore) this.shatter({ x: (ends.a.x + ends.b.x) / 2, y: (ends.a.y + ends.b.y) / 2 }, 14);
        cuts++;
      }
    }
    // A transient sensor is queried explicitly to apply a bounded swipe impulse.
    // It survives exactly one Engine.update; it never leaves a hidden wall.
    let pushes = 0;
    const dynamic = this.bodies.filter((body) => !body.isStatic && ['cut', 'stone', 'weight'].includes(body.label));
    for (const collision of Query.collides(blade, dynamic)) {
      const body = collision.bodyA === blade ? collision.bodyB : collision.bodyA;
      if (this.pushed.has(body.id)) continue;
      this.pushed.add(body.id);
      Body.setVelocity(body, {
        x: body.velocity.x + (b.x - a.x) / length * 2.6,
        y: body.velocity.y + (b.y - a.y) / length * 2.6,
      });
      pushes++;
    }
    if (pushes) this.onEvent?.({ type: 'push' });
    let woodCuts = 0;
    const targets = this.bodies.filter((x) => x.label === 'cut');
    for (const t of targets) {
      const poly = t.vertices.map((v) => ({ x: v.x, y: v.y }));
      if (crossCount(poly, a, b) >= 2 && this.cutBody(t, poly, a, b)) {
        cuts++;
        woodCuts++;
      }
    }
    if (woodCuts) {
      const cutColors = this.level.voidProtocol || this.level.visualMode === 'void' ? [FX.void.red, FX.void.magenta, FX.void.text]
        : this.level.visualMode === 'genesis' ? [FX.genesis.amber, FX.genesis.orange, FX.genesis.glow]
          : this.level.visualMode === 'singularity' ? [FX.singularity.cyan, FX.singularity.gold, FX.singularity.glow]
            : [FX.campaign.wood, FX.campaign.woodDeep, FX.campaign.white];
      this.burst((a.x + b.x) / 2, (a.y + b.y) / 2, 12, cutColors, 3, 'spark');
      this.onEvent?.({ type: 'cut' });
    }
    return cuts + pushes;
  }

  endpoints(rope: Matter.Constraint): { a: V; b: V } {
    // Matter rotates constraint offsets in place as attached bodies rotate.
    return {
      a: { x: (rope.bodyA?.position.x ?? 0) + rope.pointA.x, y: (rope.bodyA?.position.y ?? 0) + rope.pointA.y },
      b: { x: (rope.bodyB?.position.x ?? 0) + rope.pointB.x, y: (rope.bodyB?.position.y ?? 0) + rope.pointB.y },
    };
  }

  private removeRope(rope: Matter.Constraint) {
    Composite.remove(this.engine.world, rope);
    this.ropes = this.ropes.filter((item) => item !== rope);
  }

  endSlice() {
    if (this.level.hardcore && this.slicePending) this.actions++;
    this.slicePending = false;
    this.pushed.clear();
  }

  private cutBody(body: Matter.Body, poly: V[], a: V, b: V) {
    const parts = splitPoly(poly, a, b);
    if (!parts) return false;
    if (parts.some((p) => Math.abs(Vertices.area(p, false)) < 80)) return false;
    const nx = -(b.y - a.y);
    const ny = b.x - a.x;
    const nl = Math.hypot(nx, ny) || 1;
    const side = (p: V) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    const created: Matter.Body[] = [];
    const wasVisible = this.isObstacleVisible(body);
    for (const verts of parts) {
      const c = Vertices.centre(verts);
      const piece = Bodies.fromVertices(c.x, c.y, [verts], {
        density: 0.0005,
        friction: 0.3,
        frictionAir: 0.004,
        restitution: 0.1,
        label: 'cut',
        plugin: { skin: 'wood' },
      });
      const sg = side(c) >= 0 ? 1 : -1;
      Body.setVelocity(piece, {
        x: body.velocity.x + (sg * nx * 1.1) / nl,
        y: body.velocity.y + (sg * ny * 1.1) / nl,
      });
      Body.setAngularVelocity(piece, sg * 0.03);
      created.push(piece);
      this.voidProtocol.reveal(piece);
      // Slicing touches and reveals the fragments even if the parent was hidden.
      if (wasVisible || this.level.invisibleObstacles) this.revealedBodies.add(piece.id);
    }
    // A removed polygon must not leave invisible constraints attached to it.
    for (const rope of [...this.ropes]) {
      if (rope.bodyA === body || rope.bodyB === body) this.removeRope(rope);
    }
    Composite.remove(this.engine.world, body);
    Composite.add(this.engine.world, created);
    return true;
  }

  private finish(status: 'won' | 'lost', reason = '', at: V = this.drop.position) {
    if (this.status === 'won' || this.status === 'lost') return;
    // Score the in-flight gesture before UI saves a win; releasing the finger
    // later must not change an already-earned rating.
    if (this.level.hardcore && this.slicePending) this.endSlice();
    this.status = status;
    for (const cloud of this.genesis.children) Body.setStatic(cloud, true);
    this.hardcore.resetGravity();
    this.failReason = reason;
    if (status === 'won') {
      this.winFrom = { x: this.drop.position.x, y: this.drop.position.y };
      Body.setStatic(this.drop, true);
      const f = this.level.flower;
      this.bloomFountain(f.x, f.y);
      this.onEvent?.({ type: 'win' });
    } else {
      this.shakeIntensity = Math.max(this.shakeIntensity, this.level.hardcore ? 10 : 7);
      this.shatter(at, this.level.hardcore ? 30 : 18);
      const splash = this.level.voidProtocol || this.level.visualMode === 'void' ? [FX.void.ok, FX.void.purple, FX.void.text]
        : this.level.visualMode === 'genesis' ? [FX.genesis.glow, FX.genesis.amber, '#FFFFFF']
          : this.level.visualMode === 'singularity' ? [FX.singularity.cyan, FX.singularity.gold, FX.singularity.glow]
            : [FX.campaign.water, FX.campaign.mint, FX.campaign.white];
      this.burst(at.x, at.y, 10, splash, 2.4, 'droplet');
      Body.setStatic(this.drop, true);
      this.onEvent?.({ type: 'lose' });
    }
  }

  step() {
    this.time += STEP / 1000;
    this.shakeIntensity *= 0.84;
    if (this.shakeIntensity < 0.05) this.shakeIntensity = 0;
    if (this.level.hardcore && this.started && (this.status === 'ready' || this.status === 'running')) {
      this.elapsed += STEP / 1000;
      if (this.timeLeft <= 0) this.finish('lost', 'Time up. Retry and commit faster.');
    }
    if (this.status === 'ready' || this.status === 'running') {
      const melted = this.infinity.beforeStep(STEP / 1000, this.activeDrops, this.bodies, this.started);
      if (melted) {
        this.finish('lost', `Thermal overload: ${melted.label === 'drop' ? 'Cloud melted' : 'a dynamic block shattered'} after 2 seconds.`);
        this.shatter(melted.position, 24);
        return;
      }
      for (const cloud of this.activeDrops) {
        if (this.status === 'running' && cloud.speed > MAX_SPEED) {
          const k = MAX_SPEED / cloud.speed;
          Body.setVelocity(cloud, { x: cloud.velocity.x * k, y: cloud.velocity.y * k });
        }
      }
      const intervalFlipped = this.hardcore.beforeStep(STEP / 1000, this.status === 'running');
      this.voidProtocol.beforeStep(STEP / 1000, this.started, this.status === 'running');
      if (this.level.voidProtocol) this.strokes = this.strokes.filter(s => s.bodies.some(b => !this.voidProtocol.isRemoved(b)));
      if (intervalFlipped) {
        this.burst(this.drop.position.x, this.drop.position.y, 12, ['#BD8CFF', '#FFFFFF'], 2);
        this.onEvent?.({ type: 'gravity' });
      }
      this.genesis.beforeStep(this.drop);
      this.advanced.beforeStep(this.time, STEP / 1000, this.activeDrops, this.status === 'running');
      Engine.update(this.engine, STEP);
      if (this.genesis.afterStep(this.drop, this.status === 'running')) {
        this.burst(this.drop.position.x, this.drop.position.y, 18, [FX.genesis.gold, FX.campaign.water], 2.5, 'droplet');
        this.onEvent?.({ type: 'switch' });
      }
      for (const effect of this.advanced.afterStep(this.activeDrops, this.status === 'running')) {
        const eventColors = this.level.visualMode === 'singularity' ? [FX.singularity.cyan, FX.singularity.gold, FX.singularity.violet]
          : this.level.visualMode === 'genesis' ? [FX.genesis.amber, FX.genesis.gold, FX.genesis.orange]
            : this.level.voidProtocol || this.level.visualMode === 'void' ? [FX.void.purple, FX.void.magenta, FX.void.red]
              : effect.type === 'portal' ? [FX.campaign.water, FX.campaign.mint] : [FX.campaign.gold, FX.campaign.leaf];
        this.burst(effect.at.x, effect.at.y, 14, eventColors, 2.5, effect.type === 'portal' ? 'spark' : 'circle');
        this.onEvent?.({ type: effect.type });
      }
      const flipped = this.hardcore.afterStep(this.activeDrops, this.status === 'running');
      this.voidProtocol.clampVelocity();
      if (flipped) {
        this.burst(flipped.x, flipped.y, 12, ['#BD8CFF', '#FFFFFF'], 2);
        this.onEvent?.({ type: 'gravity' });
      }
      if (this.blades.length) {
        Composite.remove(this.engine.world, this.blades);
        this.blades = [];
      }
      for (const b of this.bodies) {
        if (b.label === 'cut' && b.position.y > H + 300) Composite.remove(this.engine.world, b);
      }
    }
    if (this.status === 'running') {
      this.runTime += STEP / 1000;
      const hazards = [...this.thorns.filter(b => this.isHazard(b)),
        ...this.hardcore.crushers.flatMap(c => [c.left, c.right])];
      for (const cloud of this.activeDrops) {
        const p = cloud.position;
        const hit = Query.collides(cloud, hazards)[0];
        if (![p.x, p.y].every(Number.isFinite) || p.y > H + 80 || p.y < -200 || p.x < -40 || p.x > 400)
          this.finish('lost', 'A required droplet slipped off the garden.', p);
        else if (hit) this.finish('lost', this.hazardReason(hit.bodyA === cloud ? hit.bodyB : hit.bodyA), p);
        else if (this.genesis.hitByBeam(cloud)) this.finish('lost', 'Reflected laser hit. Align the glass before Drop.', p);
        else if (this.genesis.isStuck(cloud, STEP / 1000)) this.finish('lost', 'Cloud is stuck and cannot reach the flower.', p);
        if (this.status !== 'running') break;
      }
      this.stillTime = this.drop.speed < .12 ? this.stillTime + STEP / 1000 : 0;
      if (this.status === 'running') {
        for (const bud of this.genesis.collectBuds()) this.bloomFountain(bud.x, bud.y);
        if (this.level.splitDropletRequired && this.genesis.bothBudsComplete) this.finish('won');
        else if (this.runTime > 40) this.finish('lost', 'Too slow. The flower wilted.');
      }
    }
    this.sliceTrails = this.sliceTrails.filter((trail) => ++trail.life < 12);
    if (this.status === 'won') {
      this.winT += STEP / 1000;
      this.bloom = Math.min(1, this.bloom + STEP / 900);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.life++;
      q.vy += 0.12;
      q.x += q.vx;
      q.y += q.vy;
      if (q.rotation !== undefined) q.rotation += q.spin ?? 0;
      if (q.life > q.max) this.particles.splice(i, 1);
    }
  }
}
