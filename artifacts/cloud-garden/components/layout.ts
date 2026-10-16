import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { H, W } from '@/lib/levels';

export const ASPECT = W / H;
export const FRAME_BORDER = 4;

export function useSafeInsets() {
  const i = useSafeAreaInsets();
  if (Platform.OS === 'web') return { top: 67, bottom: 34, left: i.left, right: i.right };
  return { top: i.top, bottom: i.bottom, left: i.left, right: i.right };
}

export function useLayoutMode() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeInsets();
  const availW = Math.max(200, width - insets.left - insets.right);
  const availH = Math.max(200, height - insets.top - insets.bottom);
  const landscape = width > height;
  const compact = landscape ? availH < 420 : availW < 380 || availH < 620;
  const panelW = Math.round(Math.max(210, Math.min(340, availW - (availH - 16) * ASPECT - 40)));
  return { width, height, availW, availH, landscape, compact, panelW, insets };
}

/** Largest 9:16 framed stage that fits an area (frame includes its border). */
export function fitStage(areaW: number, areaH: number) {
  const b = FRAME_BORDER * 2;
  const innerH = Math.max(0, Math.min(areaH - b, (areaW - b) / ASPECT));
  const innerW = innerH * ASPECT;
  return { w: Math.floor(innerW + b), h: Math.floor(innerH + b) };
}
