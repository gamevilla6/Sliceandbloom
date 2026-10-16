import { useCallback, useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

export type Sfx = 'cut' | 'rope' | 'release' | 'win';

const wood = require('../assets/audio/wood.wav');
const rope = require('../assets/audio/rope.wav');
const splash = require('../assets/audio/splash.wav');
const drop = require('../assets/audio/drop.wav');

export function useSound(enabled: boolean) {
  const pWood = useAudioPlayer(wood);
  const pRope = useAudioPlayer(rope);
  const pSplash = useAudioPlayer(splash);
  const pDrop = useAudioPlayer(drop);
  const on = useRef(enabled);
  on.current = enabled;
  const map = useRef({ cut: pWood, rope: pRope, win: pSplash, release: pDrop });
  map.current = { cut: pWood, rope: pRope, win: pSplash, release: pDrop };
  const warned = useRef(false);

  useEffect(() => {
    if (enabled) return;
    Object.values(map.current).forEach((p) => {
      try {
        p.pause();
      } catch {}
    });
  }, [enabled]);

  return useCallback((k: Sfx) => {
    if (!on.current) return;
    const p = map.current[k];
    void (async () => {
      await p.seekTo(0);
      if (on.current) p.play();
    })().catch((e: unknown) => {
      if (!warned.current) {
        warned.current = true;
        console.warn('[audio] playback failed', e);
      }
    });
  }, []);
}
