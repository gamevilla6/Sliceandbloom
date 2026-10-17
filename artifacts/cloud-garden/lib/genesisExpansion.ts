import type { HintStep, Level } from './levels';
import type { ReflectionPuzzle } from './genesis';

const CHAPTERS = ['Refraction', 'Counterweight', 'Twin Bloom', 'Resonance', 'Master Circuit'];
const DISCIPLINES = ['Glass Key', 'Prism Gate', 'Double Lift', 'Triple Tension', 'Twin Seed',
  'Ink Wings', 'Optical Counterweight', 'Prism Bloom', 'Paired Lift', 'Resonant Garden', 'Genesis Crown'];
const cut = (x: number, y: number, angle: number, span = 22): HintStep => ({
  kind: 'slice', pts: [{ x: x - Math.cos(angle) * span, y: y - Math.sin(angle) * span },
    { x: x + Math.cos(angle) * span, y: y + Math.sin(angle) * span }],
});

/**
 * Eleven newly authored mechanism arrangements, each with five spatial and
 * budget variations. No campaign arrays or layouts are reused here.
 */
export const GENESIS_EXPANSION: Level[] = Array.from({ length: 55 }, (_, index) => {
  const tier = Math.floor(index / 11), family = index % 11;
  const x = 174 + tier * 3;
  const mirrorCount = [0, 6, 7].includes(family) ? 1 : [1, 9, 10].includes(family) ? 2 : 0;
  const pulleyCount = [2, 6, 8, 9].includes(family) ? 2 : [3, 10].includes(family) ? 3 : 0;
  const split = [4, 5, 7, 8, 9, 10].includes(family);
  const hints: HintStep[] = [];
  const wedgeY = family === 5 ? 286 + tier * 7 : 330 + tier * 8 + (family % 3) * 9;
  const limit = Math.round((17 + pulleyCount * 3 + mirrorCount * 1.5 + (split ? 2 : 0)) * Math.pow(.92, tier) * 10) / 10;
  const cap = family === 5 ? Math.ceil(280 * Math.pow(.982, tier)) : Math.ceil(24 * Math.pow(.96, tier));
  const l: Level = {
    id: 46 + index, name: `${CHAPTERS[tier]} · ${DISCIPLINES[family]}`, visualMode: 'genesis',
    lesson: '', hintText: '', ink: cap, maxInkLength: cap, strictInkLength: cap / 400,
    inkLimitPercent: cap / 4, par: 1, drop: { x, y: 82 + tier * 2 },
    flower: { x, y: 548, base: 590 }, soil: [], wood: [], stones: [],
    thorns: [{ x: 0, y: 568, w: x - 42 + tier * 2 },
      { x: x + 42 - tier * 2, y: 568, w: 360 - x - 42 + tier * 2 }],
    hint: hints, laserReflection: mirrorCount > 0, multiStagePulley: pulleyCount > 0,
    splitDropletRequired: split, hardcoreCountdown: limit, countdownTimer: limit,
    hyperSensitiveScale: .82 - tier * .035,
  };
  if (mirrorCount) {
    const puzzle: ReflectionPuzzle = { mirrors: [], emitters: [], receivers: [] };
    for (let i = 0; i < mirrorCount; i++) {
      const mx = i === 0 ? 96 + tier * 2 : 264 - tier * 2;
      const my = 156 + (family % 3) * 7 + i * 32 + tier * 3;
      puzzle.mirrors.push({ x: mx, y: my, w: 64 - tier * 2, h: 6, angle: Math.PI / 2 });
      puzzle.emitters.push({ origin: { x: i === 0 ? 4 : 356, y: my }, direction: { x: i === 0 ? 1 : -1, y: 0 }, width: 4 });
      puzzle.receivers.push({ x: mx + (i === 0 ? -4 : 4), y: my + 82 + tier * 2, radius: 13 - tier * .5,
        gate: { x, y: 222 + i * 33 + tier * 2, w: 88 - tier * 3, h: 14 } });
      hints.push(cut(mx, my, i === 0 ? Math.PI / 4 : -Math.PI / 4));
    }
    l.reflectionPuzzle = puzzle;
  }
  if (pulleyCount) {
    l.pulleyPuzzle = { stages: Array.from({ length: pulleyCount }, (_, i) => ({
      weight: { x: [26, 334, 58][i], y: 118 + i * 6 + tier * 2, w: 22, h: 26 },
      gate: { x, y: 276 + i * 32 + tier * 2, w: 86 - tier * 3, h: 14 },
      button: { x: [26, 334, 58][i], y: 478 + i * 22 - tier * 3, w: 30, h: 10 },
      anchorY: 32,
    })) };
    hints.push(cut(26, 74 + tier, 0, 18));
  }
  if (split) {
    const reach = family === 5 ? 100 - tier * 2 : 57 - tier;
    const buds: NonNullable<Level['splitPuzzle']>['buds'] = [
      { x: x - reach, y: family === 5 ? wedgeY + 200 : 510 + tier * 2, base: family === 5 ? wedgeY + 240 : 552 + tier * 2 },
      { x: x + reach, y: family === 5 ? wedgeY + 200 : 510 + tier * 2, base: family === 5 ? wedgeY + 240 : 552 + tier * 2 },
    ];
    l.splitPuzzle = { wedge: { x, y: wedgeY, w: 64 - tier * 3, h: 34 }, buds, spread: 2.15 + tier * .035 };
    l.flower = { ...buds[0] };
    // Both channels remain lethal below the buds; collecting only one is not enough.
    l.thorns = [{ x: 0, y: 568, w: 360 }];
    if (family === 5) {
      hints.push(
        { kind: 'draw', pts: [{ x: x - 4, y: wedgeY + 60 }, { x: x - 85, y: wedgeY + 160 }] },
        { kind: 'draw', pts: [{ x: x + 4, y: wedgeY + 60 }, { x: x + 85, y: wedgeY + 160 }] },
      );
    }
  }
  if (!mirrorCount && !pulleyCount && family !== 5) {
    l.wood = [{ x, y: 192 + tier * 7, w: 88 - tier * 4, h: 16 }];
    hints.push(cut(x, 192 + tier * 7, Math.PI / 2, 30));
  }
  l.par = hints.length;
  l.hardcore = { timeLimit: limit, goldTime: limit - 1.2, maxStrokes: l.par, gravityScale: 1.05 };
  const instructions: string[] = [];
  if (mirrorCount) instructions.push(`Slice ${mirrorCount === 1 ? 'the glass' : 'both glass mirrors'} diagonally along the hint to bounce light into the gold receivers.`);
  if (pulleyCount) instructions.push(`Cut the red starter rope at the upper left. Wait for all ${pulleyCount} weights to light their switches in sequence.`);
  if (family === 4) instructions.push('Slice the wooden seal above the wedge.');
  if (family === 5) instructions.push('Draw both outward ramps before release. Each child needs its own ink wing.');
  instructions.push(split ? 'Drop onto the wedge. BOTH numbered buds must bloom.' : 'Drop only when every lock is green.');
  l.lesson = instructions.join(' ');
  l.hintText = l.lesson;
  return l;
});
