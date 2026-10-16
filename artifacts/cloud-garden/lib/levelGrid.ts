/** Use measured content width, not screen-width estimates that miss card borders. */
export function levelGrid(width: number, fontScale = 1) {
  const gap = 10;
  const minTile = 100 * Math.max(1, fontScale);
  const columns = Math.max(1, Math.min(6, Math.floor((width + gap) / (minTile + gap))));
  const tileWidth = Math.max(0, Math.floor((width - gap * (columns - 1)) / columns));
  return { gap, columns, tileWidth };
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
  const target = gridTop + row * (tileHeight + gap) - 8;
  return Math.max(0, Math.min(target, contentHeight - viewportHeight));
}
