import type { Level } from './levels';

const TIERS = ['Flux', 'Ember', 'Aurora', 'Paradox', 'Infinity'];
const DISCIPLINES = ['Eastbound', 'Westbound', 'Heat Run', 'Counterweight',
  'Polar Passage', 'Uplift', 'Coolant Relay', 'Chain Reaction',
  'Field Weave', 'Thermal Lock', 'Cascade'];
const cut = (x: number, y: number, end: number) =>
  ({ kind: 'slice' as const, pts: [{ x, y }, { x, y: end }] });
const ramp = (x: number, y: number, endX: number, endY: number) =>
  ({ kind: 'draw' as const, pts: [{ x, y }, { x: endX, y: endY }] });
const flower = (x: number) => ({ x, y: 548, base: 590 });
const centralThorns = () => [{ x: 0, y: 568, w: 140 }, { x: 220, y: 568, w: 140 }];

/** Release mass A -> open mass B's support -> mass B opens Cloud's gate.
 * Three real rope links include a small, free counterweight on the first mass.
 */
function chain(level: Level, tier: number, reverse = false) {
  const x = reverse ? 300 : 60, other = 360 - x, flag = reverse ? 210 : 150;
  level.rubeGoldbergChain = true;
  level.drop = { x: 180, y: 76 + tier * 4 };
  level.flower = flower(180);
  level.thorns = centralThorns();
  level.soil = [{ x, y: 475, w: 110, h: 18 }, { x: other, y: 475, w: 100, h: 18 }];
  level.wood = [
    { x: x - 30, y: 70, w: 18, h: 14 }, { x: x + 30, y: 70, w: 18, h: 14 },
    { x: flag, y: 150 + tier * 5, w: 24, h: 10, dynamic: true },
  ];
  level.weights = [{ x, y: 150, w: 40, h: 40 }, { x: other, y: 170 + tier * 3, w: 40, h: 40 }];
  level.ropes = [
    { from: 0, to: 0, toWeight: true }, { from: 1, to: 0, toWeight: true },
    { from: 0, to: 2, fromWeight: true },
  ];
  level.switches = [
    { button: { x, y: 450, w: 100, h: 12 }, gate: { x: other, y: 210 + tier * 3, w: 100, h: 18 }, minMass: 2 },
    { button: { x: other, y: 450, w: 90, h: 12 }, gate: { x: 180, y: 220 + tier * 9, w: 110, h: 20 }, minMass: 2 },
  ];
  level.hint = [{ kind: 'slice', pts: [{ x: x - 50, y: 110 }, { x: x + 50, y: 110 }] }];
  level.lesson = 'Snip both upper ropes. The first counterweight releases the second; wait for both green switches before Drop.';
}

/** 55 new, append-only campaign beds, arranged in five progressive disciplines. */
export const INFINITY_LEVELS: Level[] = Array.from({ length: 55 }, (_, index) => {
  const id = index + 46, tier = Math.floor(index / 11), family = index % 11;
  const l: Level = {
    id, name: `${TIERS[tier]} ${DISCIPLINES[family]}`, lesson: '', hintText: '',
    ink: 0, par: 1, drop: { x: 180, y: 86 }, flower: flower(180),
    soil: [], wood: [], stones: [], thorns: centralThorns(), hint: [],
    thermalZone: false, rubeGoldbergChain: false,
  };
  if (family === 0 || family === 1) {
    const reverse = family === 1, mirror = (x: number) => reverse ? 360 - x : x;
    l.drop = { x: mirror(70 + tier * 3), y: 73 + tier * 5 };
    l.flower = flower(mirror(320));
    l.thorns = reverse ? [{ x: 90, y: 568, w: 270 }] : [{ x: 0, y: 568, w: 250 }];
    l.magneticField = { x: (reverse ? -1 : 1) * (.00022 + tier * .000012), y: 0 };
    l.magneticZones = [{ x: 180, y: 300, w: 350, h: 350 }];
    l.hint = [ramp(mirror(50 + tier * 3), 300 + tier * 5, mirror(220 - tier * 4), 410 - tier * 5)];
    l.lesson = `Draw a ${reverse ? 'left' : 'right'} ramp. The bounded magnetic field pulls Cloud toward the flower.`;
  } else if (family === 2) {
    l.drop.y = 83 + tier * 8;
    l.wood = [{ x: 180, y: 200 + tier * 9, w: 100 - tier * 5, h: 18 }];
    l.thermalZone = true;
    l.thermalZones = [{ x: 180, y: 350 + tier * 7, w: 100, h: 130 + tier * 5 }];
    l.hint = [cut(180, 175 + tier * 9, 225 + tier * 9)];
    l.lesson = 'Split the shelf. Cloud and loose blocks must leave the hot zone within two continuous seconds.';
  } else if (family === 3 || family === 7 || family === 10) {
    chain(l, tier, family === 7);
    if (family === 7) {
      l.magneticField = { x: 0, y: -.0003 - tier * .00003 };
      l.magneticZones = [{ x: 180, y: 390, w: 75, h: 190 }];
      l.thermalZone = true;
      l.thermalZones = [{ x: 180, y: 450, w: 80, h: 55 + tier * 5 }];
    }
    if (family === 10) {
      l.wood.push({ x: 180, y: 290, w: 95, h: 18 });
      l.hint.push(cut(180, 265, 320));
      // The side switches and their resting weights occupy both side lanes.
      // Deliver below the central windmill, never onto a heavy key's platform.
      l.portals = [{ entry: { x: 180, y: 350 }, exit: { x: 180, y: 515 }, r: 22, rotation: 0 }];
      l.magneticField = { x: 0, y: -.00025 - tier * .000015 };
      l.magneticZones = [{ x: 180, y: 245, w: 110, h: 160 }];
      l.rotatingBarrierSpeed = .8 + tier * .12;
      l.rotatingBarriers = [{ x: 180, y: 450, w: 100 + tier * 5, h: 14 }];
      l.thermalZone = true;
      // Keep the furnace above the rotor's maximum sweep, so timber that
      // settles on its arms cannot cause an unavoidable delayed reset.
      l.thermalZones = [{ x: 180, y: 300, w: 70, h: 70 }];
      l.lesson += ' Split the center shelf, then use the portal to bypass the furnace and windmill.';
    }
  } else if (family === 4 || family === 6) {
    const x = 75 + tier * 5, exit = 295 - tier * 3;
    l.drop = { x, y: 92 + tier * 3 };
    l.wood = [{ x, y: 190 + tier * 5, w: 95, h: 18 }];
    l.portals = [{ entry: { x, y: 300 + tier * 6 }, exit: { x: exit, y: 220 + tier * 9 }, r: 22, rotation: 0 }];
    l.flower = flower(exit + (family === 4 ? 15 : -8));
    l.thorns = [{ x: 0, y: 568, w: 235 }];
    l.magneticField = { x: family === 4 ? .00006 : -.00003, y: family === 4 ? -.00015 : 0 };
    l.magneticZones = [{ x: 180, y: 450, w: 340, h: 240 }];
    l.thermalZone = true;
    l.thermalZones = [{ x: 180, y: family === 4 ? 340 : 335, w: 85 + tier * 5, h: family === 4 ? 170 : 90 }];
    if (family === 6) {
      l.rotatingBarrierSpeed = .8 + tier * .1;
      l.rotatingBarriers = [{ x: 180, y: 450, w: 90, h: 14 }];
    }
    l.hint = [cut(x, 165 + tier * 5, 220 + tier * 5)];
    l.lesson = 'Cut the shelf, then take the portal around the central heat. The exit field adjusts the landing.';
  } else if (family === 5) {
    l.drop.y = 94 + tier * 6;
    l.wood = [{ x: 180, y: 200 + tier * 6, w: 95, h: 16 }];
    l.magneticField = { x: 0, y: -.0012 - tier * .000025 };
    l.magneticZones = [{ x: 180, y: 350, w: 120, h: 180 + tier * 6 }];
    l.thermalZone = true;
    l.thermalZones = [{ x: 80, y: 370, w: 55, h: 150 }];
    l.hint = [cut(180, 175 + tier * 6, 230 + tier * 6)];
    l.lesson = 'Split the shelf and fall into the upward magnetic field. Momentum carries Cloud through; avoid the left furnace.';
  } else if (family === 8) {
    l.drop = { x: 75 + tier * 3, y: 103 + tier * 3 };
    l.flower = flower(315); l.thorns = [{ x: 0, y: 568, w: 245 }];
    l.magneticField = { x: .0001, y: -.00005 };
    l.magneticZones = [
      { x: 180, y: 250, w: 350, h: 200 },
      { x: 180, y: 480, w: 350, h: 140, field: { x: -.00012 - tier * .00001, y: 0 } },
    ];
    l.hint = [ramp(55 + tier * 3, 210 + tier * 4, 170, 300), ramp(160, 360, 270 - tier * 2, 430)];
    l.lesson = 'Build two catch ramps. The upper field pulls right; the lower field reverses polarity to brake the landing.';
  } else if (family === 9) {
    const x = 65 + tier * 3;
    l.drop.y = 88 + tier * 5;
    l.soil = [{ x, y: 475, w: 95, h: 18 }];
    l.wood = [{ x, y: 210, w: 90, h: 18 }, { x: 180, y: 200, w: 100, h: 18 }];
    l.weights = [{ x, y: 170, w: 40, h: 40 }];
    l.switches = [{ button: { x, y: 450, w: 80, h: 12 }, gate: { x: 180, y: 260 + tier * 7, w: 110, h: 18 }, minMass: 2 }];
    l.magneticField = { x: 0, y: .00015 + tier * .00002 };
    l.magneticZones = [{ x: 180, y: 390, w: 100, h: 180 }];
    l.thermalZone = true;
    l.thermalZones = [{ x: 180, y: 385, w: 80, h: 140 + tier * 5 }];
    l.hint = [cut(x, 185, 240), cut(180, 175, 225)];
    l.lesson = 'Free the heavy key, then split the center shelf. Let the gate open; the downward field speeds Cloud through the heat.';
  }
  l.par = l.hint.length;
  const length = l.hint.reduce((sum, hint) => sum + (hint.kind === 'draw'
    ? hint.pts.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - hint.pts[i].x, p.y - hint.pts[i].y), 0) : 0), 0);
  l.ink = length ? Math.ceil(length * 1.12 + 6) : 0;
  l.hintText = l.lesson;
  return l;
});
