import type { HintStep, Level } from './levels';

const TIERS = ['Aftermath', 'Abyss', 'Collapse', 'Eclipse', 'Event Horizon'];
const TRIALS = ['Triple Cipher', 'Leftward Echo', 'Ropebound Lock', 'Redshift Relay',
  'Furnace Passage', 'Threefold Machine', 'Entropy Key', 'Magnetic Afterimage',
  'Double Guillotine', 'Ashfall Stair', 'Terminal Protocol'];
const cut = (x: number, y: number): HintStep =>
  ({ kind: 'slice', pts: [{ x, y: y - 27 }, { x, y: y + 27 }] });

/** New disciplines for 56–110; original Void stages are deliberately untouched. */
export const VOID_EXPANSION: Level[] = Array.from({ length: 55 }, (_, i) => {
  const tier = Math.floor(i / 11), family = i % 11, c = 176 + tier * 5;
  const l: Level = {
    id: 56 + i, name: `${TIERS[tier]} ${TRIALS[family]}`,
    lesson: '', hintText: '', ink: 0, maxInkLength: 0, par: 1,
    drop: { x: c, y: 66 + tier * 4 }, flower: { x: c, y: 548, base: 590 },
    soil: [], wood: [], stones: [], hint: [],
    thorns: [{ x: 0, y: 568, w: c - 32 }, { x: c + 32, y: 568, w: 328 - c }],
    hyperSensitiveScale: .55 - tier * .02,
    voidProtocol: {
      shadow: true, shadowPeriod: 1.24 - tier * .04, illuminatedFor: .23 - tier * .015,
      touchRevealSeconds: .5 - tier * .035, decaySeconds: 1.5, decayingPlatforms: [],
      gravityMultiplier: 3.05 + tier * .2, gravityAmplitude: .24 + tier * .02,
      gravityPeriod: 1.65 - tier * .1, maxVelocity: 10.4 - tier * .2,
    },
  };
  const exitAt = (x: number, entryY = 370, exitY = 255) => {
    l.portals = [{ entry: { x: c, y: entryY }, exit: { x, y: exitY }, r: 22, rotation: 0 }];
    l.flower.x = x;
    l.thorns = [{ x: 0, y: 568, w: x - 30 }, { x: x + 30, y: 568, w: 330 - x }];
  };
  let limit = 4.3;
  if (family === 0) {
    l.wood = [185, 305, 425].map((y, n) => ({ x: c, y: y + tier * 4, w: 100 - n * 14 - tier * 3, h: 16 }));
    l.hint = l.wood.map(b => cut(c, b.y));
    l.lasers = [{ a: { x: 85, y: 260 }, b: { x: 85, y: 535 } },
      { a: { x: 280, y: 260 }, b: { x: 280, y: 535 } }];
    limit = 5.1;
    l.lesson = 'Three shadow seals, three exact cuts. Clear them top to bottom, then Drop down the narrow neon corridor.';
  } else if (family === 1) {
    const x = 284 - tier * 3;
    l.drop = { x, y: 62 + tier * 4 };
    l.ink = l.maxInkLength = 145;
    l.hint = [{ kind: 'draw', pts: [{ x: x + 22, y: 204 + tier * 6 }, { x: x - 86, y: 272 + tier * 6 }] }];
    l.winds = [{ x: 180, y: 390, w: 360, h: 290, force: { x: -.00024 - tier * .000015, y: 0 } }];
    l.portals = [{ entry: { x: 88, y: 444 + tier * 4 }, exit: { x: 48 + tier * 3, y: 493 }, r: 30, rotation: 0 }];
    l.flower.x = 48 + tier * 3;
    l.thorns = [{ x: 110, y: 568, w: 250 }];
    l.lesson = 'Reverse your instincts: draw down to the left, then Drop immediately. The dying ramp and left wind must find the red exit.';
  } else if (family === 2) {
    const x = 64 + tier * 4;
    l.wood = [{ x: x - 30, y: 55, w: 12, h: 12 }, { x: x + 30, y: 55, w: 12, h: 12 }];
    l.weights = [{ x, y: 154 + tier * 3, w: 38, h: 38 }];
    l.ropes = [{ from: 0, to: 0, toWeight: true, pointB: { x: -12, y: 0 } },
      { from: 1, to: 0, toWeight: true, pointB: { x: 12, y: 0 } }];
    l.soil = [{ x, y: 475, w: 85, h: 16 }];
    l.switches = [{ button: { x, y: 450, w: 72, h: 12 }, gate: { x: c, y: 215, w: 96, h: 16 }, minMass: 2 }];
    l.hint = [{ kind: 'slice', pts: [{ x: x - 48, y: 108 }, { x: x + 48, y: 108 }] }];
    exitAt(298 - tier * 4, 350 + tier * 5);
    l.lesson = 'A rope-bound counterweight is the key. Sever both cords in one swipe, let it press the switch, then Drop through the portal lock.';
  } else if (family === 3) {
    const x = 72 + tier * 3, end = 304 - tier * 3, y = 132 + tier * 4;
    l.wood = [{ x: c, y, w: 90, h: 14 }];
    l.hint = [cut(c, y)];
    l.portals = [
      { entry: { x: c, y: 205 }, exit: { x, y: 28 }, r: 20, rotation: 0 },
      { entry: { x, y: 515 }, exit: { x: end, y: 255 + tier * 5 }, r: 22, rotation: 0 },
    ];
    l.flower.x = end; l.thorns = [{ x: 0, y: 568, w: 245 }];
    l.rotatingBarrierSpeed = 2.1 + tier * .18;
    l.rotatingBarriers = [{ x: 184, y: 395, w: 130, h: 12 }];
    l.lasers = [{ a: { x: 185, y: 280 }, b: { x: 185, y: 535 } }];
    l.lesson = 'Cut the first seal. Both redshift portals are compulsory: fall through the left shaft long enough for the relay to re-arm.';
  } else if (family === 4) {
    const y = 222 + tier * 7;
    l.wood = [{ x: c, y, w: 88, h: 16 }];
    l.hint = [cut(c, y)];
    l.thermalZone = true;
    l.thermalZones = [{ x: c, y: 325, w: 96, h: 150 }];
    l.magneticField = { x: 0, y: .0001 + tier * .000015 };
    l.magneticZones = [{ x: c, y: 315, w: 110, h: 140 }];
    exitAt(300 - tier * 3, 402 + tier * 4, 260);
    l.lasers = [{ a: { x: 245, y: 430 }, b: { x: 350, y: 430 },
      pulse: { period: 1.6, onTime: .27, phase: .4 } }];
    l.lesson = 'Split the furnace seal and Drop. The downward field must get Cloud through the heat before two seconds, then time the exit laser.';
  } else if (family === 5) {
    l.wood = [{ x: 30, y: 55, w: 12, h: 12 }, { x: 96, y: 55, w: 12, h: 12 },
      { x: 135, y: 145, w: 22, h: 10, dynamic: true }];
    l.weights = [{ x: 60, y: 145 + tier * 2, w: 36, h: 36 },
      { x: 300, y: 164, w: 36, h: 36 }, { x: 60, y: 335, w: 36, h: 36 }];
    l.ropes = [{ from: 0, to: 0, toWeight: true, pointB: { x: -12, y: 0 } },
      { from: 1, to: 0, toWeight: true, pointB: { x: 12, y: 0 } },
      { from: 0, fromWeight: true, to: 2 }];
    l.soil = [{ x: 60, y: 285, w: 88, h: 16 }, { x: 300, y: 475, w: 88, h: 16 },
      { x: 60, y: 525, w: 88, h: 16 }];
    l.switches = [
      { button: { x: 60, y: 260, w: 72, h: 12 }, gate: { x: 300, y: 205, w: 78, h: 16 }, minMass: 2 },
      { button: { x: 300, y: 450, w: 72, h: 12 }, gate: { x: 60, y: 375, w: 78, h: 16 }, minMass: 2 },
      { button: { x: 60, y: 500, w: 72, h: 12 }, gate: { x: c, y: 245 + tier * 5, w: 96, h: 16 }, minMass: 2 },
    ];
    l.hint = [{ kind: 'slice', pts: [{ x: 10, y: 103 }, { x: 122, y: 103 }] }];
    limit = 5.6;
    l.lesson = 'Three counterweights, three locks. Sever both anchor cords, wait for the complete cascade, then Drop. Cloud cannot activate the switches.';
  } else if (family === 6) {
    const x = 54 + tier * 4;
    l.soil = [{ x, y: 205 + tier * 3, w: 85, h: 14 }, { x, y: 475, w: 90, h: 16 }];
    l.voidProtocol!.decayingPlatforms = [0];
    l.weights = [{ x, y: 174 + tier * 3, w: 38, h: 38 }];
    l.switches = [{ button: { x, y: 450, w: 75, h: 12 }, gate: { x: c, y: 210, w: 96, h: 16 }, minMass: 2 }];
    l.wood = [{ x: c, y: 315 + tier * 5, w: 85, h: 14 }];
    l.hint = [cut(c, 315 + tier * 5)];
    exitAt(300 - tier * 3, 405, 260);
    limit = 4.9;
    l.lesson = 'Slice the transit seal. The key’s platform decays after 1.5s; wait for its heavy switch to open Cloud’s gate, then Drop.';
  } else if (family === 7) {
    const x = 73 + tier * 3, y = 135 + tier * 4;
    l.drop = { x, y: 63 };
    l.ink = l.maxInkLength = 105;
    l.wood = [{ x, y, w: 75, h: 14 }];
    l.hint = [cut(x, y), { kind: 'draw', pts: [{ x: x - 22, y: 193 + tier * 5 }, { x: x + 58, y: 253 + tier * 5 }] }];
    l.magneticField = { x: .00025 + tier * .000015, y: 0 };
    l.magneticZones = [{ x: 180, y: 390, w: 360, h: 290 }];
    l.portals = [{ entry: { x: 225 + tier * 4, y: 444 + tier * 3 }, exit: { x: 303 - tier * 3, y: 493 }, r: 30, rotation: 0 }];
    l.flower.x = 303 - tier * 3; l.thorns = [{ x: 0, y: 568, w: 245 }];
    limit = 5.1;
    l.lesson = 'First slice the source seal, then draw one short diagonal catch. Drop immediately: the magnetic corridor must carry Cloud before the ink dies.';
  } else if (family === 8) {
    const y = 207 + tier * 6;
    l.wood = [{ x: c, y, w: 92, h: 16 }];
    l.hint = [cut(c, y)];
    l.gravityFlipInterval = 1.45 - tier * .05;
    l.lasers = [
      { a: { x: 0, y: 350 }, b: { x: 360, y: 350 }, pulse: { period: 1.6, onTime: .25, phase: .15 } },
      { a: { x: 0, y: 450 }, b: { x: 360, y: 450 }, pulse: { period: 1.6, onTime: .25, phase: 0 } },
    ];
    l.lesson = 'Two guillotines share an offset pulse. Cut the shutter and choose a Drop window that clears both while gravity surges and reverses.';
  } else if (family === 9) {
    l.soil = [{ x: c, y: 180 + tier * 4, w: 104, h: 14 }];
    l.voidProtocol!.decayingPlatforms = [0];
    l.wood = [{ x: c, y: 300 + tier * 4, w: 85, h: 16 }, { x: c, y: 420 + tier * 3, w: 72, h: 16 }];
    l.hint = l.wood.map(b => cut(c, b.y));
    l.thermalZone = true;
    l.thermalZones = [{ x: c, y: 400, w: 100, h: 120 }];
    limit = 4.9;
    l.lesson = 'Cut both ash seals, then Drop onto the entropy stair. Once it decays, fall straight through the furnace without letting Cloud or debris linger.';
  } else {
    const x = 58 + tier * 3;
    l.soil = [{ x, y: 475, w: 88, h: 16 }, { x: c, y: 138, w: 85, h: 14 }];
    l.voidProtocol!.decayingPlatforms = [1];
    l.weights = [{ x, y: 157, w: 38, h: 38 }];
    l.switches = [{ button: { x, y: 450, w: 75, h: 12 }, gate: { x: c, y: 205, w: 96, h: 16 }, minMass: 2 }];
    l.wood = [{ x, y: 194 + tier * 3, w: 78, h: 16 },
      { x: c, y: 283 + tier * 4, w: 85, h: 14 }, { x: c, y: 365 + tier * 4, w: 75, h: 14 }];
    l.hint = l.wood.map(b => cut(b.x, b.y));
    exitAt(301 - tier * 3, 452, 255);
    l.flower.y = 410;
    l.flower.base = 450;
    l.soil.push({ x: l.flower.x, y: 450, w: 88, h: 16 });
    l.lasers = [{ a: { x: 248, y: 355 }, b: { x: 350, y: 355 },
      pulse: { period: 1.7, onTime: .28, phase: .45 } }];
    l.gravityFlipInterval = 1.6 - tier * .04;
    l.rotatingBarrierSpeed = 2.3 + tier * .2;
    l.rotatingBarriers = [{ x: 170, y: 500, w: 130, h: 12 }];
    limit = 5.7;
    l.lesson = 'Free the key and split both transit seals. Wait for the entropy floor and lock, then use the portal and dark laser pulse to reach the elevated flower.';
  }
  l.par = l.hint.length;
  l.countdownTimer = limit - tier * .15;
  l.hardcore = { timeLimit: l.countdownTimer, goldTime: l.countdownTimer - .55, maxStrokes: l.par, gravityScale: 1 };
  l.hintText = l.lesson;
  return l;
});
