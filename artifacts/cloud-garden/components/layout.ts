import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { H, W } from '@/lib/levels';

export const ASPECT = W / H;

export function useSafeInsets() {
  const i = useSafeAreaInsets();
  // Use actual insets, not simulated phone bars that waste browser canvas space.
  return { top: i.top, bottom: i.bottom, left: i.left, right: i.right };
}

export function useLayoutMode() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeInsets();
  const availW = Math.max(0, width - insets.left - insets.right);
  const availH = Math.max(0, height - insets.top - insets.bottom);
  const landscape = width > height;
  const compact = landscape ? availH < 420 : availW < 380 || availH < 620;
  // Keep a minimum 132dp play area after the panel, gap and horizontal padding.
  // This lets split-screen and compact landscape windows shrink instead of overflow.
  const maxPanelW = Math.max(0, Math.min(340, availW - 170));
  const preferredPanelW = availW - (availH - 16) * ASPECT - 40;
  const panelW = Math.round(Math.max(Math.min(160, maxPanelW), Math.min(maxPanelW, preferredPanelW)));
  return { width, height, availW, availH, landscape, compact, panelW, insets };
}

