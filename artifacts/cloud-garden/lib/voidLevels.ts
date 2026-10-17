import type { HintStep, Level } from './levels';
import { VOID_EXPANSION } from './voidExpansion';

const TIERS = ['Null', 'Rift', 'Oblivion', 'Singularity', 'Void'];
const DISCIPLINES = ['Shadow Seal', 'Dying Arc', 'Suspended Coffin', 'Deadweight Code',
  'Blind Transit', 'Entropy Floor', 'Twin Seals', 'Gravity Guillotine',
  'Black Chain', 'Fleeting Bridge', 'Protocol Zero'];
const cut = (x: number, y: number): HintStep =>
  ({ kind: 'slice', pts: [{ x, y: y - 26 }, { x, y: y + 26 }] });
const ramp = (x: number, y: number, dx: number, dy: number): HintStep =>
  ({ kind: 'draw', pts: [{ x, y }, { x: x + dx, y: y + dy }] });

/**
 * Eleven independently authored disciplines, with five progressively tighter
 * geometric/physics tiers. No level or save aliases any of the other modes.
 */
const ORIGINAL_VOID_LEVELS: Level[] = Array.from({ length: 55 }, (_, index) => {
  const tier = Math.floor(index / 11), family = index % 11;
  const center = 168 + tier * 6;
  const l: Level = {
    id: index + 1, name: `${TIERS[tier]} ${DISCIPLINES[family]}`,
    lesson: '', hintText: '', ink: 0, maxInkLength: 0, par: 1,
    drop: { x: center, y: 72 + tier * 3 },
    flower: { x: center, y: 548, base: 590 },
    soil: [], wood: [], stones: [], hint: [],
    thorns: [{ x: 0, y: 568, w: center - 34 }, { x: center + 34, y: 568, w: 326 - center }],
    hyperSensitiveScale: .68 - tier * .035,
    voidProtocol: {
      shadow: true, shadowPeriod: 1.7 - tier * .12,
      illuminatedFor: .32 - tier * .025, touchRevealSeconds: .7 - tier * .05,
      decaySeconds: 1.5, decayingPlatforms: [],
      gravityMultiplier: 2 + tier * .25, gravityAmplitude: .14 + tier * .025,
      gravityPeriod: 2.1 - tier * .15, maxVelocity: 12 - tier * .4,
    },
  };
  const portalTo = (x: number, y = 250) => {
    l.portals = [{ entry: { x: center, y: 350 + tier * 6 }, exit: { x, y }, r: 22, rotation: 0 }];
    l.flower.x = x;
    l.thorns = [{ x: 0, y: 568, w: x - 32 }, { x: x + 32, y: 568, w: 328 - x }];
  };
  if (family === 0) {
    const y = 205 + tier * 9;
    l.wood = [{ x: center, y, w: 104 - tier * 6, h: 18 }];
    l.hint = [cut(center, y)];
    l.lasers = [{ a: { x: 60, y: 260 }, b: { x: 60, y: 525 } },
      { a: { x: 300, y: 260 }, b: { x: 300, y: 525 } }];
    l.lesson = 'Memorize the flashing seal. Touch to reveal it, slice its center, then Drop before the window closes.';
  } else if (family === 1 || family === 9) {
    const x = 74 + tier * 3;
    l.drop = { x, y: 68 + tier * 4 };
    l.ink = family === 1 ? 145 : 126;
    l.maxInkLength = l.ink;
    l.hint = [ramp(x - 22, 200 + tier * 7, family === 1 ? 108 : 94, family === 1 ? 68 : 66)];
    l.winds = [{ x: 180, y: 390, w: 360, h: 290, force: { x: .00023 + tier * .000015, y: 0 } }];
    l.portals = [{ entry: { x: 268, y: 440 + tier * 5 }, exit: { x: 305 - tier * 3, y: 493 }, r: 30, rotation: 0 }];
    l.flower.x = 305 - tier * 3;
    l.thorns = [{ x: 0, y: 568, w: 248 - tier * 3 }];
    if (family === 9) {
      l.soil = [{ x: 190, y: 390, w: 90, h: 12, angle: .25 }];
      l.voidProtocol!.decayingPlatforms = [0];
      l.lasers = [{ a: { x: 180, y: 80 }, b: { x: 180, y: 170 } }];
    }
    l.lesson = 'Draw the diagonal catch, then Drop immediately. Ink shrinks and dies after 1.5s; wind must carry Cloud into the exit portal.';
  } else if (family === 2) {
    l.wood = [{ x: center - 65, y: 55, w: 12, h: 12 },
      { x: center + 65, y: 55, w: 12, h: 12 },
      { x: center, y: 215 + tier * 9, w: 110, h: 16, dynamic: true }];
    l.ropes = [{ from: 0, to: 2, pointB: { x: -45, y: 0 } },
      { from: 1, to: 2, pointB: { x: 45, y: 0 } }];
    l.hint = [{ kind: 'slice', pts: [{ x: center - 95, y: 130 }, { x: center + 95, y: 130 }] }];
    l.lesson = 'Sever both suspension ropes in one swipe. Let the coffin fall, then release Cloud through the dark corridor.';
  } else if (family === 3 || family === 10) {
    const key = 52 + tier * 4;
    l.drop.x = center;
    l.soil = [{ x: key, y: 475, w: 88, h: 16 }];
    l.weights = [{ x: key, y: 158 + tier * 4, w: 38, h: 38 }];
    l.wood = [{ x: key, y: 198 + tier * 4, w: 80, h: 16 }];
    l.switches = [{ button: { x: key, y: 450, w: 75, h: 12 },
      gate: { x: center, y: 215, w: 96, h: 16 }, minMass: 2 }];
    l.hint = [cut(key, 198 + tier * 4)];
    portalTo(302 - tier * 3, 260 + tier * 5);
    if (family === 10) {
      l.wood.push({ x: center, y: 295 + tier * 4, w: 85, h: 14 });
      l.hint.push(cut(center, 295 + tier * 4));
      l.lasers = [{ a: { x: 250, y: 430 }, b: { x: 350, y: 430 },
        width: 5, pulse: { period: 1.55, onTime: .32, phase: .6 } }];
      l.rotatingBarrierSpeed = 1.3 + tier * .2;
      l.rotatingBarriers = [{ x: 170, y: 470, w: 125, h: 12 }];
    }
    l.lesson = family === 3
      ? 'Cut beneath the heavy key. Wait for the lock to open, then Drop into the portal. Cloud cannot press the key switch.'
      : 'Free the key, then split the second seal. Wait for the lock; launch through the portal during the laser’s dark pulse.';
  } else if (family === 4) {
    const x = 72 + tier * 5, y = 190 + tier * 8, exit = 292 + tier * 3;
    l.drop.x = x;
    l.wood = [{ x, y, w: 85, h: 16 }];
    l.hint = [cut(x, y)];
    l.portals = [{ entry: { x, y: 310 + tier * 7 }, exit: { x: exit, y: 265 }, r: 21, rotation: 0 }];
    l.flower.x = exit; l.thorns = [{ x: 0, y: 568, w: 248 }];
    l.rotatingBarrierSpeed = 1.4 + tier * .25;
    l.rotatingBarriers = [{ x: 175, y: 340 + tier * 7, w: 105, h: 12 }];
    l.lasers = [{ a: { x: 175, y: 380 }, b: { x: 175, y: 520 } }];
    l.lesson = 'Split the vanishing shelf. The portal is the only safe passage around the neon windmill and laser.';
  } else if (family === 5) {
    l.soil = [{ x: center, y: 215 + tier * 6, w: 110, h: 14 }];
    l.voidProtocol!.decayingPlatforms = [0];
    l.wood = [{ x: center, y: 335 + tier * 4, w: 88, h: 16 }];
    l.hint = [cut(center, 335 + tier * 4)];
    l.lesson = 'Slice the lower seal, then Drop onto the entropy floor. It physically shrinks and disappears 1.5s after your first touch.';
  } else if (family === 6 || family === 7) {
    l.wood = [{ x: center, y: 190 + tier * 8, w: 94, h: 16 }];
    l.hint = [cut(center, 190 + tier * 8)];
    if (family === 6) {
      l.wood.push({ x: center, y: 345 + tier * 5, w: 78, h: 16 });
      l.hint.push(cut(center, 345 + tier * 5));
      l.lesson = 'Two seals, exactly two strokes. Remember their lit positions and commit before hyper-gravity catches you.';
    } else {
      l.gravityFlipInterval = 1.6 - tier * .08;
      l.laserGrid = true;
      l.lasers = [{ a: { x: 0, y: 410 + tier * 5 }, b: { x: 360, y: 410 + tier * 5 },
        width: 5, pulse: { period: 1.3, onTime: .26, phase: .2 } }];
      l.lesson = 'Slice the shutter, then time Drop into the laser’s dark pulse. Hyper-gravity surges and periodically reverses.';
    }
  } else {
    l.wood = [{ x: 30, y: 55, w: 12, h: 12 }, { x: 100, y: 55, w: 12, h: 12 },
      { x: 130, y: 150, w: 22, h: 10, dynamic: true }];
    l.weights = [{ x: 65, y: 150 + tier * 3, w: 38, h: 38 },
      { x: 295, y: 165 + tier * 3, w: 38, h: 38 }];
    l.ropes = [{ from: 0, to: 0, toWeight: true, pointB: { x: -12, y: 0 } },
      { from: 1, to: 0, toWeight: true, pointB: { x: 12, y: 0 } },
      { from: 0, fromWeight: true, to: 2 }];
    l.soil = [{ x: 65, y: 475, w: 90, h: 16 }, { x: 295, y: 475, w: 90, h: 16 }];
    l.switches = [
      { button: { x: 65, y: 450, w: 75, h: 12 }, gate: { x: 295, y: 210, w: 80, h: 16 }, minMass: 2 },
      { button: { x: 295, y: 450, w: 75, h: 12 }, gate: { x: center, y: 230 + tier * 5, w: 100, h: 16 }, minMass: 2 },
    ];
    l.hint = [{ kind: 'slice', pts: [{ x: 10, y: 105 }, { x: 125, y: 105 }] }];
    l.lesson = 'Cut both anchor ropes. Wait for the first counterweight to release the second, opening Cloud’s central lock. Then Drop.';
  }
  l.par = l.hint.length;
  const time = (family === 8 || family === 10 ? 5.5 : 3.8) - tier * .25;
  l.countdownTimer = time;
  l.hardcore = { timeLimit: time, goldTime: time - .55, maxStrokes: l.par, gravityScale: 1 };
  l.hintText = l.lesson;
  return l;
});

export const VOID_LEVELS: Level[] = [...ORIGINAL_VOID_LEVELS, ...VOID_EXPANSION]
  .map((level) => ({ ...level, visualMode: 'void' }));
