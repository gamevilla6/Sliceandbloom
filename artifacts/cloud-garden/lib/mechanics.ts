import Matter from 'matter-js';
import type { Block, Level, V } from './levels';

const { Bodies, Body, Composite, Query } = Matter;

export interface WindZone extends Block {
  /** Force per unit mass, so wind acceleration does not depend on Cloud's size. */
  force: V;
}
export interface Slider extends Block {
  axis: 'x' | 'y';
  amplitude: number;
  period: number;
  phase?: number;
}
export interface PortalPair {
  entry: V;
  exit: V;
  r: number;
  /** Radians of velocity rotation A → B; B → A applies the inverse. */
  rotation?: number;
}
export interface BlockSwitch {
  button: Block;
  gate: Block;
  minMass?: number;
}
export type MechanicEffect = { type: 'portal' | 'switch'; at: V };

/**
 * Optional mechanics are isolated from the original campaign's simulation.
 * Everything uses world coordinates, never device pixels or wall-clock time.
 */
export class AdvancedMechanics {
  movers: { spec: Slider; body: Matter.Body }[] = [];
  portals: { spec: PortalPair; a: Matter.Body; b: Matter.Body }[] = [];
  switches: { spec: BlockSwitch; button: Matter.Body; gate: Matter.Body; active: boolean }[] = [];
  weights: Matter.Body[] = [];
  teleports = 0;
  private portalCooldown = 0;
  private portalLocked = false;

  constructor(private world: Matter.World, private level: Level) {
    for (const spec of level.movers ?? []) {
      const body = Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, {
        isStatic: true, isSensor: true, label: 'moving-hazard',
      });
      this.movers.push({ spec, body });
      Composite.add(world, body);
    }
    for (const spec of level.portals ?? []) {
      const a = Bodies.circle(spec.entry.x, spec.entry.y, spec.r, { isStatic: true, isSensor: true, label: 'portal' });
      const b = Bodies.circle(spec.exit.x, spec.exit.y, spec.r, { isStatic: true, isSensor: true, label: 'portal' });
      this.portals.push({ spec, a, b });
      Composite.add(world, [a, b]);
    }
    for (const spec of level.switches ?? []) {
      const button = Bodies.rectangle(spec.button.x, spec.button.y, spec.button.w, spec.button.h, {
        isStatic: true, isSensor: true, label: 'switch',
      });
      const gate = Bodies.rectangle(spec.gate.x, spec.gate.y, spec.gate.w, spec.gate.h, {
        isStatic: true, angle: spec.gate.angle ?? 0, label: 'gate',
      });
      this.switches.push({ spec, button, gate, active: false });
      Composite.add(world, [button, gate]);
    }
    for (const spec of level.weights ?? []) {
      const body = Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, {
        angle: spec.angle ?? 0, density: 0.004, friction: 0.35,
        restitution: 0.02, label: 'weight',
      });
      this.weights.push(body);
      Composite.add(world, body);
    }
  }

  beforeStep(time: number, dt: number, cloud: Matter.Body, running: boolean) {
    this.portalCooldown = Math.max(0, this.portalCooldown - dt);
    for (const { spec, body } of this.movers) {
      const offset = Math.sin(time * Math.PI * 2 / spec.period + (spec.phase ?? 0)) * spec.amplitude;
      Body.setPosition(body, {
        x: spec.x + (spec.axis === 'x' ? offset : 0),
        y: spec.y + (spec.axis === 'y' ? offset : 0),
      });
    }
    if (!running) return;
    for (const zone of this.level.winds ?? []) {
      const { x, y } = cloud.position;
      if (Math.abs(x - zone.x) <= zone.w / 2 && Math.abs(y - zone.y) <= zone.h / 2) {
        Body.applyForce(cloud, cloud.position, { x: cloud.mass * zone.force.x, y: cloud.mass * zone.force.y });
      }
    }
  }

  afterStep(cloud: Matter.Body, running: boolean): MechanicEffect[] {
    const effects: MechanicEffect[] = [];
    const bodies = Composite.allBodies(this.world);
    for (const item of this.switches) {
      if (item.active) continue;
      const heavy = bodies.filter((b) => !b.isStatic && b !== cloud
        && ['weight', 'stone', 'cut'].includes(b.label) && b.mass >= (item.spec.minMass ?? 1.5));
      if (Query.collides(item.button, heavy).length) {
        item.active = true; // Latched: bouncing away never closes a gate on Cloud.
        Composite.remove(this.world, item.gate);
        effects.push({ type: 'switch', at: { ...item.button.position } });
      }
    }
    if (!running) return effects;
    const touches = this.portals.flatMap(({ spec, a, b }) => {
      const found: { destination: V; r: number; rotation?: number }[] = [];
      if (Query.collides(cloud, [a]).length) found.push({ destination: spec.exit, r: spec.r, rotation: spec.rotation });
      if (Query.collides(cloud, [b]).length) found.push({ destination: spec.entry, r: spec.r, rotation: spec.rotation === undefined ? undefined : -spec.rotation });
      return found;
    });
    if (!touches.length) this.portalLocked = false;
    if (this.portalCooldown > 0 || this.portalLocked || !touches.length) return effects;
    const { destination, r, rotation } = touches[0];
    const rotated = rotation !== undefined;
    const c = Math.cos(rotation ?? 0), s = Math.sin(rotation ?? 0);
    const velocity = rotated
      ? { x: cloud.velocity.x * c - cloud.velocity.y * s, y: cloud.velocity.x * s + cloud.velocity.y * c }
      : { x: cloud.velocity.x, y: Math.max(2, cloud.velocity.y) };
    // Emerge just below the destination sensor, not inside it (no ping-pong).
    const speed = Math.hypot(velocity.x, velocity.y);
    const offset = r + (cloud.circleRadius ?? 11) + 3;
    const direction = rotated && speed > 0.001 ? { x: velocity.x / speed, y: velocity.y / speed } : { x: 0, y: 1 };
    Body.setPosition(cloud, { x: destination.x + direction.x * offset, y: destination.y + direction.y * offset });
    Body.setVelocity(cloud, velocity);
    this.portalCooldown = this.level.portalCooldown ?? 0.55;
    this.portalLocked = true;
    this.teleports++;
    effects.push({ type: 'portal', at: { ...cloud.position } });
    return effects;
  }

  clear() {
    this.movers = [];
    this.portals = [];
    this.switches = [];
    this.weights = [];
    this.portalCooldown = 0;
    this.portalLocked = false;
    this.teleports = 0;
  }
}
