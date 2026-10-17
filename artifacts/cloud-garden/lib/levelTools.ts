import type { Level } from './levels';

/** Shared by menu availability and its regression tests, not just the engine. */
export function levelTools(level: Level, inkMax: number) {
  const canDraw = inkMax > 0;
  const canSlice = level.wood.length > 0 || !!level.ropes?.length || level.stones.length > 0
    || !!level.weights?.length || !!(level.laserReflection && level.reflectionPuzzle?.mirrors.length)
    || !!(level.multiStagePulley && level.pulleyPuzzle?.stages.length);
  // Preserve legacy defaults. New masterclasses begin with their required tool,
  // rather than inviting players to waste a limited stroke on a glass lock.
  const genesisSlice = level.visualMode === 'genesis' && level.id > 45 && canSlice && level.hint[0]?.kind === 'slice';
  const initialTool: 'draw' | 'slice' = !canDraw || genesisSlice ? 'slice' : 'draw';
  return { canDraw, canSlice, initialTool };
}
