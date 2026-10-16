import Matter from 'matter-js';
import type { Block, Level, V } from './levels';

export interface MagneticZone extends Block { field?: V }

/** Fixed-step fields: no interval timers, React updates, or extra sensor bodies. */
export class InfinityMechanics {
  heat = new Map<number, number>();
  private exposure = new Map<string, number>();
  private magnetic: { spec: MagneticZone; bounds: Matter.Bounds }[];
  private thermal: Matter.Bounds[];

  constructor(private level: Level) {
    const bounds = (b: Block) => ({
      min: { x: b.x - b.w / 2, y: b.y - b.h / 2 },
      max: { x: b.x + b.w / 2, y: b.y + b.h / 2 },
    });
    this.magnetic = (level.magneticZones ?? []).map(spec => ({ spec, bounds: bounds(spec) }));
    this.thermal = level.thermalZone ? (level.thermalZones ?? []).map(bounds) : [];
  }

  /** Returns the overheated body; the owning engine handles failure and retry. */
  beforeStep(dt: number, cloud: Matter.Body, bodies: Matter.Body[], active: boolean): Matter.Body | null {
    if (!cloud.isStatic) {
      for (const { spec, bounds } of this.magnetic) {
        if (!Matter.Bounds.contains(bounds, cloud.position)) continue;
        const field = spec.field ?? this.level.magneticField;
        if (field) Matter.Body.applyForce(cloud, cloud.position, { x: cloud.mass * field.x, y: cloud.mass * field.y });
      }
    }
    this.heat.clear();
    if (!active || !this.thermal.length) return null;
    const touched = new Set<string>();
    let melted: Matter.Body | null = null;
    for (const body of bodies) {
      if (body.isSensor || (body.isStatic && body !== cloud)) continue;
      if (body !== cloud && !['cut', 'weight', 'stone'].includes(body.label)) continue;
      for (const [index, zone] of this.thermal.entries()) {
        if (!Matter.Bounds.overlaps(body.bounds, zone)) continue;
        const key = `${body.id}:${index}`;
        touched.add(key);
        const duration = (this.exposure.get(key) ?? 0) + dt;
        this.exposure.set(key, duration);
        this.heat.set(body.id, Math.max(this.heat.get(body.id) ?? 0, duration));
        if (duration > 2 + 1e-9) melted ??= body;
      }
    }
    // Exiting a zone completely cools its exposure; removed cut fragments must
    // not accumulate stale entries through repeated attempts.
    for (const key of this.exposure.keys()) if (!touched.has(key)) this.exposure.delete(key);
    return melted;
  }

  clear() { this.heat.clear(); this.exposure.clear(); }
}
