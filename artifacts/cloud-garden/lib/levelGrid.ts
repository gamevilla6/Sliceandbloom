/** Use measured content width, not screen-width estimates that miss card borders. */
export function canSelectLevel(index: number, total: number, unlocked: number, fastPasses = 0) {
  return Number.isInteger(index) && index >= 0 && index < total
    && (index <= unlocked || (Number.isFinite(fastPasses) && fastPasses > 0));
}

export function levelGrid(width: number, fontScale = 1) {
  const gap = 10;
  const minTile = 100 * Math.max(1, fontScale);
  const columns = Math.max(1, Math.min(6, Math.floor((width + gap) / (minTile + gap))));
  const tileWidth = Math.max(0, Math.floor((width - gap * (columns - 1)) / columns));
  return { gap, columns, tileWidth };
}

/** Include two lines for records/badges at the actual system text scale. */
export function levelTileHeight(fontScale: number, hardcore = false, voidProtocol = false) {
  const scale = Math.max(1, fontScale);
  return Math.ceil((84 + (hardcore ? 28 : 0) + (voidProtocol ? 28 : 0)) * scale)
    + 30 + (hardcore ? 4 : 0) + (voidProtocol ? 4 : 0);
}

/** Index is relative to the displayed chapter, not the entire campaign. */
export function levelScrollOffset({
  index, columns, tileHeight, gap, gridTop, viewportHeight, contentHeight,
}: {
  index: number;
  columns: number;
  tileHeight: number;
  gap: number;
  gridTop: number;
  viewportHeight: number;
  contentHeight: number;
}) {
  if (index < 0) return 0;
  const row = Math.floor(index / Math.max(1, columns));
  const top = gridTop + row * (tileHeight + gap);
  // Keep chapter controls visible when the current tile already fits. Always
  // aligning its row at the top used to scroll the chapter buttons out of view.
  const target = tileHeight + 8 > viewportHeight
    ? top - 8 : top + tileHeight + 8 - viewportHeight;
  return Math.max(0, Math.min(target, contentHeight - viewportHeight));
}
