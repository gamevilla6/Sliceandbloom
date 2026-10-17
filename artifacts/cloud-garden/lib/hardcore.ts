import Matter from 'matter-js';
import type { Block, Level, V } from './levels';

export interface HardcoreRules {
  /** Seconds of active play, including planning after the first touch. */
  timeLimit: number;
  goldTime: number;
  maxStrokes: number;
  gravityScale?: number;
}
export interface Laser {
  a: V; b: V; width?: number;
  pulse?: { period: number; onTime: number; phase?: number };
}
export interface GravityZone extends Block { duration: number }
export interface CrushingWalls {
  y: number; h: number; width: number;
  /** Free corridor between inner faces; speeds are world units/second per side. */
  startGap: number; endGap: number; speed: number;
}

/** Optional hazards have no effect on the original campaign's physics. */
export class HardcoreMechanics {
  lasers: Matter.Body[] = [];
  zones: { spec: GravityZone; body: Matter.Body; used: boolean }[] = [];
  gravityRemaining = 0;
  gravityActivations = 0;
  rotors: { spec: Block & { speed?: number }; body: Matter.Body }[] = [];
  crushers: { spec: CrushingWalls; left: Matter.Body; right: Matter.Body }[] = [];
  cycleTime = 0;
  intervalFlips = 0;
  private normalGravity: number;
  private zoneGravityRemaining = 0;
  private motionTime = 0;

  constructor(private engine: Matter.Engine, private level: Level) {
    this.normalGravity = level.hardcore?.gravityScale ?? 1;
    engine.gravity.y = this.normalGravity;
    for (const laser of level.lasers ?? []) {
      const dx = laser.b.x - laser.a.x, dy = laser.b.y - laser.a.y;
      this.lasers.push(Matter.Bodies.rectangle(
        (laser.a.x + laser.b.x) / 2, (laser.a.y + laser.b.y) / 2,
        Math.hypot(dx, dy), laser.width ?? 6,
        { isStatic: true, isSensor: true, angle: Math.atan2(dy, dx), label: 'laser' },
      ));
    }
    for (const spec of level.gravityZones ?? []) {
      const body = Matter.Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, {
        isStatic: true, isSensor: true, label: 'gravity-zone',
      });
      this.zones.push({ spec, body, used: false });
    }
    for (const spec of level.rotatingBarriers ?? []) {
      const body = Matter.Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, {
        isStatic: true, angle: spec.angle ?? 0, friction: .05, restitution: .25, label: 'rotating-barrier',
      });
      this.rotors.push({ spec, body });
    }
    for (const spec of level.crushingWalls ?? []) {
      const make = (direction: number) => Matter.Bodies.rectangle(
        180 + direction * (spec.startGap + spec.width) / 2, spec.y, spec.width, spec.h,
        { isStatic: true, friction: .1, label: 'crusher' },
      );
      this.crushers.push({ spec, left: make(-1), right: make(1) });
    }
    Matter.Composite.add(engine.world, [
      ...this.lasers, ...this.zones.map(z => z.body), ...this.rotors.map(r => r.body),
      ...this.crushers.flatMap(c => [c.left, c.right]),
    ]);
    this.updateLasers();
  }

  get activeLasers() { return this.lasers.filter((_, i) => this.isLaserActive(i)); }
  isLaserActive(index: number) { return (this.lasers[index]?.collisionFilter.mask ?? 0) !== 0; }

  private updateLasers() {
    this.lasers.forEach((body, i) => {
      const pulse = this.level.lasers?.[i].pulse
        ?? (this.level.laserGrid ? { period: 1.8, onTime: .75, phase: i * .3 } : undefined);
      const active = !pulse || ((this.motionTime + (pulse.phase ?? 0)) % pulse.period) < pulse.onTime;
      // Off means no contact at all, not a solid obstacle. The visible sensor
      // remains in the world; both collision events and explicit queries agree.
      body.collisionFilter.mask = active ? 0xFFFFFFFF : 0;
    });
  }

  beforeStep(dt: number, running = false) {
    this.motionTime += dt;
    if (running) this.cycleTime += dt;
    this.updateLasers();
    for (const { spec, body } of this.rotors) {
      const speed = spec.speed ?? this.level.rotatingBarrierSpeed ?? 1;
      Matter.Body.setAngle(body, body.angle + speed * dt);
      // Static kinematic bodies need explicit angle integration; angular
      // velocity also lets the contact solver transfer their motion to Cloud.
      Matter.Body.setAngularVelocity(body, speed * dt);
    }
    for (const { spec, left, right } of this.crushers) {
      const gap = Math.max(spec.endGap, spec.startGap - spec.speed * 2 * this.cycleTime);
      for (const [body, direction] of [[left, -1], [right, 1]] as const) {
        const x = 180 + direction * (gap + spec.width) / 2;
        const dx = x - body.position.x;
        Matter.Body.setPosition(body, { x, y: spec.y });
        Matter.Body.setVelocity(body, { x: dx, y: 0 });
      }
    }
    this.zoneGravityRemaining = Math.max(0, this.zoneGravityRemaining - dt);
    const interval = this.level.gravityFlipInterval ?? 0;
    const flipCount = interval > 0 ? Math.floor((this.cycleTime + 1e-9) / interval) : 0;
    const cyclePhase = interval > 0 ? this.cycleTime - flipCount * interval : 0;
    const cycleRemaining = flipCount > 0 && cyclePhase < .32 ? .32 - Math.max(0, cyclePhase) : 0;
    const newFlip = flipCount > this.intervalFlips;
    this.intervalFlips = flipCount;
    this.gravityRemaining = Math.max(this.zoneGravityRemaining, cycleRemaining);
    this.engine.gravity.y = this.gravityRemaining > 0 ? -this.normalGravity : this.normalGravity;
    return newFlip;
  }

  afterStep(cloud: Matter.Body | Matter.Body[], running: boolean): V | null {
    if (!running) return null;
    // Each visible zone fires once per attempt: no invisible repeat-trigger trap.
    const clouds = Array.isArray(cloud) ? cloud : [cloud];
    const zone = this.zones.find(z => !z.used && clouds.some(c => Matter.Query.collides(c, [z.body]).length > 0));
    if (!zone) return null;
    zone.used = true;
    this.zoneGravityRemaining = Math.max(this.zoneGravityRemaining, zone.spec.duration);
    this.gravityRemaining = Math.max(this.gravityRemaining, this.zoneGravityRemaining);
    this.engine.gravity.y = -this.normalGravity;
    this.gravityActivations++;
    return { ...(clouds.find(c => Matter.Query.collides(c, [zone.body]).length)?.position ?? zone.body.position) };
  }

  resetGravity() {
    this.zoneGravityRemaining = 0;
    this.gravityRemaining = 0;
    this.engine.gravity.y = this.normalGravity;
  }

  clear() {
    this.resetGravity();
    this.lasers = [];
    this.zones = [];
    this.gravityActivations = 0;
    this.rotors = [];
    this.crushers = [];
    this.motionTime = 0;
    this.cycleTime = 0;
    this.intervalFlips = 0;
  }
}
