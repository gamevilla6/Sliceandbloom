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
  ropes?: { from: number; to: number; pointA?: V; pointB?: V }[];
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
];
