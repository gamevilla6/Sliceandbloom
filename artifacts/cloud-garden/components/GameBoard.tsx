import React, { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polyline, Rect, Stop } from 'react-native-svg';
import { GardenEngine, DROP_R, Status } from '@/lib/engine';
import { GROUND, H, Level, V, W } from '@/lib/levels';
import { haptic } from '@/lib/haptics';
import { useGameLoop } from '@/hooks/useGameLoop';
import { Sfx } from '@/lib/audio';
import { mix, P } from '@/constants/theme';

export type Tool = 'draw' | 'slice';
export interface Hud {
  tag: string;
  status: Status;
  inkLeft: number;
  inkMax: number;
  strokes: number;
  actions: number;
  fail: string;
  stars: number;
}

interface Props {
  level: Level;
  attempt: number;
  tool: Tool;
  showHint: boolean;
  guides: boolean;
  paused?: boolean;
  playSound?: (k: Sfx) => void;
  engineRef: MutableRefObject<GardenEngine | null>;
  onHud: (h: Hud) => void;
}

const polyPath = (v: { x: number; y: number }[]) => 'M' + v.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L') + ' Z';
const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);
const pts2 = (p: V[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
const DROP_PATH = 'M0 -17 C5 -9 11 -3 11 3 A11 11 0 0 1 -11 3 C-11 -3 -5 -9 0 -17 Z';

export function GameBoard({ level, attempt, tool, showHint, guides, paused, playSound, engineRef, onHud }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [, setTick] = useState(0);
  const engine = useMemo(() => new GardenEngine(level), [level, attempt]);
  engineRef.current = engine;
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const onHudRef = useRef(onHud);
  onHudRef.current = onHud;
  const tag = `${level.id}:${attempt}`;
  const tagRef = useRef(tag);
  tagRef.current = tag;
  const xf = useRef({ s: 1, ox: 0, oy: 0 });
  const drawing = useRef<V[]>([]);
  const exhausted = useRef(false);
  const trail = useRef<V[]>([]);
  const swipeTrail = useRef<V[]>([]);
  const swipeCuts = useRef(0);
  const soundRef = useRef(playSound);
  soundRef.current = playSound;
  const keyRef = useRef('');
  const frameN = useRef(0);
  const engRef = useRef(engine);
  engRef.current = engine;

  const scale = size.w && size.h ? Math.min(size.w / W, size.h / H) : 1;
  const ox = (size.w - W * scale) / 2;
  const oy = (size.h - H * scale) / 2;
  xf.current = { s: scale, ox, oy };

  const toLogical = (px: number, py: number): V => ({
    x: Math.max(0, Math.min(W, (px - xf.current.ox) / xf.current.s)),
    y: Math.max(0, Math.min(H, (py - xf.current.oy) / xf.current.s)),
  });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const p = toLogical(e.nativeEvent.locationX, e.nativeEvent.locationY);
        const eng = engRef.current;
        if (eng.status === 'won' || eng.status === 'lost') return;
        if (toolRef.current === 'draw') {
          drawing.current = [p];
          exhausted.current = eng.level.ink <= 0;
        } else {
          trail.current = [p];
          swipeTrail.current = [p];
          swipeCuts.current = 0;
        }
        setTick((t) => t + 1);
      },
      onPanResponderMove: (e) => {
        const p = toLogical(e.nativeEvent.locationX, e.nativeEvent.locationY);
        const eng = engRef.current;
        if (eng.status === 'won' || eng.status === 'lost') return;
        if (toolRef.current === 'draw') {
          const pts = drawing.current;
          if (!pts.length || exhausted.current) return;
          const last = pts[pts.length - 1];
          const d = dist(last, p);
          if (d < 9) return;
          let len = 0;
          for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
          if (len + d > eng.inkLeft) {
            const k = Math.max(0, eng.inkLeft - len) / d;
            pts.push({ x: last.x + (p.x - last.x) * k, y: last.y + (p.y - last.y) * k });
            exhausted.current = true;
            haptic.light();
          } else {
            pts.push(p);
          }
        } else {
          trail.current.push(p);
          if (trail.current.length > 10) trail.current.shift();
          swipeTrail.current.push(p);
          if (swipeTrail.current.length > 16) swipeTrail.current.shift();
          const n = eng.slice(trail.current[0], p);
          if (n > 0) {
            swipeCuts.current += n;
            trail.current = [p];
          }
        }
        setTick((t) => t + 1);
      },
      onPanResponderRelease: () => end(),
      onPanResponderTerminate: () => end(),
    }),
  ).current;

  function end() {
    const eng = engRef.current;
    if (toolRef.current === 'draw') {
      const pts = drawing.current;
      drawing.current = [];
      if (pts.length > 1 && eng.addStroke(pts)) haptic.light();
    } else {
      if (swipeCuts.current > 0) eng.actions++;
      eng.endSlice();
      swipeTrail.current = [];
      trail.current = [];
      swipeCuts.current = 0;
    }
    setTick((t) => t + 1);
  }

  useEffect(() => {
    engine.attach();
    let lastImpact = 0;
    keyRef.current = '';
    engine.onEvent = (ev) => {
      const e = ev;
      if (e.type === 'impact') {
        const now = Date.now();
        if (now - lastImpact > 140 && e.power > 6) {
          lastImpact = now;
          haptic.light();
        }
      } else if (e.type === 'cut') {
        haptic.medium();
        soundRef.current?.('cut');
      } else if (e.type === 'rope') {
        haptic.medium();
        soundRef.current?.('rope');
      } else if (e.type === 'push') {
        haptic.light();
      } else if (e.type === 'release') {
        haptic.medium();
        soundRef.current?.('release');
      } else if (e.type === 'win') {
        haptic.success();
        soundRef.current?.('win');
      } else if (e.type === 'lose') haptic.error();
    };
    emit();
    return () => {
      engine.onEvent = undefined;
      engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  function emit() {
    const engine = engRef.current;
    const k = `${engine.status}|${Math.round(engine.inkLeft)}|${engine.strokes.length}|${engine.actions}`;
    if (k === keyRef.current) return;
    keyRef.current = k;
    onHudRef.current({
      tag: tagRef.current,
      status: engine.status,
      inkLeft: engine.inkLeft,
      inkMax: engine.level.ink,
      strokes: engine.strokes.length,
      actions: engine.actions,
      fail: engine.failReason,
      stars: engine.stars,
    });
  }

  useGameLoop({
    paused,
    resetKey: engine,
    step: () => engRef.current.step(),
    frame: () => {
      const eng = engRef.current;
      frameN.current++;
      const trails = eng.sliceTrails;
      if (eng.status === 'running' || eng.particles.length || eng.status === 'won' || trails?.length || frameN.current % 2 === 0) {
        setTick((c) => c + 1);
      }
      emit();
    },
  });

  const onLayout = (e: LayoutChangeEvent) =>
    setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const t = engine.time;
  const f = level.flower;
  const bodies = engine.bodies;
  const woods = bodies.filter((b) => b.label === 'cut');
  const bloom = engine.bloom;
  const drop = engine.drop;
  const speed = drop.speed;
  let dx = drop.position.x;
  let dy = drop.position.y;
  let dScale = 1;
  if (engine.status === 'won') {
    const k = Math.min(1, engine.winT / 0.45);
    const e = 1 - Math.pow(1 - k, 3);
    dx = engine.winFrom.x + (f.x - engine.winFrom.x) * e;
    dy = engine.winFrom.y + (f.y - engine.winFrom.y) * e;
    dScale = 1 - 0.85 * e;
  }
  const stretch = engine.status === 'running' ? 1 + Math.min(speed * 0.022, 0.38) : 1 + Math.sin(t * 3) * 0.04;
  const blink = Math.sin(t * 1.3) > 0.97;
  const worried = engine.status === 'running' && speed > 5;
  const lost = engine.status === 'lost';
  const happy = engine.status === 'won';
  const ropeList = engine.ropes;
  const trailList = engine.sliceTrails;
  const preview = drawing.current;
  const ghostOff = -(t * 40);

  const hx = f.x + (1 - bloom) * 9 + Math.sin(t * 1.5) * 1.2;
  const hy = f.y + (1 - bloom) * 7;
  const petalC = mix(P.wilt, P.petal, bloom);
  const petalS = 0.62 + 0.38 * bloom;
  const clouds = [0, 1, 2].map((i) => ({ x: ((i * 190 + t * (4 + i * 2)) % 520) - 80, y: 70 + i * 85, s: 0.8 + i * 0.25 }));

  return (
    <View style={styles.wrap} onLayout={onLayout} {...pan.panHandlers} testID="game-board">
      <Svg width={size.w} height={size.h} pointerEvents="none">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={P.skyTop} />
            <Stop offset="1" stopColor={P.skyBottom} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={size.w} height={size.h} fill="url(#sky)" />
        <G transform={`translate(${ox} ${oy}) scale(${scale})`}>
          <Circle cx={300} cy={80} r={34} fill={P.marigold} opacity={0.9} />
          <Circle cx={300} cy={80} r={46} fill={P.marigold} opacity={0.25} />
          {clouds.map((c, i) => (
            <G key={i} transform={`translate(${c.x} ${c.y}) scale(${c.s})`} opacity={0.85}>
              <Ellipse cx={0} cy={0} rx={30} ry={11} fill={P.white} />
              <Ellipse cx={-10} cy={-8} rx={14} ry={11} fill={P.white} />
              <Ellipse cx={10} cy={-11} rx={17} ry={13} fill={P.white} />
            </G>
          ))}
          <Path d={`M-300 ${GROUND} Q-60 480 120 540 T 420 520 T 700 ${GROUND} L700 900 L-300 900 Z`} fill={mix(P.leaf, P.skyBottom, 0.35)} />
          <Rect x={-300} y={GROUND} width={1000} height={400} fill={P.soil} />
          <Rect x={-300} y={GROUND} width={1000} height={9} fill={P.leaf} />
          <Rect x={-300} y={GROUND + 9} width={1000} height={3} fill={P.ink} opacity={0.35} />
          {[20, 90, 170, 240, 320].map((x, i) => (
            <Ellipse key={i} cx={x} cy={GROUND + 24 + (i % 2) * 14} rx={7} ry={3} fill={P.soilDeep} opacity={0.5} />
          ))}

          {level.thorns.map((th, i) => {
            const n = Math.max(1, Math.round(th.w / 16));
            const w = th.w / n;
            return (
              <G key={i}>
                {Array.from({ length: n }).map((_, j) => (
                  <Path
                    key={j}
                    d={`M${th.x + j * w} ${th.y + 22} L${th.x + j * w + w / 2} ${th.y - 2} L${th.x + (j + 1) * w} ${th.y + 22} Z`}
                    fill={P.thorn}
                    stroke={P.ink}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                  />
                ))}
              </G>
            );
          })}

          {level.soil.map((b, i) => (
            <G key={i} transform={`translate(${b.x} ${b.y}) rotate(${((b.angle ?? 0) * 180) / Math.PI})`}>
              <Rect x={-b.w / 2} y={-b.h / 2} width={b.w} height={b.h} rx={7} fill={P.soil} stroke={P.ink} strokeWidth={3} />
              <Rect x={-b.w / 2 + 1.5} y={-b.h / 2 + 1.5} width={b.w - 3} height={Math.min(8, b.h / 2)} rx={4} fill={P.leaf} />
              <Rect x={-b.w / 2 + 8} y={b.h / 2 - 7} width={Math.max(8, b.w * 0.18)} height={3} rx={1.5} fill={P.soilDeep} opacity={0.6} />
            </G>
          ))}

          {woods.map((b) => (
            <G key={b.id}>
              <Path d={polyPath(b.vertices)} fill={P.wood} stroke={P.ink} strokeWidth={3} strokeLinejoin="round" />
              {guides && b.isStatic && (
                <Path
                  d={polyPath(b.vertices)}
                  fill="none"
                  stroke={P.coral}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  strokeDashoffset={ghostOff / 4}
                  transform={`translate(0 0)`}
                />
              )}
            </G>
          ))}

          <G>
            <Path
              d={`M${f.x} ${f.base} Q${f.x - (1 - bloom) * 4} ${(hy + f.base) / 2 + 6} ${hx} ${hy}`}
              stroke={mix(P.wilt, P.leafDeep, bloom)}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
            />
            <Ellipse cx={f.x - 13} cy={f.base - 12} rx={11} ry={5} fill={mix(P.wilt, P.leaf, bloom)} stroke={P.ink} strokeWidth={2} transform={`rotate(${-25 + (1 - bloom) * 30} ${f.x - 13} ${f.base - 12})`} />
            <Ellipse cx={f.x + 13} cy={f.base - 16} rx={11} ry={5} fill={mix(P.wilt, P.leaf, bloom)} stroke={P.ink} strokeWidth={2} transform={`rotate(${25 - (1 - bloom) * 30} ${f.x + 13} ${f.base - 16})`} />
            <G transform={`translate(${hx} ${hy}) rotate(${(1 - bloom) * 22})`}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Ellipse key={i} cx={0} cy={-13 * petalS} rx={7 * petalS} ry={12 * petalS} fill={petalC} stroke={P.ink} strokeWidth={2} transform={`rotate(${i * 45})`} />
              ))}
              <Circle r={10} fill={P.marigold} stroke={P.ink} strokeWidth={2.5} />
              <Circle cx={-3.5} cy={-1} r={1.5} fill={P.ink} />
              <Circle cx={3.5} cy={-1} r={1.5} fill={P.ink} />
              {bloom > 0.5 ? (
                <Path d="M-3.5 3 Q0 7 3.5 3" stroke={P.ink} strokeWidth={1.6} fill="none" strokeLinecap="round" />
              ) : (
                <Path d="M-3.5 5 Q0 2 3.5 5" stroke={P.ink} strokeWidth={1.6} fill="none" strokeLinecap="round" />
              )}
            </G>
            {bloom < 0.5 && (
              <G transform={`translate(${f.x} ${f.y - 44 - Math.sin(t * 3) * 3}) scale(0.7)`} opacity={0.9}>
                <Path d={DROP_PATH} fill="none" stroke={P.dropDeep} strokeWidth={3} strokeDasharray="4 3" />
              </G>
            )}
          </G>

          {ropeList.map((r, i) => {
            const ep = engine.endpoints(r);
            const sag = Math.max(0, 4 - dist(ep.a, ep.b) * 0.02);
            const mx = (ep.a.x + ep.b.x) / 2;
            const my = (ep.a.y + ep.b.y) / 2 + sag;
            const d = `M${ep.a.x.toFixed(1)} ${ep.a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${ep.b.x.toFixed(1)} ${ep.b.y.toFixed(1)}`;
            return (
              <G key={i}>
                <Path d={d} stroke={P.ink} strokeWidth={7} fill="none" strokeLinecap="round" />
                <Path d={d} stroke={P.paper} strokeWidth={4} fill="none" strokeLinecap="round" />
                <Path d={d} stroke={P.coral} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray="3 5" />
                <Circle cx={ep.a.x} cy={ep.a.y} r={4} fill={P.marigold} stroke={P.ink} strokeWidth={2} />
              </G>
            );
          })}
          {engine.strokes.map((s, i) => (
            <G key={i}>
              <Polyline points={pts2(s.pts)} fill="none" stroke={P.ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
              <Polyline points={pts2(s.pts)} fill="none" stroke={P.mint} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
            </G>
          ))}
          {preview.length > 1 && (
            <G>
              <Polyline points={pts2(preview)} fill="none" stroke={P.ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={0.45} />
              <Polyline points={pts2(preview)} fill="none" stroke={exhausted.current ? P.coral : P.white} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 7" />
            </G>
          )}
          {trailList.map((tr, i) => {
            const k = Math.max(0, 1 - tr.life / 12);
            return (
              <G key={`st${i}`} opacity={k}>
                <Path d={`M${tr.a.x} ${tr.a.y} L${tr.b.x} ${tr.b.y}`} stroke={P.ink} strokeWidth={7 * k + 1} strokeLinecap="round" opacity={0.5} />
                <Path d={`M${tr.a.x} ${tr.a.y} L${tr.b.x} ${tr.b.y}`} stroke={P.white} strokeWidth={3.5 * k + 0.5} strokeLinecap="round" />
              </G>
            );
          })}
          {swipeTrail.current.length > 1 && (
            <G>
              <Polyline points={pts2(swipeTrail.current)} fill="none" stroke={P.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
              <Polyline points={pts2(swipeTrail.current)} fill="none" stroke={P.white} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
            </G>
          )}

          {showHint &&
            level.hint.map((h, i) => (
              <Polyline
                key={i}
                points={pts2(h.pts)}
                fill="none"
                stroke={h.kind === 'draw' ? P.dropDeep : P.coralDeep}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8 9"
                strokeDashoffset={ghostOff}
                opacity={0.85}
              />
            ))}

          {bodies
            .filter((b) => b.label === 'stone')
            .map((b) => (
              <Circle key={b.id} cx={b.position.x} cy={b.position.y} r={b.circleRadius ?? 20} fill={P.stone} stroke={P.ink} strokeWidth={3} />
            ))}

          <G opacity={engine.status === 'won' ? Math.max(0, 1 - Math.max(0, engine.winT - 0.25) / 0.25) : 1}>
            <G transform={`translate(${dx} ${dy}) scale(${(dScale / stretch).toFixed(3)} ${(dScale * stretch).toFixed(3)})`}>
              <Path d={DROP_PATH} fill={lost ? mix(P.drop, P.wilt, 0.6) : P.drop} stroke={P.ink} strokeWidth={2.5} strokeLinejoin="round" />
              <Ellipse cx={-5} cy={-2} rx={2.4} ry={4} fill={P.white} opacity={0.75} transform="rotate(20 -5 -2)" />
              {blink || lost ? (
                <G stroke={P.ink} strokeWidth={1.6} strokeLinecap="round">
                  <Path d="M-6 3 L-2.5 3" />
                  <Path d="M2.5 3 L6 3" />
                </G>
              ) : (
                <G>
                  <Circle cx={-4} cy={3} r={2} fill={P.ink} />
                  <Circle cx={4} cy={3} r={2} fill={P.ink} />
                  <Circle cx={-3.4} cy={2.3} r={0.7} fill={P.white} />
                  <Circle cx={4.6} cy={2.3} r={0.7} fill={P.white} />
                </G>
              )}
              {worried || lost ? (
                <Ellipse cx={0} cy={8} rx={1.8} ry={2.2} fill={P.ink} />
              ) : (
                <Path d={happy ? 'M-3.5 6.5 Q0 11 3.5 6.5 Z' : 'M-3 7 Q0 9.5 3 7'} stroke={P.ink} strokeWidth={1.5} fill={happy ? P.ink : 'none'} strokeLinecap="round" />
              )}
            </G>
          </G>

          {engine.particles.map((q, i) => (
            <Circle key={i} cx={q.x} cy={q.y} r={q.r * (1 - q.life / q.max * 0.5)} fill={q.color} opacity={1 - q.life / q.max} />
          ))}
          <Circle cx={-100} cy={-100} r={DROP_R} fill="none" />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
});
