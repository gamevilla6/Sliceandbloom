/** Use measured content width, not screen-width estimates that miss card borders. */
export function levelGrid(width: number, fontScale = 1) {
  const gap = 10;
  const minTile = 100 * Math.max(1, fontScale);
  const columns = Math.max(1, Math.min(6, Math.floor((width + gap) / (minTile + gap))));
  const tileWidth = Math.max(0, Math.floor((width - gap * (columns - 1)) / columns));
  return { gap, columns, tileWidth };
}
