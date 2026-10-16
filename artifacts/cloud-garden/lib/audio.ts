import { useCallback, useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

export type Sfx = 'cut' | 'rope' | 'release' | 'win' | 'impact' | 'lose' | 'gravity';

const wood = require('../assets/audio/wood.wav');
const rope = require('../assets/audio/rope.wav');
const splash = require('../assets/audio/splash.wav');
const drop = require('../assets/audio/drop.wav');
const impact = require('../assets/audio/impact.wav');
const lose = require('../assets/audio/lose.wav');
const gravity = require('../assets/audio/gravity.wav');

export function useSound(enabled: boolean) {
  const pWood = useAudioPlayer(wood);
  const pRope = useAudioPlayer(rope);
  const pSplash = useAudioPlayer(splash);
  const pDrop = useAudioPlayer(drop);
  const pImpact = useAudioPlayer(impact);
  const pLose = useAudioPlayer(lose);
  const pGravity = useAudioPlayer(gravity);
  const on = useRef(enabled);
  on.current = enabled;
  const map = useRef({ cut: pWood, rope: pRope, win: pSplash, release: pDrop, impact: pImpact, lose: pLose, gravity: pGravity });
  map.current = { cut: pWood, rope: pRope, win: pSplash, release: pDrop, impact: pImpact, lose: pLose, gravity: pGravity };
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
