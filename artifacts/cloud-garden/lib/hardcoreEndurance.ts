import { HARDCORE_EXPANSION } from './hardcoreExpansion';
import type { Level } from './levels';

const ROUNDS = ['Ignition', 'Voltage', 'Overdrive', 'Deadlock', 'Last Stand'];

function mirrorHorizontally(level: Level): void {
  const mirrorX = (x: number) => 360 - x;
  const point = (p: { x: number }) => { p.x = mirrorX(p.x); };
  const block = (b: { x: number; angle?: number }) => {
    point(b);
    if (b.angle !== undefined) b.angle = -b.angle;
  };
  point(level.drop);
  point(level.flower);
  for (const b of [...level.soil, ...level.wood, ...(level.weights ?? [])]) block(b);
  for (const thorn of level.thorns) thorn.x = 360 - thorn.x - thorn.w;
  for (const hint of level.hint) for (const p of hint.pts) point(p);
  for (const laser of level.lasers ?? []) { point(laser.a); point(laser.b); }
  for (const wind of level.winds ?? []) {
    block(wind);
    wind.force.x = -wind.force.x;
  }
  for (const mover of level.movers ?? []) {
    block(mover);
    if (mover.axis === 'x') mover.amplitude = -mover.amplitude;
  }
  for (const portal of level.portals ?? []) {
    point(portal.entry);
    point(portal.exit);
    if (portal.rotation !== undefined) portal.rotation = -portal.rotation;
  }
  for (const item of level.switches ?? []) { block(item.button); block(item.gate); }
  for (const rope of level.ropes ?? []) {
    if (rope.pointA) rope.pointA.x = -rope.pointA.x;
    if (rope.pointB) rope.pointB.x = -rope.pointB.x;
  }
  for (const zone of level.gravityZones ?? []) block(zone);
  for (const rotor of level.rotatingBarriers ?? []) {
    block(rotor);
    if (rotor.speed !== undefined) rotor.speed = -rotor.speed;
  }
  for (const zone of level.thermalZones ?? []) block(zone);
  for (const zone of level.magneticZones ?? []) block(zone);
  if (level.magneticField) level.magneticField.x = -level.magneticField.x;
}

/** Five increasingly tight rounds built from eleven tested Hardcore mechanics. */
export const HARDCORE_ENDURANCE: Level[] = Array.from({ length: 55 }, (_, i) => {
  const round = Math.floor(i / 11);
  const archetype = i % 11;
  const source = HARDCORE_EXPANSION[archetype];
  if (!source) throw new Error(`Missing Hardcore challenge archetype ${archetype}`);

  // Own the complete nested structure so later levels cannot mutate one another.
  const level: Level = JSON.parse(JSON.stringify(source));
  level.id = 46 + i;
  level.name = `${ROUNDS[round]} · ${source.name}`;
  level.lesson = `HARDCORE · ${source.lesson}`;
  level.hintText = level.lesson;
  if (round % 2 === 1) mirrorHorizontally(level);
  // The gravity relay's two portals are intentionally chained quickly; the
  // short per-level cooldown lets Cloud reach the low exit before the thorns.
  if (source.name === 'Inverted Relay') level.portalCooldown = .25;
  // Separate the first repeat of the original corridor with a tighter rotor
  // angle rather than shipping an identical duplicate challenge.
  if (round === 0 && source.name === 'Glass Corridor' && level.rotatingBarriers?.[0]) {
    level.rotatingBarriers[0].angle = .08;
  }

  const rules = level.hardcore;
  if (!rules) throw new Error(`Missing Hardcore timer on archetype ${source.id}`);
  rules.timeLimit = Math.max(9, rules.timeLimit - round * .6);
  rules.goldTime = Math.max(5, Math.min(rules.timeLimit - 1, rules.goldTime - round * .38));
  rules.maxStrokes = level.par;
  rules.gravityScale = (rules.gravityScale ?? 1) + round * .025;
  for (const laser of level.lasers ?? []) {
    if (laser.pulse) {
      laser.pulse.onTime = Math.min(laser.pulse.period - .25, laser.pulse.onTime + round * .025);
      laser.pulse.phase = ((laser.pulse.phase ?? 0) + round * .055) % laser.pulse.period;
    }
  }
  for (const walls of level.crushingWalls ?? []) {
    walls.speed += round * .2;
    walls.endGap = Math.max(70, walls.endGap - round * 4);
  }
  if (level.rotatingBarrierSpeed) level.rotatingBarrierSpeed += round * .12;
  if (level.gravityFlipInterval) level.gravityFlipInterval += round * .07;
  level.maxInkLength = level.ink;
  return level;
});
