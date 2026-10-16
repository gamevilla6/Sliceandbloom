import Matter from 'matter-js';
import { GROUND, H, Level, V } from './levels';
import { createCloud, createPlant, createRope, createWood } from './objects';
import { AdvancedMechanics } from './mechanics';

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
}
export interface Stroke {
  pts: V[];
  bodies: Matter.Body[];
  len: number;
}

export const STEP = 1000 / 60;
export const DROP_R = 11;
const MAX_SPEED = 15;

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

  constructor(level: Level) {
    this.level = level;
    this.engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.0011 } });
    const world = this.engine.world;
    const stat = { isStatic: true, friction: 0.15 };
    Composite.add(world, [
      Bodies.rectangle(180, GROUND + 30, 600, 60, { ...stat, label: 'ground' }),
      Bodies.rectangle(-20, 300, 40, 2400, { ...stat, label: 'wall' }),
      Bodies.rectangle(380, 300, 40, 2400, { ...stat, label: 'wall' }),
    ]);
    level.soil.forEach((b) =>
      Composite.add(world, Bodies.rectangle(b.x, b.y, b.w, b.h, { ...stat, angle: b.angle ?? 0, label: 'soil' })),
    );
    const woods = level.wood.map(createWood);
    Composite.add(world, woods);
    for (const rope of level.ropes ?? []) {
      const a = woods[rope.from];
      const b = woods[rope.to];
      if (!a || !b) throw new Error(`Invalid rope endpoints in level ${level.id}`);
      const constraint = createRope(a, b, rope.pointA, rope.pointB);
      this.ropes.push(constraint);
      Composite.add(world, constraint);
    }
    level.stones.forEach((s) =>
      Composite.add(world, Bodies.circle(s.x, s.y, s.r, { density: 0.004, friction: 0.3, label: 'stone' })),
    );
    level.thorns.forEach((t) => {
      const body = Bodies.rectangle(t.x + t.w / 2, t.y + 11, t.w, 22, { isStatic: true, isSensor: true, label: 'thorn' });
      this.thorns.push(body);
      Composite.add(world, body);
    });
    this.drop = createCloud(level.drop, DROP_R);
    this.plant = createPlant(level.flower);
    Composite.add(world, [this.drop, this.plant]);
    this.advanced = new AdvancedMechanics(world, level);
    this.thorns.push(...this.advanced.movers.map(({ body }) => body));
  }

  private onCollide = (e: Matter.IEventCollision<Matter.Engine>) => {
    for (const pair of e.pairs) {
      if (pair.bodyA === this.drop || pair.bodyB === this.drop) {
        const other = pair.bodyA === this.drop ? pair.bodyB : pair.bodyA;
        if (other === this.plant && this.status === 'running') {
          this.finish('won');
          continue;
        }
        if ((other.label === 'thorn' || other.label === 'moving-hazard') && this.status === 'running') {
          this.finish('lost', other.label === 'moving-hazard' ? 'The moving blade popped Cloud.' : 'Thorns popped Cloud.');
          continue;
        }
        const power = this.drop.speed;
        if (power > 4) this.onEvent?.({ type: 'impact', power });
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
    this.ropes = [];
    this.blades = [];
    this.pushed.clear();
    this.onEvent = undefined;
  }

  get inkLeft() {
    return Math.max(0, this.level.ink - this.inkUsed);
  }
  get stars() {
    return this.actions <= this.level.par ? 3 : this.actions <= this.level.par + 1 ? 2 : 1;
  }
  get bodies() {
    return Composite.allBodies(this.engine.world);
  }

  burst(x: number, y: number, n: number, colors: string[], speed: number) {
    for (let i = 0; i < n; i++) {
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
      });
    }
  }

  release() {
    if (this.status !== 'ready') return false;
    Body.setStatic(this.drop, false);
    this.status = 'running';
    this.onEvent?.({ type: 'release' });
    return true;
  }

  addStroke(pts: V[]) {
    if (this.status !== 'ready' && this.status !== 'running') return false;
    if (pts.length < 2) return false;
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
    if (len < 16 || this.inkUsed + len > this.level.ink + 0.5) return false;
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
    this.inkUsed = Math.max(0, this.inkUsed - s.len);
    this.actions = Math.max(0, this.actions - 1);
    return true;
  }

  slice(a: V, b: V) {
    if (this.status === 'won' || this.status === 'lost' || dist(a, b) < 6) return 0;
    let cuts = 0;
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
        this.burst((ends.a.x + ends.b.x) / 2, (ends.a.y + ends.b.y) / 2, 12, ['#EBAE50', '#A8691F'], 2.5);
        this.onEvent?.({ type: 'rope' });
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
      this.burst((a.x + b.x) / 2, (a.y + b.y) / 2, 10, ['#EBAE50', '#A8691F', '#FFF3DC'], 3);
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
    }
    // A removed polygon must not leave invisible constraints attached to it.
    for (const rope of [...this.ropes]) {
      if (rope.bodyA === body || rope.bodyB === body) this.removeRope(rope);
    }
    Composite.remove(this.engine.world, body);
    Composite.add(this.engine.world, created);
    return true;
  }

  private finish(status: 'won' | 'lost', reason = '') {
    if (this.status === 'won' || this.status === 'lost') return;
    this.status = status;
    this.failReason = reason;
    if (status === 'won') {
      this.winFrom = { x: this.drop.position.x, y: this.drop.position.y };
      Body.setStatic(this.drop, true);
      const f = this.level.flower;
      this.burst(f.x, f.y, 26, ['#FF7BA5', '#FFC233', '#3EA6FF', '#7FD9C4'], 4.5);
      this.onEvent?.({ type: 'win' });
    } else {
      this.onEvent?.({ type: 'lose' });
    }
  }

  step() {
    this.time += STEP / 1000;
    if (this.status === 'ready' || this.status === 'running') {
      if (this.status === 'running' && this.drop.speed > MAX_SPEED) {
        const k = MAX_SPEED / this.drop.speed;
        Body.setVelocity(this.drop, { x: this.drop.velocity.x * k, y: this.drop.velocity.y * k });
      }
      this.advanced.beforeStep(this.time, STEP / 1000, this.drop, this.status === 'running');
      Engine.update(this.engine, STEP);
      for (const effect of this.advanced.afterStep(this.drop, this.status === 'running')) {
        this.burst(effect.at.x, effect.at.y, 14, effect.type === 'portal' ? ['#247BEB', '#5FE0C0'] : ['#FFD348', '#4FB36B'], 2.5);
        this.onEvent?.({ type: effect.type });
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
      const p = this.drop.position;
      if (p.y > H + 80 || p.x < -40 || p.x > 400) this.finish('lost', 'Cloud slipped off the garden.');
      else if (Query.collides(this.drop, this.thorns).length > 0) {
        const hitBlade = Query.collides(this.drop, this.advanced.movers.map(({ body }) => body)).length > 0;
        this.finish('lost', hitBlade ? 'The moving blade popped Cloud.' : 'Thorns popped Cloud.');
      }
      else {
        this.stillTime = this.drop.speed < 0.12 ? this.stillTime + STEP / 1000 : 0;
        if (this.stillTime > 2) this.finish('lost', 'Cloud is stuck and cannot reach the flower.');
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
      if (q.life > q.max) this.particles.splice(i, 1);
    }
  }
}
