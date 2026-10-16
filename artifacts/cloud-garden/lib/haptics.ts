import * as Haptics from 'expo-haptics';

let enabled = true;
export function setHapticsEnabled(v: boolean) {
  enabled = v;
}
function safe(p: Promise<unknown>) {
  p.catch(() => {});
}
export const haptic = {
  tap() {
    if (enabled) safe(Haptics.selectionAsync());
  },
  light() {
    if (enabled) safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  medium() {
    if (enabled) safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  success() {
    if (enabled) safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  error() {
    if (enabled) safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
};
