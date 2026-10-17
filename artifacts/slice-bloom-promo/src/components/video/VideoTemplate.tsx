import { VideoCanvas, type VideoAspectRatio, useVideoPlayer, VideoPausedContext } from '@/lib/video';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Hook, Ramp, Slice, Modes, Finale } from './Scenes';

export const SCENE_DURATIONS = { hook: 5000, ramp: 5000, slice: 5000, modes: 7000, finale: 8000 };
const SCENE_COMPONENTS: Record<string, React.ComponentType> = { hook: Hook, ramp: Ramp, slice: Slice, modes: Modes, finale: Finale };
const VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let ms = 0;
  for (const [k, v] of Object.entries(SCENE_DURATIONS)) { out[k] = ms / 1000; ms += v; }
  return out;
})();
const EPS = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS, loop = true, paused = false, muted = false, onSceneChange,
}: {
  durations?: Record<string, number>; loop?: boolean; paused?: boolean; muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  useEffect(() => { onSceneChange?.(currentSceneKey); }, [currentSceneKey, onSceneChange]);
  const baseKey = currentSceneKey.replace(/_r[12]$/, '');
  const S = SCENE_COMPONENTS[baseKey];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = 0.5;
    if (paused) { a.pause(); return; }
    if (lastKey.current !== currentSceneKey) {
      lastKey.current = currentSceneKey;
      const t = SCENE_START_SEC[baseKey] ?? 0;
      if (Math.abs(a.currentTime - t) > EPS) a.currentTime = t;
    }
    a.play().catch(() => {});
  }, [currentSceneKey, baseKey, muted, paused]);
  return (
    <VideoPausedContext.Provider value={paused}>
      <VideoCanvas aspectRatio={VIDEO_ASPECT_RATIO} style={{ backgroundColor: '#FFF5D6' }}>
        <AnimatePresence mode="popLayout">{S && <S key={currentSceneKey} />}</AnimatePresence>
        <audio ref={audioRef} src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`} preload="auto" autoPlay muted={muted} />
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}
