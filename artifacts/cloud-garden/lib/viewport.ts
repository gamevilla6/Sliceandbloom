export interface LogicalViewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const GAMEPLAY_ZOOM = 1.5;
export interface CameraPoint { x: number; y: number }

/** Worklet-safe affine camera in screen dp, outside the fixed Matter viewport. */
export function cinematicTransform(
  width: number, height: number, base: LogicalViewport, zoom: number, focus: CameraPoint,
): LogicalViewport {
  'worklet';
  const z = Math.max(1, Math.min(GAMEPLAY_ZOOM, Number.isFinite(zoom) ? zoom : 1));
  if (width <= 0 || height <= 0 || base.scale <= 0) return { scale: 1, offsetX: 0, offsetY: 0 };
  // Blend from the overview's center to the puzzle focus. At exactly 1x the
  // translation is always zero, even if the droplet moved while a menu opened.
  const blend = (z - 1) / (GAMEPLAY_ZOOM - 1);
  const x = width / 2 + (base.offsetX + focus.x * base.scale - width / 2) * blend;
  const y = height / 2 + (base.offsetY + focus.y * base.scale - height / 2) * blend;
  return {
    scale: z,
    offsetX: Math.max(width * (1 - z), Math.min(0, width / 2 - z * x)),
    offsetY: Math.max(height * (1 - z), Math.min(0, height / 2 - z * y)),
  };
}

/** Parent camera × child viewport, including the existing screen shake. */
export function composeViewports(base: LogicalViewport, camera: LogicalViewport): LogicalViewport {
  return {
    scale: base.scale * camera.scale,
    offsetX: camera.offsetX + base.offsetX * camera.scale,
    offsetY: camera.offsetY + base.offsetY * camera.scale,
  };
}

/** Look toward the plant without pushing the active water offscreen. */
export function cinematicFocus(
  drops: CameraPoint[], plant: CameraPoint, width: number, height: number, base: LogicalViewport,
): CameraPoint {
  const water = drops.length
    ? drops.reduce((sum, p) => ({ x: sum.x + p.x / drops.length, y: sum.y + p.y / drops.length }), { x: 0, y: 0 })
    : plant;
  const roomX = Math.max(0, width / (Math.max(base.scale, .001) * GAMEPLAY_ZOOM * 2) - 24);
  const roomY = Math.max(0, height / (Math.max(base.scale, .001) * GAMEPLAY_ZOOM * 2) - 24);
  return {
    x: water.x + Math.max(-roomX, Math.min(roomX, (plant.x - water.x) / 2)),
    y: water.y + Math.max(-roomY, Math.min(roomY, (plant.y - water.y) / 2)),
  };
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
