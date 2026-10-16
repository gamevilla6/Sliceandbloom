import { LEVELS, type Level } from './levels';
import { HARDCORE_EXPANSION } from './hardcoreExpansion';
import { HARDCORE_ENDURANCE } from './hardcoreEndurance';

// Deliberate remixes, not replacements: all campaign geometry and save IDs stay intact.
// Budget is measured in world units, independent of device size or refresh rate.
const REMIXES = [
  [1, 'Zero Waste'], [2, 'Needle Thread'], [3, 'Red Floor'],
  [6, 'Commit Point'], [7, 'Razor Strings'], [11, 'Last Gap'],
  [14, 'Left on Red'], [16, 'Bloom or Bust'], [19, 'Double Down'],
  [21, 'One Clean Cut'], [42, 'No Second Chances'], [27, 'Gale Force'],
  [28, 'Blade Runner'], [29, 'Vector Vault'], [30, 'Pressure Lock'],
  [31, 'Canyon Sprint'], [32, 'Severance'], [33, 'Crosscurrent'],
  [34, 'Twin Trigger'], [35, 'Inversion Alley'], [36, 'Steel Rush'],
  [37, 'Relay Riot'], [41, 'Storm Warning'], [44, 'Heavy Metal'],
  [45, 'Sudden Bloom'],
] as const;

const FLIPS = new Set([1, 3, 8, 12, 16, 18, 20, 23, 25]);

const OPENING_LEVELS: Level[] = REMIXES.map(([sourceId, name], index) => {
  const source = LEVELS.find(l => l.id === sourceId);
  if (!source) throw new Error(`Missing hardcore source bed ${sourceId}`);
  // All Level fields are serializable. Own every nested object: a remix may
  // never mutate the original campaign through a shared reference.
  const level: Level = JSON.parse(JSON.stringify(source));
  const id = index + 1;
  const hintInk = level.hint.filter(h => h.kind === 'draw').reduce((sum, h) =>
    sum + h.pts.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - h.pts[i].x, p.y - h.pts[i].y), 0), 0);
  level.id = id;
  level.name = name;
  level.par = level.hint.length;
  level.ink = hintInk ? Math.ceil(hintInk * 1.04 + 4) : 0;
  level.hardcore = {
    timeLimit: 12 + level.par * 2,
    goldTime: 8 + level.par * 1.5,
    maxStrokes: level.par + 1,
    gravityScale: [1, 2, 3, 12, 16, 20].includes(id) ? 1.12 : 1,
  };
  // The laser punishes falling or bouncing back onto the wrong side.
  const laserX = level.flower.x >= 180 ? 45 : 315;
  level.lasers = [{ a: { x: laserX, y: 365 }, b: { x: laserX, y: 525 }, width: 6 }];
  if (id === 3) level.lasers[0].a.y = 450; // The intended ramp catches Cloud at y=380.
  if (id === 1) level.flower.x = 320; // Faster gravity requires a longer final jump.
  if (id === 8) level.hint[1].pts[1].y = 600; // Still reach the canopy after a player pauses.
  if (!level.thorns.length) level.thorns = [{ x: level.flower.x >= 180 ? 0 : 280, y: 568, w: 80 }];
  if (FLIPS.has(id)) {
    level.gravityZones = [{ x: level.drop.x, y: level.drop.y + 36, w: 58, h: 18, duration: 0.32 }];
    level.lesson += ' The violet zone flips gravity once for 0.32s.';
  }
  // Rotated portals preserve speed and transform the entire vector. Classic
  // portals retain their original downward exit behavior.
  level.portals = level.portals?.map(p => ({ ...p, rotation: 0 }));
  if (id === 14 && level.portals) {
    level.portals[0].rotation = -Math.PI / 6;
    level.flower.x = 330;
    level.lesson = 'Cut the shelf, then ride the angled portal launch into the right-hand flower.';
  }
  level.lesson = `HARDCORE · ${level.lesson}`;
  level.laserGrid = false;
  level.gravityFlipInterval = 0;
  level.rotatingBarrierSpeed = 0;
  level.maxInkLength = level.ink;
  return level;
});

export const HARDCORE_LEVELS: Level[] = [...OPENING_LEVELS, ...HARDCORE_EXPANSION, ...HARDCORE_ENDURANCE];
