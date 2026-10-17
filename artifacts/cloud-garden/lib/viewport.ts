export interface LogicalViewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** Fit a fixed Matter world into the measured React Native canvas in dp. */
export function fitLogicalViewport(
  viewWidth: number,
  viewHeight: number,
  worldWidth: number,
  worldHeight: number,
): LogicalViewport {
  if (
    !Number.isFinite(viewWidth) || !Number.isFinite(viewHeight)
    || !Number.isFinite(worldWidth) || !Number.isFinite(worldHeight)
    || viewWidth <= 0 || viewHeight <= 0 || worldWidth <= 0 || worldHeight <= 0
  ) {
    return { scale: 0, offsetX: 0, offsetY: 0 };
  }

  const scale = Math.min(viewWidth / worldWidth, viewHeight / worldHeight);
  return {
    scale,
    offsetX: (viewWidth - worldWidth * scale) / 2,
    offsetY: (viewHeight - worldHeight * scale) / 2,
  };
}

/** Convert screen-space dp coordinates back into the invariant Matter world. */
export function screenPointToWorld(
  x: number,
  y: number,
  viewport: LogicalViewport,
  worldWidth: number,
  worldHeight: number,
): { x: number; y: number } {
  if (viewport.scale <= 0) return { x: 0, y: 0 };
  return {
    x: Math.max(0, Math.min(worldWidth, (x - viewport.offsetX) / viewport.scale)),
    y: Math.max(0, Math.min(worldHeight, (y - viewport.offsetY) / viewport.scale)),
  };
}
