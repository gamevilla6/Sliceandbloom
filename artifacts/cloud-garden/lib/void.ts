import Matter from 'matter-js';
import type { Level } from './levels';

export interface VoidRules {
  shadow: boolean;
  shadowPeriod: number;
  illuminatedFor: number;
  touchRevealSeconds: number;
  decaySeconds: number;
  /** Indices in level.soil. Their clocks begin on first input/release. */
  decayingPlatforms?: number[];
  gravityMultiplier: number;
  gravityAmplitude: number;
  gravityPeriod: number;
  /** World units per fixed 60 Hz tick. */
  maxVelocity: number;
}

interface Decay { body: Matter.Body; birth: number | null; scale: number }

/** All timers use simulation seconds: pause/rotation cannot age the world. */
export class VoidMechanics {
  clock = 0;
  lastGravity: number;
  private runTime = 0;
  private touched = new Map<number, number>();
  private decays = new Map<number, Decay>();
  private removed = new Set<number>();
  private rules?: VoidRules;

  constructor(private engine: Matter.Engine, level: Level, private cloud: Matter.Body, soil: Matter.Body[]) {
    this.rules = level.voidProtocol;
    this.lastGravity = engine.gravity.y;
    for (const index of this.rules?.decayingPlatforms ?? []) {
      const body = soil[index];
      if (!body) throw new Error(`Invalid decaying platform in Void level ${level.id}`);
      this.decays.set(body.id, { body, birth: null, scale: 1 });
    }
  }

  trackStroke(bodies: Matter.Body[]) {
    if (!this.rules) return;
    for (const body of bodies) this.decays.set(body.id, { body, birth: this.clock, scale: 1 });
  }

  forget(bodies: Matter.Body[]) {
    for (const b of bodies) this.decays.delete(b.id);
  }

  reveal(body: Matter.Body) {
    if (this.rules) this.touched.set(body.id, this.clock + this.rules.touchRevealSeconds);
  }

  isRemoved(body: Matter.Body) { return this.removed.has(body.id); }

  opacity(body: Matter.Body) {
    if (this.isRemoved(body)) return 0;
    const r = this.rules;
    if (!r?.shadow) return 1;
    const light = this.clock % r.shadowPeriod < r.illuminatedFor;
    const nearby = !this.cloud.isStatic
      && Math.hypot(body.position.x - this.cloud.position.x, body.position.y - this.cloud.position.y) < 58;
    return light || nearby || (this.touched.get(body.id) ?? -1) > this.clock ? this.strokeOpacity(body) : 0;
  }

  strokeOpacity(body: Matter.Body) {
    if (this.isRemoved(body)) return 0;
    const d = this.decays.get(body.id);
    if (!d || d.birth === null || !this.rules) return 1;
    return Math.max(0, Math.min(1, (this.rules.decaySeconds - (this.clock - d.birth)) / .45));
  }

  beforeStep(dt: number, started: boolean, running: boolean) {
    const r = this.rules;
    if (!r) return;
    this.clock += dt;
    if (running) this.runTime += dt;
    // HardcoreMechanics supplies the base gravity/sign first, including flips.
    const modulation = 1 + r.gravityAmplitude * Math.sin(this.runTime * Math.PI * 2 / r.gravityPeriod);
    this.engine.gravity.y *= r.gravityMultiplier * modulation;
    this.lastGravity = this.engine.gravity.y;
    for (const [id, until] of this.touched) if (until <= this.clock) this.touched.delete(id);
    for (const [id, d] of this.decays) {
      if (d.birth === null) {
        if (!started) continue;
        d.birth = this.clock - dt;
      }
      const age = this.clock - d.birth;
      if (age + 1e-9 >= r.decaySeconds) {
        Matter.Composite.remove(this.engine.world, d.body);
        this.removed.add(id);
        this.decays.delete(id);
        continue;
      }
      const scale = Math.max(.04, Math.min(1, (r.decaySeconds - age) / .45));
      if (scale !== d.scale) {
        Matter.Body.scale(d.body, scale / d.scale, scale / d.scale);
        d.scale = scale;
      }
    }
    this.clampVelocity();
  }

  clampVelocity() {
    if (!this.rules || this.cloud.isStatic) return;
    const speed = this.cloud.speed;
    if (speed > this.rules.maxVelocity) {
      const k = this.rules.maxVelocity / speed;
      Matter.Body.setVelocity(this.cloud, { x: this.cloud.velocity.x * k, y: this.cloud.velocity.y * k });
    }
  }

  clear() {
    this.decays.clear();
    this.touched.clear();
    this.removed.clear();
    this.clock = 0;
    this.runTime = 0;
  }
}
