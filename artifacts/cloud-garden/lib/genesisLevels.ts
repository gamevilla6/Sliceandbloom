import type { Level } from './levels';

const TIERS = ['Dawn', 'Echo', 'Prism', 'Nova', 'Genesis'];
const FAMILIES = ['Ghost Seal', 'Micro Current', 'Glass Passage', 'Pressure Key',
  'Sky Relay', 'Twin Flick', 'Closing Window', 'Blind Windmill', 'Master Lock'];
const cut = (x: number, a: number, b: number) => ({ kind: 'slice' as const, pts: [{ x, y: a }, { x, y: b }] });
const flower = (x: number) => ({ x, y: 548, base: 590 });
const draw = (x: number, y: number, dx = 16, dy = 10) =>
  ({ kind: 'draw' as const, pts: [{ x, y }, { x: x + dx, y: y + dy }] });

/**
 * Five authored variations of nine arcade disciplines. These are independent
 * layouts, not campaign aliases, and have their own persistent namespace.
 */
export const GENESIS_LEVELS: Level[] = Array.from({ length: 45 }, (_, index) => {
  const tier = Math.floor(index / 9), family = index % 9, id = index + 1;
  const hidden = family === 0 || family === 7 || family === 8 || (tier > 1 && family === 3);
  const inkFraction = [0, 1, 2, 3, 4, 6, 8].includes(family) ? .05 : .10;
  const scale = .65 - tier * .04;
  const l: Level = {
    id, name: `${TIERS[tier]} ${FAMILIES[family]}`,
    lesson: '', hintText: '', ink: 400 * inkFraction, maxInkLength: 400 * inkFraction,
    strictInkLength: inkFraction, inkLimitPercent: inkFraction * 100,
    hyperSensitiveScale: scale, invisibleObstacles: hidden,
    drop: { x: 180, y: 90 }, flower: flower(180),
    soil: [], wood: [], stones: [],
    thorns: [{ x: 0, y: 568, w: 140 }, { x: 220, y: 568, w: 140 }],
    hint: [], par: 1, laserGrid: false, gravityFlipInterval: 0, rotatingBarrierSpeed: 0,
  };
  let limit = 7;
  if (family === 0) {
    limit = 5;
    l.drop.y = 80 + tier * 7;
    l.wood = [{ x: 180, y: 200 + tier * 13, w: 90 + tier * 8, h: 18 }];
    l.hint = [cut(180, 175 + tier * 13, 225 + tier * 13)];
    l.lesson = 'Five seconds. Touch the hidden shelf to reveal it, slice through its center, then Drop.';
  } else if (family === 1 || family === 7) {
    const x = 70 + tier * 4, y = 230 + tier * 9;
    l.drop = { x: x + 10, y: 85 };
    l.flower = flower(320);
    l.thorns = [{ x: 0, y: 568, w: 255 }];
    l.hint = [draw(x, y, family === 1 ? 16 : 30, family === 1 ? 10 : 18)];
    l.winds = [{ x: 180, y: 395, w: 360, h: 330, force: { x: .0003, y: 0 } }];
    if (family === 7) {
      l.rotatingBarrierSpeed = .8 + tier * .15;
      l.rotatingBarriers = [{ x: 180 + tier * 5, y: 320 + tier * 7, w: 80 + tier * 6, h: 12 }];
    }
    l.lesson = family === 1
      ? 'Use a single tiny ramp, then let the wind carry the small drop. Only 5% ink.'
      : 'Touch to reveal the windmill. A short 10%-ink ramp must carry the tiny drop past it.';
  } else if (family === 2) {
    const x = 70 + tier * 7, exit = 280 + tier * 9;
    l.drop = { x, y: 80 };
    l.wood = [{ x, y: 180 + tier * 9, w: 85 + tier * 6, h: 16 }];
    l.portals = [{ entry: { x, y: 280 + tier * 8 }, exit: { x: exit, y: 220 + tier * 12 }, r: 22, rotation: 0 }];
    l.flower = flower(exit); l.thorns = [{ x: 0, y: 568, w: 240 }];
    l.lasers = [{ a: { x: 180, y: 340 }, b: { x: 180, y: 525 } }];
    l.hint = [cut(x, 155 + tier * 9, 205 + tier * 9)];
    l.lesson = 'Split the shelf, then enter the left portal. The glass passage skips the central laser.';
  } else if (family === 3 || family === 8) {
    limit = family === 8 ? 9 : 7;
    const keyX = 60 + tier * 5, exit = 310 - tier * 5;
    l.drop = { x: 180, y: 80 };
    l.soil = [{ x: keyX, y: 475, w: 90, h: 18 }];
    l.wood = [{ x: keyX, y: 210 + tier * 4, w: 80, h: 18 }];
    l.weights = [{ x: keyX, y: 170 + tier * 4, w: 40, h: 40 }];
    l.switches = [{ button: { x: keyX, y: 450, w: 75, h: 12 }, gate: { x: 180, y: 190 + tier * 7, w: 100, h: 18 }, minMass: 2 }];
    l.portals = [{ entry: { x: 180, y: 310 + tier * 8 }, exit: { x: exit, y: 240 + tier * 10 }, r: 22, rotation: 0 }];
    l.flower = flower(exit); l.thorns = [{ x: 0, y: 568, w: 245 }];
    l.hint = [cut(keyX, 185 + tier * 4, 240 + tier * 4)];
    if (family === 8) {
      l.laserGrid = true; l.gravityFlipInterval = 1.1;
      l.lasers = [{ a: { x: 255, y: 430 }, b: { x: 350, y: 430 }, width: 5,
        pulse: { period: 1.8, onTime: .35, phase: .4 } }];
      l.crushingWalls = [{ y: 400, h: 360, width: 24, startGap: 360, endGap: 100, speed: 10 + tier }];
    }
    l.lesson = family === 3
      ? 'Cut under the heavy key. Let it open the gate before Drop; the tiny Cloud cannot press the switch.'
      : 'Reveal and free the hidden key. Open the gate, then time the portal exit against the pulse, gravity clock and closing walls.';
  } else if (family === 4) {
    limit = 8;
    l.drop = { x: 180, y: 75 };
    l.wood = [{ x: 180, y: 135 + tier * 2, w: 90 + tier * 5, h: 14 }];
    const exit = 300 - tier * 5;
    l.portals = [
      { entry: { x: 180, y: 190 }, exit: { x: 80, y: 65 }, r: 20, rotation: 0 },
      { entry: { x: 80, y: 520 }, exit: { x: exit, y: 240 + tier * 15 }, r: 20, rotation: 0 },
    ];
    l.flower = flower(exit); l.thorns = [{ x: 0, y: 568, w: 235 }];
    l.rotatingBarrierSpeed = .8 + tier * .12;
    l.rotatingBarriers = [{ x: 180, y: 420, w: 80 + tier * 10, h: 14 }];
    l.hint = [cut(180, 110 + tier * 2, 160 + tier * 2)];
    l.lesson = 'One slice starts the long sky relay. Both portals are necessary; avoid the windmill between them.';
  } else if (family === 5) {
    limit = 8;
    const x = 75 + tier * 4;
    l.drop = { x: x + 8, y: 90 };
    l.flower = flower(310 + tier * 5); l.thorns = [{ x: 0, y: 568, w: 245 }];
    l.winds = [{ x: 180, y: 380, w: 360, h: 330, force: { x: .00024, y: 0 } }];
    l.hint = [draw(x, 220 + tier * 8), draw(145 + tier * 4, 350 + tier * 6)];
    l.lesson = 'Two tiny ramps share a 10% ink budget. Build the upper ramp and lower catch before Drop.';
  } else if (family === 6) {
    limit = 7;
    l.drop.y = 80 + tier * 4;
    l.wood = [{ x: 180, y: 190 + tier * 9, w: 100 - tier * 5, h: 16 }];
    l.crushingWalls = [{ y: 370, h: 440, width: 24, startGap: 360, endGap: 90, speed: 12 + tier * 2 }];
    l.laserGrid = true;
    l.lasers = [{ a: { x: 0, y: 360 + tier * 15 }, b: { x: 360, y: 360 + tier * 15 }, width: 5,
      pulse: { period: 1.6, onTime: .25, phase: .7 } }];
    l.hint = [cut(180, 165 + tier * 9, 215 + tier * 9)];
    l.lesson = 'Slice the seal and release into the dark laser window. Stay central as the walls close.';
  }
  l.countdownTimer = limit;
  l.hardcore = { timeLimit: limit, goldTime: limit - .5, maxStrokes: l.hint.length, gravityScale: 1.05 };
  l.par = l.hint.length;
  l.hintText = l.lesson;
  return l;
});
