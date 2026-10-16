import type { Level, V } from './levels';
import type { Laser } from './hardcore';

const flower = (x: number) => ({ x, y: 548, base: 590 });
const draw = (...pts: V[]) => ({ kind: 'draw' as const, pts });
const cut = (x: number, y1: number, y2: number) => ({ kind: 'slice' as const, pts: [{ x, y: y1 }, { x, y: y2 }] });
const sweep = (x1: number, x2: number, y: number) => ({ kind: 'slice' as const, pts: [{ x: x1, y }, { x: x2, y }] });
const beam = (y: number, phase = 0, x1 = 0, x2 = 360): Laser => ({
  a: { x: x1, y }, b: { x: x2, y }, width: 5,
  pulse: { period: 1.8, onTime: .5, phase },
});
const crusher = (speed: number) => ({ y: 370, h: 440, width: 24, startGap: 360, endGap: 90, speed });
const centerSpikes = [{ x: 0, y: 568, w: 140 }, { x: 220, y: 568, w: 140 }];
const rightSpikes = [{ x: 0, y: 568, w: 250 }];
type Layout = Pick<Level, 'drop' | 'flower' | 'hint'> & Partial<Level>;

function puzzle(id: number, name: string, lesson: string, layout: Layout): Level {
  const length = layout.hint.reduce((sum, h) => sum + (h.kind === 'draw'
    ? h.pts.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - h.pts[i].x, p.y - h.pts[i].y), 0) : 0), 0);
  const ink = layout.maxInkLength ?? (length ? Math.ceil(length * 1.03 + 2) : 0);
  const par = layout.hint.length;
  return {
    id, name, lesson, hintText: lesson,
    soil: [], wood: [], stones: [], thorns: rightSpikes,
    laserGrid: true, gravityFlipInterval: 0,
    rotatingBarrierSpeed: layout.rotatingBarriers?.length ? .8 + (id - 26) * .045 : 0,
    ...layout,
    ink, maxInkLength: ink, par,
    hardcore: {
      timeLimit: Math.min(20, 18 - Math.floor((id - 26) / 5) + Math.max(0, par - 1)),
      goldTime: 10 + par * 1.2,
      maxStrokes: par + (id < 36 ? 1 : 0),
      gravityScale: 1.08,
    },
  };
}

/** Authored advanced layouts. Append only: existing Hardcore saves use indices. */
export const HARDCORE_EXPANSION: Level[] = [
  puzzle(26, 'Pulse Crossing', 'Draw the wind ramp. Watch the red gate: release so Cloud crosses while it is dark.', {
    drop: { x: 70, y: 80 }, flower: flower(315),
    winds: [{ x: 180, y: 300, w: 350, h: 350, force: { x: .00022, y: 0 } }],
    lasers: [beam(260)],
    hint: [draw({ x: 50, y: 300 }, { x: 220, y: 410 })],
  }),
  puzzle(27, 'Rotor Route', 'Stay high above the rotating paddle, then land right of the pillar.', {
    drop: { x: 65, y: 100 }, flower: flower(315), laserGrid: false,
    soil: [{ x: 185, y: 495, w: 24, h: 190 }],
    rotatingBarriers: [{ x: 180, y: 450, w: 140, h: 14 }],
    lasers: [{ a: { x: 35, y: 390 }, b: { x: 35, y: 540 } }],
    hint: [draw({ x: 45, y: 190 }, { x: 145, y: 240 }, { x: 285, y: 320 })],
  }),
  puzzle(28, 'Closing In', 'Cut the central shelf and drop straight down before the walls squeeze the corridor.', {
    drop: { x: 180, y: 80 }, flower: flower(180), thorns: centerSpikes,
    wood: [{ x: 180, y: 220, w: 110, h: 18 }],
    crushingWalls: [crusher(12)],
    lasers: [{ a: { x: 70, y: 260 }, b: { x: 70, y: 530 } }],
    hint: [cut(180, 190, 250)],
  }),
  puzzle(29, 'Alternating Current', 'Split the shelf. The two laser gates pulse out of phase; time your drop through both openings.', {
    drop: { x: 180, y: 80 }, flower: flower(180), thorns: centerSpikes,
    wood: [{ x: 180, y: 190, w: 100, h: 18 }],
    lasers: [beam(320), beam(445, .9)],
    hint: [cut(180, 160, 220)],
  }),
  puzzle(30, 'Gravity Clock', 'Cut the shelf and commit. Gravity reverses briefly every second after Drop.', {
    drop: { x: 180, y: 100 }, flower: flower(180), thorns: centerSpikes,
    wood: [{ x: 180, y: 200, w: 100, h: 18 }],
    gravityFlipInterval: 1, crushingWalls: [crusher(10)],
    lasers: [{ a: { x: 65, y: 250 }, b: { x: 65, y: 530 } }, { a: { x: 295, y: 250 }, b: { x: 295, y: 530 } }],
    hint: [cut(180, 170, 230)],
  }),
  puzzle(31, 'Twin Windmills', 'Draw over both windmills. Their solid arms sweep below the intended route.', {
    drop: { x: 55, y: 90 }, flower: flower(325),
    rotatingBarriers: [{ x: 110, y: 390, w: 100, h: 14 }, { x: 230, y: 475, w: 110, h: 14, speed: -1.05 }],
    winds: [{ x: 180, y: 250, w: 340, h: 240, force: { x: .0001, y: 0 } }],
    lasers: [{ a: { x: 40, y: 450 }, b: { x: 40, y: 540 } }],
    hint: [draw({ x: 35, y: 185 }, { x: 150, y: 245 }, { x: 285, y: 300 })],
  }),
  puzzle(32, 'Portal Furnace', 'Split the left shelf. The portal skips the windmill, but the exit laser still needs timing.', {
    drop: { x: 70, y: 100 }, flower: flower(295),
    wood: [{ x: 70, y: 190, w: 100, h: 18 }],
    portals: [{ entry: { x: 70, y: 320 }, exit: { x: 295, y: 260 }, r: 22, rotation: 0 }],
    rotatingBarriers: [{ x: 180, y: 350, w: 110, h: 14 }],
    crushingWalls: [crusher(6)], lasers: [beam(430, .35, 260, 350)],
    hint: [cut(70, 160, 220)],
  }),
  puzzle(33, 'Counter Spin', 'One leftward ramp clears both counter-rotating arms. Keep the exit over the left flower.', {
    drop: { x: 305, y: 80 }, flower: flower(40),
    thorns: [{ x: 90, y: 568, w: 270 }],
    rotatingBarriers: [{ x: 210, y: 450, w: 100, h: 14, speed: -1.2 }, { x: 125, y: 520, w: 75, h: 14 }],
    winds: [{ x: 180, y: 330, w: 340, h: 320, force: { x: -.00009, y: 0 } }],
    lasers: [{ a: { x: 325, y: 430 }, b: { x: 325, y: 540 } }],
    hint: [draw({ x: 325, y: 200 }, { x: 180, y: 290 }, { x: 80, y: 400 })],
  }),
  puzzle(34, 'Pressure Plate', 'Free the heavy key and let it open the gate. Watch the portal-exit laser before releasing Cloud.', {
    drop: { x: 180, y: 90 }, flower: flower(295),
    soil: [{ x: 60, y: 475, w: 100, h: 18 }],
    wood: [{ x: 60, y: 200, w: 90, h: 18 }],
    weights: [{ x: 60, y: 160, w: 40, h: 40 }],
    switches: [{ button: { x: 60, y: 450, w: 80, h: 12 }, gate: { x: 180, y: 220, w: 110, h: 20 }, minMass: 2 }],
    portals: [{ entry: { x: 180, y: 350 }, exit: { x: 295, y: 300 }, r: 22, rotation: 0 }],
    crushingWalls: [crusher(10)], lasers: [beam(430, .15, 255, 350)],
    hint: [cut(60, 175, 230)],
  }),
  puzzle(35, 'Inverted Relay', 'Cut the shelf. Follow both portals while the gravity clock interrupts the long middle fall.', {
    drop: { x: 180, y: 90 }, flower: flower(300),
    wood: [{ x: 180, y: 190, w: 100, h: 18 }], gravityFlipInterval: 1.1,
    portals: [
      { entry: { x: 180, y: 220 }, exit: { x: 80, y: 70 }, r: 22, rotation: 0 },
      { entry: { x: 80, y: 520 }, exit: { x: 300, y: 260 }, r: 22, rotation: 0 },
    ],
    rotatingBarriers: [{ x: 180, y: 410, w: 90, h: 14 }],
    lasers: [{ a: { x: 225, y: 360 }, b: { x: 225, y: 530 } }],
    hint: [cut(180, 160, 220)],
  }),
  puzzle(36, 'Glass Corridor', 'Draw above the rotor. There is no spare stroke now; pass the last laser before the walls close.', {
    drop: { x: 95, y: 100 }, flower: flower(300),
    crushingWalls: [crusher(12)],
    rotatingBarriers: [{ x: 170, y: 480, w: 100, h: 14 }],
    lasers: [beam(450, .3)],
    hint: [draw({ x: 75, y: 220 }, { x: 150, y: 290 }, { x: 205, y: 380 })],
  }),
  puzzle(37, 'Ten Percent', 'Only 10% ink: draw one tiny ramp. Let the strong wind do the rest.', {
    drop: { x: 70, y: 90 }, flower: flower(320),
    maxInkLength: 40, inkLimitPercent: 10,
    winds: [{ x: 180, y: 385, w: 360, h: 290, force: { x: .0003, y: 0 } }],
    lasers: [beam(320, .2, 160, 265)],
    hint: [draw({ x: 60, y: 230 }, { x: 90, y: 248 })],
  }),
  puzzle(38, 'Pendulum Clock', 'Cut both ropes, split the falling canopy, then drop through the pulsing lower gate.', {
    drop: { x: 180, y: 75 }, flower: flower(180), thorns: centerSpikes,
    wood: [{ x: 120, y: 70, w: 20, h: 14 }, { x: 240, y: 70, w: 20, h: 14 }, { x: 180, y: 220, w: 80, h: 18, dynamic: true }],
    ropes: [{ from: 0, to: 2, pointB: { x: -25, y: 0 } }, { from: 1, to: 2, pointB: { x: 25, y: 0 } }],
    gravityFlipInterval: 1, crushingWalls: [crusher(15)],
    lasers: [beam(470, .3)],
    hint: [sweep(90, 270, 130), cut(180, 190, 600)],
  }),
  puzzle(39, 'Rotor Staircase', 'Two ramps, no wasted strokes. Catch the second slope before the low windmills.', {
    drop: { x: 60, y: 100 }, flower: flower(310),
    soil: [{ x: 180, y: 515, w: 24, h: 150 }],
    rotatingBarriers: [{ x: 110, y: 490, w: 80, h: 14 }, { x: 230, y: 525, w: 70, h: 14, speed: -1.35 }],
    lasers: [{ a: { x: 30, y: 350 }, b: { x: 80, y: 350 } }],
    hint: [draw({ x: 40, y: 220 }, { x: 185, y: 300 }), draw({ x: 180, y: 360 }, { x: 290, y: 430 })],
  }),
  puzzle(40, 'Throat of Steel', 'Cut the shelf. The central portal bypasses the long rotor; the final red gate does not.', {
    drop: { x: 180, y: 90 }, flower: flower(180), thorns: centerSpikes,
    wood: [{ x: 180, y: 170, w: 100, h: 18 }],
    portals: [{ entry: { x: 180, y: 250 }, exit: { x: 180, y: 390 }, r: 20, rotation: 0 }],
    crushingWalls: [crusher(18)],
    rotatingBarriers: [{ x: 180, y: 310, w: 160, h: 14 }],
    lasers: [beam(460)],
    hint: [cut(180, 140, 200)],
  }),
  puzzle(41, 'Crossfire Junction', 'Snip both ropes, split the canopy, then draw right past the rotors. Time the lower laser.', {
    drop: { x: 140, y: 80 }, flower: flower(315),
    wood: [{ x: 80, y: 70, w: 20, h: 14 }, { x: 200, y: 70, w: 20, h: 14 }, { x: 140, y: 220, w: 120, h: 18, dynamic: true }],
    ropes: [{ from: 0, to: 2, pointB: { x: -40, y: 0 } }, { from: 1, to: 2, pointB: { x: 40, y: 0 } }],
    winds: [{ x: 180, y: 360, w: 340, h: 300, force: { x: .00014, y: 0 } }],
    rotatingBarriers: [{ x: 80, y: 440, w: 85, h: 14 }, { x: 210, y: 510, w: 70, h: 14 }],
    lasers: [beam(450, .1)],
    hint: [sweep(40, 240, 130), cut(140, 190, 600), draw({ x: 120, y: 290 }, { x: 265, y: 390 })],
  }),
  puzzle(42, 'Gravity Gauntlet', 'One cut opens the route. Alternating lasers, repeated flips, and closing walls leave little margin.', {
    drop: { x: 180, y: 75 }, flower: flower(180), thorns: centerSpikes,
    wood: [{ x: 180, y: 180, w: 100, h: 18 }],
    gravityFlipInterval: .85, crushingWalls: [crusher(16)],
    rotatingBarriers: [{ x: 70, y: 380, w: 75, h: 14 }, { x: 290, y: 380, w: 75, h: 14 }],
    lasers: [beam(300), beam(450, .9)],
    hint: [cut(180, 150, 210)],
  }),
  puzzle(43, 'Split-Second Keys', 'One horizontal cut frees both keys. Wait for both gates to open, then use the portal during laser downtime.', {
    drop: { x: 180, y: 75 }, flower: flower(180), thorns: centerSpikes,
    soil: [{ x: 60, y: 475, w: 90, h: 18 }, { x: 300, y: 475, w: 90, h: 18 }],
    wood: [{ x: 60, y: 200, w: 80, h: 18 }, { x: 300, y: 200, w: 80, h: 18 }],
    weights: [{ x: 60, y: 160, w: 40, h: 40 }, { x: 300, y: 160, w: 40, h: 40 }],
    switches: [
      { button: { x: 60, y: 450, w: 70, h: 12 }, gate: { x: 180, y: 190, w: 100, h: 18 }, minMass: 2 },
      { button: { x: 300, y: 450, w: 70, h: 12 }, gate: { x: 180, y: 290, w: 100, h: 18 }, minMass: 2 },
    ],
    portals: [{ entry: { x: 180, y: 330 }, exit: { x: 180, y: 450 }, r: 22, rotation: 0 }],
    crushingWalls: [crusher(10)],
    rotatingBarriers: [{ x: 180, y: 385, w: 110, h: 14 }],
    lasers: [beam(490, .1, 100, 260)],
    hint: [sweep(10, 350, 200)],
  }),
  puzzle(44, 'Final Compression', 'Draw a precise ramp to the angled portal. Cross the final pulse before the walls close.', {
    drop: { x: 70, y: 100 }, flower: flower(180), thorns: centerSpikes,
    crushingWalls: [crusher(20)], gravityFlipInterval: 1.2,
    portals: [{ entry: { x: 270, y: 420 }, exit: { x: 180, y: 390 }, r: 25, rotation: Math.PI / 6 }],
    rotatingBarriers: [{ x: 60, y: 440, w: 70, h: 14 }],
    lasers: [beam(470, .15)],
    hint: [draw({ x: 50, y: 200 }, { x: 170, y: 280 }, { x: 235, y: 355 })],
  }),
  puzzle(45, 'Crown of Chaos', 'Free the key, snip both ropes, split the center beam and the exit shelf. Drop through the final pulse before the walls close.', {
    drop: { x: 180, y: 90 }, flower: flower(295),
    soil: [{ x: 60, y: 475, w: 100, h: 18 }],
    wood: [
      { x: 60, y: 210, w: 90, h: 18 },
      { x: 120, y: 70, w: 20, h: 14 }, { x: 240, y: 70, w: 20, h: 14 },
      { x: 180, y: 230, w: 90, h: 18, dynamic: true },
      { x: 295, y: 260, w: 90, h: 18 },
    ],
    weights: [{ x: 60, y: 170, w: 40, h: 40 }],
    ropes: [{ from: 1, to: 3, pointB: { x: -30, y: 0 } }, { from: 2, to: 3, pointB: { x: 30, y: 0 } }],
    switches: [{ button: { x: 60, y: 450, w: 80, h: 12 }, gate: { x: 180, y: 160, w: 100, h: 20 }, minMass: 2 }],
    portals: [{ entry: { x: 180, y: 320 }, exit: { x: 295, y: 180 }, r: 22, rotation: 0 }],
    crushingWalls: [crusher(20)], gravityFlipInterval: .9,
    rotatingBarriers: [{ x: 180, y: 450, w: 100, h: 14 }],
    lasers: [beam(430, .6, 255, 350)],
    hint: [cut(60, 185, 240), sweep(90, 270, 130), cut(180, 200, 600), cut(295, 230, 300)],
  }),
];
