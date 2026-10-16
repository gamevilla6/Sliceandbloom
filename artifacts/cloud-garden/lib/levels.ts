import { BONUS_LEVELS } from './bonusLevels';
import { ADVANCED_LEVELS } from './advancedLevels';
import { EXPANSION_LEVELS } from './expansionLevels';
import { INFINITY_LEVELS } from './infinityLevels';
import type { MagneticZone } from './infinity';
import type { VoidRules } from './void';
import type { BlockSwitch, PortalPair, Slider, WindZone } from './mechanics';
import type { CrushingWalls, GravityZone, HardcoreRules, Laser } from './hardcore';

export interface V {
  x: number;
  y: number;
}
export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number;
  dynamic?: boolean;
}
export interface HintStep {
  kind: 'draw' | 'slice';
  pts: V[];
}
export interface Level {
  id: number;
  name: string;
  lesson: string;
  hintText: string;
  ink: number;
  par: number;
  drop: V;
  flower: { x: number; y: number; base: number };
  soil: Block[];
  wood: Block[];
  thorns: { x: number; y: number; w: number }[];
  stones: { x: number; y: number; r: number }[];
  hint: HintStep[];
  ropes?: { from: number; to: number; pointA?: V; pointB?: V; fromWeight?: boolean; toWeight?: boolean }[];
  winds?: WindZone[];
  movers?: Slider[];
  portals?: PortalPair[];
  switches?: BlockSwitch[];
  weights?: Block[];
  hardcore?: HardcoreRules;
  lasers?: Laser[];
  gravityZones?: GravityZone[];
  laserGrid?: boolean;
  /** Seconds between temporary, global gravity reversals after release. */
  gravityFlipInterval?: number;
  /** Radians per second; individual barriers can override the default. */
  rotatingBarrierSpeed?: number;
  rotatingBarriers?: (Block & { speed?: number })[];
  crushingWalls?: CrushingWalls[];
  /** Absolute, lifetime drawing budget in world units. */
  maxInkLength?: number;
  /** Display percentage of the 400-unit full ink budget. */
  inkLimitPercent?: number;
  /** Genesis modifiers. The countdown includes preparation after the first touch. */
  countdownTimer?: number;
  invisibleObstacles?: boolean;
  hyperSensitiveScale?: number;
  /** Fraction of the 400-unit full drawing budget: .05 or .10. */
  strictInkLength?: number;
  magneticField?: V;
  magneticZones?: MagneticZone[];
  thermalZone?: boolean;
  thermalZones?: Block[];
  rubeGoldbergChain?: boolean;
  /** Isolated Void Protocol modifiers; absent in the three existing modes. */
  voidProtocol?: VoidRules;
}

export const W = 360;
export const H = 640;
export const GROUND = 590;

export const LEVELS: Level[] = [
  {
    id: 1,
    name: 'First Drops',
    lesson: 'Draw a ramp with your finger, then press Drop.',
    hintText: 'Sweep one long slope from under Cloud down toward the flower.',
    ink: 420,
    par: 1,
    drop: { x: 90, y: 110 },
    flower: { x: 285, y: 548, base: GROUND },
    soil: [],
    wood: [],
    thorns: [],
    stones: [],
    hint: [{ kind: 'draw', pts: [{ x: 66, y: 196 }, { x: 150, y: 300 }, { x: 240, y: 392 }, { x: 262, y: 480 }] }],
  },
  {
    id: 2,
    name: 'Over the Wall',
    lesson: 'Ink is limited. Bend your ramp over the wall.',
    hintText: 'Start high on the left, clear the wall top, and end above the flower.',
    ink: 440,
    par: 1,
    drop: { x: 70, y: 100 },
    flower: { x: 295, y: 548, base: GROUND },
    soil: [{ x: 190, y: 480, w: 26, h: 220 }],
    wood: [],
    thorns: [],
    stones: [],
    hint: [{ kind: 'draw', pts: [{ x: 48, y: 180 }, { x: 140, y: 290 }, { x: 225, y: 360 }, { x: 262, y: 440 }] }],
  },
  {
    id: 3,
    name: 'Prickly Pit',
    lesson: 'Thorns dry Cloud out. Roll right past them.',
    hintText: 'Drop past the floating block, catch Cloud low on the left, then ramp over the thorns.',
    ink: 520,
    par: 1,
    drop: { x: 38, y: 110 },
    flower: { x: 310, y: 548, base: GROUND },
    soil: [{ x: 135, y: 300, w: 130, h: 24 }],
    wood: [],
    thorns: [{ x: 105, y: 568, w: 150 }],
    stones: [],
    hint: [{ kind: 'draw', pts: [{ x: 20, y: 380 }, { x: 150, y: 430 }, { x: 290, y: 470 }] }],
  },
  {
    id: 4,
    name: 'Snip the Plank',
    lesson: 'Switch to Slice. Swipe across the wooden plank, then Drop.',
    hintText: 'One swipe straight down through the plank frees Cloud.',
    ink: 0,
    par: 1,
    drop: { x: 180, y: 234 },
    flower: { x: 262, y: 402, base: 438 },
    soil: [{ x: 180, y: 430, w: 260, h: 20, angle: 0.3 }],
    wood: [{ x: 180, y: 255, w: 150, h: 18 }],
    thorns: [],
    stones: [],
    hint: [{ kind: 'slice', pts: [{ x: 165, y: 214 }, { x: 165, y: 296 }] }],
  },
  {
    id: 5,
    name: 'The Stubborn Gate',
    lesson: 'Cuts work on moving timber too. Free the path.',
    hintText: 'Slice the gate lengthwise-across so Cloud can shove the pieces aside.',
    ink: 0,
    par: 1,
    drop: { x: 60, y: 210 },
    flower: { x: 288, y: 322, base: 358 },
    soil: [{ x: 180, y: 330, w: 340, h: 20, angle: 0.28 }],
    wood: [{ x: 232, y: 288, w: 16, h: 90, angle: 0.28 }],
    thorns: [],
    stones: [],
    hint: [{ kind: 'slice', pts: [{ x: 198, y: 278 }, { x: 266, y: 298 }] }],
  },
  {
    id: 6,
    name: 'Bridge and Gate',
    lesson: 'Draw and slice together. Build the bridge, clear the gate.',
    hintText: 'Draw a bridge over the thorns, then swipe the gate on the far ledge.',
    ink: 300,
    par: 2,
    drop: { x: 60, y: 200 },
    flower: { x: 322, y: 388, base: 420 },
    soil: [
      { x: 70, y: 310, w: 140, h: 20, angle: 0.1 },
      { x: 300, y: 430, w: 130, h: 20 },
    ],
    wood: [{ x: 268, y: 385, w: 16, h: 70 }],
    thorns: [{ x: 140, y: 568, w: 100 }],
    stones: [],
    hint: [
      { kind: 'draw', pts: [{ x: 42, y: 250 }, { x: 140, y: 300 }, { x: 240, y: 380 }] },
      { kind: 'slice', pts: [{ x: 248, y: 395 }, { x: 290, y: 365 }] },
    ],
  },
  {
    id: 7,
    name: 'Loose Ends',
    lesson: 'Slice both ropes to lower the hanging bridge. Then Drop.',
    hintText: 'Swipe across both ropes halfway down. Let the wood land, then release Cloud.',
    ink: 0,
    par: 1,
    drop: { x: 180, y: 210 },
    flower: { x: 180, y: 548, base: GROUND },
    soil: [],
    wood: [
      { x: 100, y: 105, w: 28, h: 18 },
      { x: 260, y: 105, w: 28, h: 18 },
      { x: 180, y: 265, w: 170, h: 18, dynamic: true },
    ],
    ropes: [
      { from: 0, to: 2, pointB: { x: -65, y: 0 } },
      { from: 1, to: 2, pointB: { x: 65, y: 0 } },
    ],
    thorns: [],
    stones: [],
    hint: [{ kind: 'slice', pts: [{ x: 70, y: 180 }, { x: 285, y: 180 }] }],
  },
  {
    id: 8,
    name: 'Swing into Bloom',
    lesson: 'Snip the rope. The gate falls away and Cloud can roll.',
    hintText: 'Cut the rope above the gate, let it fall clear, then Drop.',
    ink: 180,
    par: 1,
    drop: { x: 60, y: 210 },
    flower: { x: 312, y: 322, base: 358 },
    soil: [{ x: 180, y: 330, w: 340, h: 20, angle: 0.28 }],
    wood: [
      { x: 228, y: 105, w: 32, h: 18 },
      { x: 228, y: 237, w: 18, h: 70, dynamic: true },
    ],
    ropes: [{ from: 0, to: 1, pointB: { x: 0, y: -30 } }],
    thorns: [],
    stones: [],
    hint: [{ kind: 'slice', pts: [{ x: 195, y: 163 }, { x: 265, y: 163 }] }],
  },
  {
    id: 9,
    name: 'Right as Rain',
    lesson: 'Think in reverse. Draw a ramp down to the left.',
    hintText: 'Start below Cloud, cross above the wall, and curl down toward the left flower.',
    ink: 430,
    par: 1,
    drop: { x: 290, y: 100 },
    flower: { x: 65, y: 548, base: GROUND },
    soil: [{ x: 170, y: 480, w: 26, h: 220 }],
    wood: [],
    ropes: [],
    thorns: [{ x: 140, y: 568, w: 140 }],
    stones: [],
    hint: [{ kind: 'draw', pts: [{ x: 312, y: 180 }, { x: 220, y: 290 }, { x: 135, y: 360 }, { x: 98, y: 440 }] }],
  },
  {
    id: 10,
    name: 'Narrow Escape',
    lesson: 'Clear the tall wall. The flower is on a raised bed.',
    hintText: 'Keep the middle of your ramp above the wall top, then slope down to the right ledge.',
    ink: 400,
    par: 1,
    drop: { x: 52, y: 100 },
    flower: { x: 310, y: 430, base: 470 },
    soil: [
      { x: 180, y: 420, w: 30, h: 340 },
      { x: 300, y: 480, w: 110, h: 20 },
    ],
    wood: [],
    thorns: [{ x: 0, y: 568, w: 240 }],
    stones: [],
    hint: [{ kind: 'draw', pts: [{ x: 32, y: 175 }, { x: 140, y: 215 }, { x: 220, y: 250 }, { x: 275, y: 355 }] }],
  },
  {
    id: 11,
    name: 'A Little Leap',
    lesson: 'Two short ramps can carry Cloud over a thorn field.',
    hintText: 'Draw an upper ramp to the middle, then a lower ramp that catches Cloud farther right.',
    ink: 340,
    par: 2,
    drop: { x: 55, y: 100 },
    flower: { x: 325, y: 548, base: GROUND },
    soil: [{ x: 205, y: 510, w: 30, h: 160 }],
    wood: [],
    thorns: [{ x: 0, y: 568, w: 270 }],
    stones: [],
    hint: [
      { kind: 'draw', pts: [{ x: 35, y: 180 }, { x: 145, y: 275 }] },
      { kind: 'draw', pts: [{ x: 155, y: 335 }, { x: 290, y: 430 }] },
    ],
  },
  {
    id: 12,
    name: 'Timber Tunnel',
    lesson: 'One long slice can open more than one wooden shelf.',
    hintText: 'Swipe straight down through both shelf centers. Let the pieces settle, then Drop.',
    ink: 0,
    par: 1,
    drop: { x: 180, y: 130 },
    flower: { x: 262, y: 402, base: 438 },
    soil: [{ x: 180, y: 430, w: 260, h: 20, angle: 0.3 }],
    wood: [
      { x: 180, y: 230, w: 120, h: 18 },
      { x: 180, y: 340, w: 160, h: 18 },
    ],
    thorns: [],
    stones: [],
    hint: [{ kind: 'slice', pts: [{ x: 180, y: 185 }, { x: 180, y: 380 }] }],
  },
  {
    id: 13,
    name: 'Double Decker',
    lesson: 'Two hanging bridges. Two rope cuts. One thirsty flower.',
    hintText: 'Cut across the top pair of ropes, then across the lower pair. Wait for both bridges to land.',
    ink: 0,
    par: 2,
    drop: { x: 180, y: 175 },
    flower: { x: 180, y: 548, base: GROUND },
    soil: [],
    wood: [
      { x: 100, y: 80, w: 28, h: 18 },
      { x: 260, y: 80, w: 28, h: 18 },
      { x: 180, y: 240, w: 170, h: 18, dynamic: true },
      { x: 60, y: 320, w: 28, h: 18 },
      { x: 300, y: 320, w: 28, h: 18 },
      { x: 180, y: 410, w: 200, h: 18, dynamic: true },
    ],
    ropes: [
      { from: 0, to: 2, pointB: { x: -65, y: 0 } },
      { from: 1, to: 2, pointB: { x: 65, y: 0 } },
      { from: 3, to: 5, pointB: { x: -85, y: 0 } },
      { from: 4, to: 5, pointB: { x: 85, y: 0 } },
    ],
    thorns: [],
    stones: [],
    hint: [
      { kind: 'slice', pts: [{ x: 70, y: 140 }, { x: 285, y: 140 }] },
      { kind: 'slice', pts: [{ x: 40, y: 355 }, { x: 320, y: 355 }] },
    ],
  },
  {
    id: 14,
    name: 'Left-Hand Gate',
    lesson: 'The garden slopes left. Snip the gate free.',
    hintText: 'Cut the single rope above the gate, wait for the timber to drop, then release Cloud.',
    ink: 130,
    par: 1,
    drop: { x: 300, y: 210 },
    flower: { x: 48, y: 322, base: 358 },
    soil: [{ x: 180, y: 330, w: 340, h: 20, angle: -0.28 }],
    wood: [
      { x: 132, y: 105, w: 32, h: 18 },
      { x: 132, y: 237, w: 18, h: 70, dynamic: true },
    ],
    ropes: [{ from: 0, to: 1, pointB: { x: 0, y: -30 } }],
    thorns: [{ x: 190, y: 568, w: 160 }],
    stones: [],
    hint: [{ kind: 'slice', pts: [{ x: 95, y: 163 }, { x: 165, y: 163 }] }],
  },
  {
    id: 15,
    name: 'High Wire',
    lesson: 'Build a bridge, snip the rope, then split the hanging gate.',
    hintText: 'Ramp over the thorns. Cut the long rope halfway down, then slice across the wooden gate before Drop.',
    ink: 300,
    par: 3,
    drop: { x: 60, y: 200 },
    flower: { x: 322, y: 388, base: 420 },
    soil: [
      { x: 70, y: 310, w: 140, h: 20, angle: 0.1 },
      { x: 300, y: 430, w: 130, h: 20 },
    ],
    wood: [
      { x: 268, y: 110, w: 30, h: 18 },
      { x: 268, y: 385, w: 16, h: 70, dynamic: true },
    ],
    ropes: [{ from: 0, to: 1, pointB: { x: 0, y: -30 } }],
    thorns: [{ x: 140, y: 568, w: 100 }],
    stones: [],
    hint: [
      { kind: 'draw', pts: [{ x: 42, y: 250 }, { x: 140, y: 300 }, { x: 240, y: 380 }] },
      { kind: 'slice', pts: [{ x: 245, y: 240 }, { x: 295, y: 240 }] },
      { kind: 'slice', pts: [{ x: 248, y: 395 }, { x: 290, y: 365 }] },
    ],
  },
  {
    id: 16,
    name: 'Full Bloom',
    lesson: 'Snip the canopy ropes, split the wood, and draw the final ramp.',
    hintText: 'Cut both ropes, slice vertically through the canopy center, then draw a ramp over the pillar toward the raised flower.',
    ink: 390,
    par: 3,
    drop: { x: 55, y: 100 },
    flower: { x: 310, y: 450, base: 490 },
    soil: [
      { x: 180, y: 480, w: 24, h: 220 },
      { x: 300, y: 500, w: 120, h: 20 },
    ],
    wood: [
      { x: 100, y: 80, w: 28, h: 18 },
      { x: 240, y: 80, w: 28, h: 18 },
      { x: 170, y: 240, w: 110, h: 18, dynamic: true },
    ],
    ropes: [
      { from: 0, to: 2, pointB: { x: -40, y: 0 } },
      { from: 1, to: 2, pointB: { x: 40, y: 0 } },
    ],
    thorns: [{ x: 0, y: 568, w: 360 }],
    stones: [],
    hint: [
      { kind: 'slice', pts: [{ x: 75, y: 140 }, { x: 265, y: 140 }] },
      { kind: 'slice', pts: [{ x: 170, y: 210 }, { x: 170, y: 275 }] },
      { kind: 'draw', pts: [{ x: 30, y: 190 }, { x: 120, y: 250 }, { x: 215, y: 330 }, { x: 275, y: 425 }] },
    ],
  },
  ...BONUS_LEVELS,
  ...ADVANCED_LEVELS,
  ...EXPANSION_LEVELS,
  ...INFINITY_LEVELS,
];

/** Public configuration alias for tools consuming the expanded campaign. */
export const levelsData = LEVELS;
