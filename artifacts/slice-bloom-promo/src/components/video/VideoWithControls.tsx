import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pause, Play, Repeat, Volume2, VolumeX } from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { SCENE_DETAILS } from './sceneMeta';
import { useSceneControls } from './useSceneControls';

const TICK = 60;

function announce(index: number, keys: string[]) {
  const key = keys[index];
  const d = SCENE_DETAILS[key];
  if (!d?.filePath) return;
  window.parent.postMessage({ type: 'REPLIT_VIDEO_SCENE_SELECTED', payload: {
    sceneIndex: index, sceneCount: keys.length, sceneTitle: d.title || key, filePath: d.filePath, lineNumber: 1,
  } }, '*');
}
const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
};

function Status(p: {
  sceneKeys: string[]; activeIndex: number; activeDuration: number; activeStartTime: number;
  totalDuration: number; tick: number; paused: boolean; onJumpTo: (i: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const base = useRef(0);
  useEffect(() => { setElapsed(0); base.current = 0; }, [p.tick]);
  useEffect(() => {
    if (p.paused) return;
    const start = performance.now();
    const id = window.setInterval(() => setElapsed(base.current + (performance.now() - start)), TICK);
    return () => { window.clearInterval(id); base.current += performance.now() - start; };
  }, [p.tick, p.paused]);
  const progress = p.activeDuration > 0 ? Math.min(1, elapsed / p.activeDuration) : 0;
  const total = Math.min(p.totalDuration, p.activeStartTime + Math.min(elapsed, p.activeDuration));
  return (
    <>
      <div className="flex-1 flex items-center gap-1.5">
        {p.sceneKeys.map((k, i) => (
          <button key={k} onClick={() => p.onJumpTo(i)} aria-label={`Jump to scene ${i + 1}`}
            className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden hover:h-4 transition-all relative min-h-[12px]">
            <div className="absolute inset-y-0 left-0 bg-white/90 rounded-full" style={{ width: `${i === p.activeIndex ? progress * 100 : 0}%` }} />
          </button>
        ))}
      </div>
      <div className="text-xl text-white/60 font-mono tabular-nums shrink-0">{p.activeIndex + 1}/{p.sceneKeys.length}</div>
      <div className="min-w-[11ch] text-right text-xl text-white/80 font-mono tabular-nums shrink-0" role="timer">
        {fmt(total)} / {fmt(p.totalDuration)}
      </div>
    </>
  );
}

const btn = 'w-14 h-14 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-lg shrink-0';

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;
  const c = useSceneControls(SCENE_DURATIONS);
  const [muted, setMuted] = useState(false);
  const sensorRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);

  const handleJump = useCallback((i: number) => { c.jumpTo(i); announce(i, c.sceneKeys); }, [c.jumpTo, c.sceneKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!c.paused) return;
    const frozen = document.getAnimations().filter((a) => a.playState === 'running');
    frozen.forEach((a) => a.pause());
    return () => frozen.forEach((a) => a.play());
  }, [c.paused]);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const f = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      if (sensorRef.current && !sensorRef.current.contains(e.target as Node)) setTapPinned(false);
    };
    document.addEventListener('pointerdown', f);
    return () => document.removeEventListener('pointerdown', f);
  }, [collapsed, tapPinned]);

  if (!isIframed) return <VideoTemplate />;

  const visible = !collapsed || hovering || tapPinned;
  return (
    <div className="relative w-full h-screen">
      <VideoTemplate key={c.mountKey} durations={c.durations} loop paused={c.paused} muted={muted} onSceneChange={c.onSceneChange} />
      <div ref={sensorRef} className="absolute bottom-0 left-0 right-0 z-50 flex flex-col justify-end" style={{ height: '25%' }}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovering(true); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHovering(false); }}
        onPointerDown={(e) => { if (e.pointerType !== 'mouse' && collapsed) setTapPinned(true); }}>
        <div className="flex-1 w-full" aria-hidden="true" />
        <div aria-hidden={!visible} className={`flex items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-4 transition-all duration-200 ease-out ${visible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'}`}>
          <button onClick={c.togglePause} className={btn} aria-label={c.paused ? 'Play' : 'Pause'}>
            {c.paused ? <Play className="w-8 h-8" /> : <Pause className="w-8 h-8" />}
          </button>
          <button onClick={c.toggleLock} aria-pressed={c.locked} aria-label={c.locked ? 'Loop current scene: on' : 'Loop current scene: off'}
            className={`${btn} ${c.locked ? 'text-white bg-white/15' : ''}`}>
            <Repeat className="w-8 h-8" />
          </button>
          <button onClick={() => setMuted((m) => !m)} className={btn} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
          </button>
          <div className="w-px self-stretch bg-white/15" aria-hidden="true" />
          <Status sceneKeys={c.sceneKeys} activeIndex={c.activeIndex} activeDuration={c.activeDuration}
            activeStartTime={c.activeStartTime} totalDuration={c.totalDuration} tick={c.tick} paused={c.paused} onJumpTo={handleJump} />
          <button className={btn} aria-expanded={!collapsed} aria-label={collapsed ? 'Show controls' : 'Hide controls'}
            onClick={() => setCollapsed((v) => { if (!v) { setHovering(false); setTapPinned(false); } return !v; })}>
            {collapsed ? <ChevronUp className="w-10 h-10" /> : <ChevronDown className="w-10 h-10" />}
          </button>
        </div>
      </div>
    </div>
  );
}
