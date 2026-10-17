import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming,
} from 'react-native-reanimated';
import {
  cinematicTransform, composeViewports, GAMEPLAY_ZOOM, screenPointToWorld,
  type CameraPoint, type LogicalViewport,
} from '@/lib/viewport';

interface CameraInput {
  active: boolean;
  resetKey: unknown;
  width: number;
  height: number;
  base: LogicalViewport;
  shake: CameraPoint;
  focus: CameraPoint;
  worldWidth: number;
  worldHeight: number;
}

/** Presentation-only: never scales Matter bodies, gravity or level geometry. */
export function useCinematicCamera(input: CameraInput) {
  const [overview, setOverview] = useState(false);
  const systemReducedMotion = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(systemReducedMotion);
  const scaleAnimation = useSharedValue(1);
  const focusX = useSharedValue(input.focus.x);
  const focusY = useSharedValue(input.focus.y);
  const dragging = useRef(false);
  const frozen = useRef<LogicalViewport | null>(null);
  const current = useRef({ ...input, overview, reducedMotion });
  current.current = { ...input, overview, reducedMotion };
  const lastKey = useRef(input.resetKey);
  const lastFocus = useRef(input.focus);

  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => sub.remove();
  }, []);

  const driveZoom = useCallback(() => {
    const c = current.current;
    const zoomIn = c.active && !c.overview && !c.reducedMotion;
    scaleAnimation.value = withTiming(zoomIn ? GAMEPLAY_ZOOM : 1, {
      duration: zoomIn ? 380 : 260,
      easing: Easing.inOut(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [scaleAnimation]);

  const readCamera = useCallback(() => {
    const c = current.current;
    return cinematicTransform(c.width, c.height, c.base, scaleAnimation.value, { x: focusX.value, y: focusY.value });
  }, [scaleAnimation, focusX, focusY]);

  useLayoutEffect(() => {
    if (lastKey.current !== input.resetKey) {
      lastKey.current = input.resetKey;
      dragging.current = false;
      frozen.current = null;
      scaleAnimation.value = 1;
      setOverview(false);
      current.current.overview = false;
      focusX.value = input.focus.x;
      focusY.value = input.focus.y;
    }
    if (!input.active || reducedMotion) {
      dragging.current = false;
      frozen.current = null;
    }
    if (!dragging.current) driveZoom();
  }, [input.active, input.resetKey, overview, reducedMotion, driveZoom, scaleAnimation, focusX, focusY]);

  useLayoutEffect(() => {
    if (dragging.current) {
      // Rotation/layout changes must use the same new matrix as the UI worklet.
      frozen.current = readCamera();
      return;
    }
    const jump = Math.hypot(input.focus.x - lastFocus.current.x, input.focus.y - lastFocus.current.y) > 120;
    lastFocus.current = input.focus;
    // Portal jumps snap the focus; normal movement gets a short tracking ease.
    const snap = jump || reducedMotion || !input.active;
    focusX.value = snap ? input.focus.x : withTiming(input.focus.x, { duration: 120, reduceMotion: ReduceMotion.System });
    focusY.value = snap ? input.focus.y : withTiming(input.focus.y, { duration: 120, reduceMotion: ReduceMotion.System });
  }, [input.focus.x, input.focus.y, input.width, input.height, input.base.scale, input.base.offsetX, input.base.offsetY, input.active, reducedMotion, readCamera, focusX, focusY]);

  const { width, height, base: { scale, offsetX, offsetY } } = input;
  const animatedStyle = useAnimatedStyle(() => {
    const camera = cinematicTransform(width, height, { scale, offsetX, offsetY }, scaleAnimation.value, { x: focusX.value, y: focusY.value });
    return { transform: [{ translateX: camera.offsetX }, { translateY: camera.offsetY }, { scale: camera.scale }] };
  }, [width, height, scale, offsetX, offsetY]);

  const beginGesture = useCallback(() => {
    // Freeze at the actual in-flight zoom, not the target 1.5x. This also avoids
    // camera tracking creating ink movement under a stationary finger.
    cancelAnimation(scaleAnimation);
    cancelAnimation(focusX);
    cancelAnimation(focusY);
    dragging.current = true;
    frozen.current = readCamera();
  }, [scaleAnimation, focusX, focusY, readCamera]);

  const endGesture = useCallback(() => {
    dragging.current = false;
    frozen.current = null;
    driveZoom();
  }, [driveZoom]);

  const toWorld = useCallback((x: number, y: number) => {
    const c = current.current;
    const camera = frozen.current ?? readCamera();
    const viewport = composeViewports({
      scale: c.base.scale, offsetX: c.base.offsetX + c.shake.x, offsetY: c.base.offsetY + c.shake.y,
    }, camera);
    return screenPointToWorld(x, y, viewport, c.worldWidth, c.worldHeight);
  }, [readCamera]);

  return { animatedStyle, overview, reducedMotion, beginGesture, endGesture, toWorld, toggleOverview: () => setOverview(v => !v) };
}
