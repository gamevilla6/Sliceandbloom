import type { HintStep, Level } from './levels';

const TIERS = ['Aftermath', 'Abyss', 'Collapse', 'Eclipse', 'Event Horizon'];
const TRIALS = ['Crossfire Lattice', 'Dying Switchback', 'Counterweight Vault', 'Skyhook Relay',
  'Magnetic Crucible', 'Reversed Cascade', 'Vanishing Lock', 'Polarity Catch',
  'Pulse Corridor', 'Frozen Ash', 'Final Resonance'];
const cut = (x: number, y: number): HintStep =>
  ({ kind: 'slice', pts: [{ x, y: y - 27 }, { x, y: y + 27 }] });

/** Redesigned disciplines for 56–110; IDs and all earlier stages stay unchanged. */
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
  const exitAt = (x: number, entryY = 370, exitY = 255, entryX = c) => {
    l.portals = [{ entry: { x: entryX, y: entryY }, exit: { x, y: exitY }, r: 22, rotation: 0 }];
    l.flower.x = x;
    l.thorns = [{ x: 0, y: 568, w: x - 30 }, { x: x + 30, y: 568, w: 330 - x }];
  };
  let limit = 4.3;
  if (family === 0) {
    const x = 78 + tier * 3;
    l.drop.x = x;
    l.soil = [{ x: 180, y: 360, w: 22, h: 320 }];
    l.wood = [178, 306].map((y, n) => ({ x, y: y + tier * 4, w: 96 - n * 12 - tier * 3, h: 16 }));
    l.hint = l.wood.map(b => cut(x, b.y));
    exitAt(300 - tier * 3, 420, 245, x);
    l.lasers = [{ a: { x: 180, y: 290 }, b: { x: 180, y: 535 } },
      { a: { x: 245, y: 430 }, b: { x: 350, y: 430 }, pulse: { period: 1.65, onTime: .25, phase: .45 } }];
    limit = 4.8;
    l.lesson = 'Cut both left-hand lattice seals. The portal bypasses the center wall; time Drop so its exit clears the pulsing crossfire.';
  } else if (family === 1) {
    const x = 76 + tier * 3, y = 185 + tier * 5;
    l.drop = { x, y: 62 + tier * 4 };
    l.ink = l.maxInkLength = 184;
    l.hint = [{ kind: 'draw', pts: [{ x: x - 22, y }, { x: x + 52, y: y + 50 }, { x: x + 114, y: y + 95 }] }];
    l.winds = [{ x: 180, y: 390, w: 360, h: 290, force: { x: .00022 + tier * .000015, y: 0 } }];
    l.portals = [{ entry: { x: 254 + tier * 3, y: 438 + tier * 4 }, exit: { x: 298 - tier * 3, y: 493 }, r: 30, rotation: 0 }];
    l.flower.x = 298 - tier * 3;
    l.thorns = [{ x: 0, y: 568, w: 240 }];
    l.crushingWalls = [{ y: 370, h: 420, width: 24, startGap: 360, endGap: 100, speed: 18 + tier }];
    l.lesson = 'Draw one continuous two-part switchback and Drop immediately. The ink dies after 1.5s and the side walls close while wind carries Cloud to the portal.';
  } else if (family === 2) {
    const x = 300 - tier * 4, source = 76 + tier * 3;
    l.drop.x = source;
    l.wood = [{ x: x - 30, y: 55, w: 12, h: 12 }, { x: x + 30, y: 55, w: 12, h: 12 }];
    l.wood.push({ x: source, y: 312 + tier * 5, w: 88, h: 16 });
    l.weights = [{ x, y: 154 + tier * 3, w: 38, h: 38 }];
    l.ropes = [{ from: 0, to: 0, toWeight: true, pointB: { x: -12, y: 0 } },
      { from: 1, to: 0, toWeight: true, pointB: { x: 12, y: 0 } }];
    l.soil = [{ x, y: 475, w: 85, h: 16 }];
    l.switches = [{ button: { x, y: 450, w: 72, h: 12 }, gate: { x: source, y: 202, w: 96, h: 16 }, minMass: 2 }];
    l.hint = [{ kind: 'slice', pts: [{ x: x - 48, y: 108 }, { x: x + 48, y: 108 }] }, cut(source, 312 + tier * 5)];
    exitAt(c, 405, 250, source);
    l.lasers = [{ a: { x: 130, y: 430 }, b: { x: 235, y: 430 }, pulse: { period: 1.7, onTime: .25, phase: .5 } }];
    limit = 5;
    l.lesson = 'Sever the right-hand key ropes, then slice the left transit seal. Let the heavy lock open before timing Drop through the vault portal and exit beam.';
  } else if (family === 3) {
    const source = 82 + tier * 3, x = 282 - tier * 3, end = 58 + tier * 3, y = 156 + tier * 4;
    l.drop.x = source;
    l.wood = [{ x: source, y, w: 90, h: 14 }];
    l.hint = [cut(source, y)];
    l.portals = [
      { entry: { x: source, y: 235 }, exit: { x, y: 28 }, r: 20, rotation: 0 },
      { entry: { x, y: 515 }, exit: { x: end, y: 255 + tier * 5 }, r: 22, rotation: 0 },
    ];
    l.flower.x = end; l.thorns = [{ x: 115, y: 568, w: 245 }];
    l.soil = [{ x: 180, y: 350, w: 22, h: 450 }];
    l.rotatingBarrierSpeed = 2.1 + tier * .18;
    l.rotatingBarriers = [{ x: 184, y: 395, w: 130, h: 12 }];
    l.lasers = [{ a: { x: 185, y: 280 }, b: { x: 185, y: 535 } }];
    l.lesson = 'Slice the left launch seal. The first portal sends Cloud high into the right shaft; the second returns it over the left flower after the relay re-arms.';
  } else if (family === 4) {
    const x = 90 + tier * 5, y = 193 + tier * 6;
    l.drop.x = x;
    l.wood = [{ x, y, w: 88, h: 16 }];
    l.hint = [cut(x, y)];
    l.thermalZone = true;
    l.thermalZones = [{ x: 135, y: 335, w: 180, h: 170 }];
    l.magneticField = { x: .0012 + tier * .00002, y: 0 };
    l.magneticZones = [{ x: 135, y: 330, w: 170, h: 220 }];
    exitAt(292 - tier * 2, 410, 255, 140 + tier * 5);
    l.portals![0].r = 26;
    l.portals![0].rotation = .35;
    l.lasers = [{ a: { x: 245, y: 430 }, b: { x: 350, y: 430 },
      pulse: { period: 1.6, onTime: .27, phase: .4 } }];
    l.lesson = 'Split the crucible seal. The rightward field must bend Cloud into the offset portal before heat can build; its angled exit straightens the final fall past the pulse laser.';
  } else if (family === 5) {
    l.wood = [{ x: 264, y: 55, w: 12, h: 12 }, { x: 330, y: 55, w: 12, h: 12 },
      { x: 225, y: 145, w: 22, h: 10, dynamic: true }];
    l.weights = [{ x: 300, y: 145 + tier * 2, w: 36, h: 36 },
      { x: 60, y: 164, w: 36, h: 36 }, { x: 300, y: 335, w: 36, h: 36 }];
    l.ropes = [{ from: 0, to: 0, toWeight: true, pointB: { x: -12, y: 0 } },
      { from: 1, to: 0, toWeight: true, pointB: { x: 12, y: 0 } },
      { from: 0, fromWeight: true, to: 2 }];
    l.soil = [{ x: 300, y: 285, w: 88, h: 16 }, { x: 60, y: 475, w: 88, h: 16 },
      { x: 300, y: 525, w: 88, h: 16 }];
    l.switches = [
      { button: { x: 300, y: 260, w: 72, h: 12 }, gate: { x: 60, y: 205, w: 78, h: 16 }, minMass: 2 },
      { button: { x: 60, y: 450, w: 72, h: 12 }, gate: { x: 300, y: 375, w: 78, h: 16 }, minMass: 2 },
      { button: { x: 300, y: 500, w: 72, h: 12 }, gate: { x: c, y: 245 + tier * 5, w: 96, h: 16 }, minMass: 2 },
    ];
    l.hint = [{ kind: 'slice', pts: [{ x: 238, y: 103 }, { x: 350, y: 103 }] }];
    exitAt(232, 410, 255);
    limit = 5.6;
    l.lesson = 'Cut both right-hand anchors. Follow the reversed three-key cascade across the room; only then Drop into the return portal above the flower.';
  } else if (family === 6) {
    const x = 300 - tier * 3, source = 84 + tier * 3;
    l.drop.x = source;
    l.soil = [{ x: source, y: 185, w: 95, h: 14 },
      { x, y: 205 + tier * 3, w: 85, h: 14 }, { x, y: 475, w: 90, h: 16 }];
    l.voidProtocol!.decayingPlatforms = [0, 1];
    l.weights = [{ x, y: 174 + tier * 3, w: 38, h: 38 }];
    l.switches = [{ button: { x, y: 450, w: 75, h: 12 }, gate: { x: source, y: 285, w: 96, h: 16 }, minMass: 2 }];
    l.wood = [{ x: source, y: 130, w: 85, h: 14 }, { x: source, y: 355 + tier * 4, w: 80, h: 14 }];
    l.hint = l.wood.map(b => cut(source, b.y));
    exitAt(c, 430, 255, source);
    limit = 4.9;
    l.lesson = 'Cut the upper and lower launch seals. Both Cloud’s floor and the key’s floor vanish after 1.5s; let the key open the lock before the final portal fall.';
  } else if (family === 7) {
    const x = 286 - tier * 3, y = 135 + tier * 4;
    l.drop = { x, y: 63 };
    l.ink = l.maxInkLength = 105;
    l.wood = [{ x, y, w: 75, h: 14 }];
    l.hint = [cut(x, y), { kind: 'draw', pts: [{ x: x + 22, y: 193 + tier * 5 }, { x: x - 58, y: 253 + tier * 5 }] }];
    l.magneticField = { x: -.00025 - tier * .000015, y: 0 };
    l.magneticZones = [{ x: 180, y: 390, w: 360, h: 290 }];
    l.portals = [{ entry: { x: 135 - tier * 4, y: 444 + tier * 3 }, exit: { x: 57 + tier * 3, y: 493 }, r: 30, rotation: 0 }];
    l.flower.x = 57 + tier * 3; l.thorns = [{ x: 110, y: 568, w: 250 }];
    limit = 5.1;
    l.lesson = 'Slice the right source seal, then draw a short leftward catch. Drop immediately: reversed magnetic polarity must pull Cloud into the left portal before the ink dies.';
  } else if (family === 8) {
    const x = 290 - tier * 4, y = 185 + tier * 5;
    l.drop.x = l.flower.x = x;
    l.thorns = [{ x: 0, y: 568, w: x - 33 }];
    l.wood = [{ x, y, w: 92, h: 16 }];
    l.hint = [cut(x, y)];
    l.gravityFlipInterval = .95 - tier * .025;
    l.lasers = [310, 390, 470].map((beamY, n) => ({
      a: { x: 235, y: beamY }, b: { x: 350, y: beamY },
      pulse: { period: 1.7, onTime: .22, phase: .24 - n * .12 },
    }));
    l.crushingWalls = [{ y: 370, h: 420, width: 24, startGap: 360, endGap: 120, speed: 12 + tier * 2 }];
    l.lesson = 'Three offset beams guard the right corridor. Slice the shutter, then time Drop through every dark pulse before the walls close; gravity reverses during the fall.';
  } else if (family === 9) {
    const x = 276 - tier * 3;
    l.drop.x = x;
    l.soil = [{ x, y: 170 + tier * 4, w: 104, h: 14 }];
    l.voidProtocol!.decayingPlatforms = [0];
    l.wood = [{ x, y: 285 + tier * 4, w: 85, h: 16 }, { x, y: 395 + tier * 3, w: 72, h: 16 }];
    l.hint = l.wood.map(b => cut(x, b.y));
    l.thermalZone = true;
    l.thermalZones = [{ x, y: 350, w: 100, h: 160 }];
    l.gravityZones = [{ x, y: 460, w: 60, h: 60, duration: .18 }];
    exitAt(68 + tier * 3, 505, 255, x);
    limit = 4.9;
    l.lesson = 'Split both right-hand ash seals, then Drop onto the vanishing floor. Cross the furnace and brief gravity inversion to reach the return portal above the left flower.';
  } else {
    const x = 300 - tier * 3, source = 84 + tier * 3;
    l.drop.x = source;
    l.soil = [{ x, y: 475, w: 88, h: 16 }, { x: source, y: 140, w: 85, h: 14 }];
    l.voidProtocol!.decayingPlatforms = [1];
    l.weights = [{ x, y: 157, w: 38, h: 38 }];
    l.switches = [{ button: { x, y: 450, w: 75, h: 12 }, gate: { x: source, y: 205, w: 96, h: 16 }, minMass: 2 }];
    l.wood = [{ x, y: 194 + tier * 3, w: 78, h: 16 },
      { x: source, y: 280 + tier * 4, w: 85, h: 14 }, { x: source, y: 360 + tier * 4, w: 75, h: 14 }];
    l.hint = l.wood.map(b => cut(b.x, b.y));
    exitAt(210 - tier * 2, 452, 235, source);
    l.flower.y = 390;
    l.flower.base = 430;
    l.soil.push({ x: l.flower.x, y: 430, w: 70, h: 16 });
    l.lasers = [{ a: { x: 160, y: 320 }, b: { x: 260, y: 320 },
      pulse: { period: 1.7, onTime: .28, phase: .45 } }];
    l.crushingWalls = [{ y: 370, h: 420, width: 24, startGap: 360, endGap: 140, speed: 12 + tier * 2 }];
    l.magneticField = { x: 0, y: .00008 + tier * .000015 };
    l.magneticZones = [{ x: source, y: 300, w: 100, h: 240 }];
    limit = 5.7;
    l.lesson = 'Free the right key, split both left transit seals, then wait for the entropy floor and lock. Commit through the downward field, portal and dark exit beam before the walls close.';
  }
  l.par = l.hint.length;
  l.countdownTimer = limit - tier * .15;
  l.hardcore = { timeLimit: l.countdownTimer, goldTime: l.countdownTimer - .55, maxStrokes: l.par, gravityScale: 1 };
  l.hintText = l.lesson;
  return l;
});
