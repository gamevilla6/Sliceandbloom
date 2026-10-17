import { useSyncExternalStore } from 'react';
import { adManager } from '@/lib/AdManager';

/** Event-driven updates only; never runs work inside the Matter.js loop. */
export function useAdNexus() {
  return useSyncExternalStore(adManager.subscribe, adManager.getSnapshot, adManager.getSnapshot);
}
