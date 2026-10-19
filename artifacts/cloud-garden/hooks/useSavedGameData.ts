import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createGameDataStore } from '@/lib/gameData';

/** Both native AsyncStorage and its browser adapter use the same guarded flow. */
export function useSavedGameData<T>(key: string, defaults: T, read: (raw: unknown) => T) {
  const store = useMemo(() => createGameDataStore(AsyncStorage, key, defaults, read), [key, defaults, read]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    void store.load();
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') void store.flush();
    });
    return () => { listener.remove(); };
  }, [store]);
  const retrySave = useCallback(() => { void store.flush(); }, [store]);
  const getCurrent = useCallback(() => store.getSnapshot().data, [store]);
  return { ...snapshot, update: store.update, retrySave, getCurrent };
}
