import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** Fixed-timestep (60Hz) requestAnimationFrame loop. Pauses when `paused` or app not active. */
export function useGameLoop(opts: { step: () => void; frame: (steps: number) => void; paused?: boolean; resetKey?: unknown }) {
  const stepRef = useRef(opts.step);
  const frameRef = useRef(opts.frame);
  stepRef.current = opts.step;
  frameRef.current = opts.frame;
  const paused = !!opts.paused;

  useEffect(() => {
    if (paused) return;
    let alive = true;
    let raf = 0;
    let last = 0;
    let acc = 0;
    let active = AppState.currentState === 'active';
    const sub = AppState.addEventListener('change', (s) => {
      active = s === 'active';
      last = 0;
    });
    const loop = (t: number) => {
      if (!alive) return;
      if (!last) last = t;
      if (active) {
        acc += Math.min(t - last, 50);
        let n = 0;
        while (acc >= 1000 / 60 && n < 5) {
          stepRef.current();
          acc -= 1000 / 60;
          n++;
        }
        if (n === 5) acc = 0;
        frameRef.current(n);
      }
      last = t;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      sub.remove();
    };
  }, [paused, opts.resetKey]);
}
