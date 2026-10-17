import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, LayoutChangeEvent, PanResponder, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type Matter from 'matter-js';
import { GardenEngine, DROP_R, Status } from '@/lib/engine';
import { GROUND, H, Level, V, W } from '@/lib/levels';
import { haptic } from '@/lib/haptics';
import { useGameLoop } from '@/hooks/useGameLoop';
import { Sfx } from '@/lib/audio';
import { mix, P, VD } from '@/constants/theme';
import { AdvancedLayer } from '@/components/AdvancedLayer';
import { HOT } from '@/components/HardcoreLayer';
import { fitLogicalViewport, screenPointToWorld } from '@/lib/viewport';

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
  elapsed: number;
  timeLeft: number;
  gravityRemaining: number;
  started: boolean;
  score: number;
  cycleTime: number;
}

interface Props {
  engine: GardenEngine;
  level: Level;
  attempt: number;
  tool: Tool;
  showHint: boolean;
  hintStep: number;
  hintOverview: boolean;
  guides: boolean;
  modeKey?: string;
  paused?: boolean;
  playSound?: (k: Sfx) => void;
  engineRef: MutableRefObject<GardenEngine | null>;
  onHud: (h: Hud) => void;
}

const polyPath = (v: { x: number; y: number }[]) => 'M' + v.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L') + ' Z';
const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);
const pts2 = (p: V[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
const DROP_PATH = 'M0 -17 C5 -9 11 -3 11 3 A11 11 0 0 1 -11 3 C-11 -3 -5 -9 0 -17 Z';

export function GameBoard({ engine, level, attempt, modeKey = 'classic', tool, showHint, hintStep, hintOverview, guides, paused, playSound, engineRef, onHud }: Props) {
  'use no memo';
  // Matter mutates bodies in place; every frame must read current world state.
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [, setTick] = useState(0);
  engineRef.current = engine;
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const onHudRef = useRef(onHud);
  onHudRef.current = onHud;
  const tag = `${modeKey}:${level.id}:${attempt}`;
  const tagRef = useRef(tag);
  tagRef.current = tag;
  const xf = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
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
  const pausedRef = useRef(!!paused);
  pausedRef.current = !!paused;
  const active = useRef(false);
  const revealing = useRef(false);
  const reduceMotion = useRef(false);
  const hardcore = !!level.hardcore;
  const isVoid = !!level.voidProtocol;
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { reduceMotion.current = !!v; }).catch(() => {});
  }, []);

  // Keep the Matter world in its level's logical coordinates. Fit it uniformly
  // inside the measured canvas; React Native and SVG both use dp, so multiplying
  // by PixelRatio here would double-scale high-density devices.
  const fitted = fitLogicalViewport(size.w, size.h, W, H);
  const scale = fitted.scale || 1;
  const ox = size.w ? fitted.offsetX : 0;
  const oy = size.h ? fitted.offsetY : 0;
  const sceneryLeft = -ox / scale;
  const sceneryRight = (size.w - ox) / scale;
  const sceneryBottom = Math.max(H, (size.h - oy) / scale);
  // Small clamped screen shake; the touch transform includes it so input stays aligned.
  const shakeAmp = reduceMotion.current ? 0 : Math.min(4, (engine.shakeIntensity ?? 0) * 0.5);
  const shx = shakeAmp ? Math.sin(frameN.current * 2.9) * shakeAmp : 0;
  const shy = shakeAmp ? Math.cos(frameN.current * 3.7) * shakeAmp : 0;
  xf.current = { scale, offsetX: ox + shx, offsetY: oy + shy };

  const toLogical = (px: number, py: number): V =>
    screenPointToWorld(px, py, xf.current, W, H);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const p = toLogical(e.nativeEvent.locationX, e.nativeEvent.locationY);
        const eng = engRef.current;
        if (pausedRef.current || eng.status === 'won' || eng.status === 'lost') return;
        revealing.current = true;
        eng.revealAt(p);
        if (eng.level.hardcore && !eng.beginInput()) return;
        active.current = true;
        if (toolRef.current === 'draw') {
          drawing.current = [p];
          exhausted.current = eng.inkMax <= 0;
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
        if (revealing.current && !pausedRef.current && eng.status !== 'won' && eng.status !== 'lost') eng.revealAt(p);
        if (!active.current || pausedRef.current || eng.status === 'won' || eng.status === 'lost') return;
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
    revealing.current = false;
    if (!active.current) return;
    active.current = false;
    if (toolRef.current === 'draw') {
      const pts = drawing.current;
      drawing.current = [];
      if (pts.length > 1 && eng.addStroke(pts)) haptic.light();
    } else {
      if (swipeCuts.current > 0 && !eng.level.hardcore) eng.actions++;
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
    let lastImpactSfx = 0;
    keyRef.current = '';
    engine.onEvent = (ev) => {
      const e = ev;
      if (e.type === 'impact') {
        const now = Date.now();
        if (now - lastImpact > 140 && e.power > 6) {
          lastImpact = now;
          haptic.light();
        }
        if (now - lastImpactSfx > 160 && e.power > 9) {
          lastImpactSfx = now;
          soundRef.current?.('impact');
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
      } else if (e.type === 'portal' || e.type === 'switch') {
        haptic.medium();
      } else if (e.type === 'win') {
        haptic.success();
        soundRef.current?.('win');
      } else if (e.type === 'gravity') {
        haptic.medium();
        soundRef.current?.('gravity');
      } else if (e.type === 'lose') {
        haptic.error();
        soundRef.current?.('lose');
      }
    };
    emit();
    return () => {
      engine.onEvent = undefined;
      // Rotation can move the board to another layout branch. Keep its world,
      // but finish accounting for any slice interrupted by that remount.
      if (swipeCuts.current > 0 && !engine.level.hardcore) engine.actions++;
      swipeCuts.current = 0;
      engine.endSlice();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  function emit() {
    const engine = engRef.current;
    const hc = engine.level.hardcore;
    const pendingInk = drawing.current.slice(1).reduce((sum, p, i) => sum + dist(drawing.current[i], p), 0);
    const inkLeft = Math.max(0, engine.inkLeft - pendingInk);
    const k = `${engine.status}|${Math.round(inkLeft)}|${engine.strokes.length}|${engine.actions}|${engine.started ? 1 : 0}${hc ? `|${Math.ceil(engine.timeLeft * 10)}|${Math.ceil(engine.gravityRemaining * 10)}|${Math.floor(engine.hardcore.cycleTime * 10)}|${Math.round(engine.elapsed * 10)}` : ''}`;
    if (k === keyRef.current) return;
    keyRef.current = k;
    onHudRef.current({
      tag: tagRef.current,
      status: engine.status,
      inkLeft,
      inkMax: engine.inkMax,
      strokes: engine.strokes.length,
      actions: engine.actions,
      fail: engine.failReason,
      stars: engine.stars,
      elapsed: engine.elapsed,
      timeLeft: engine.timeLeft,
      gravityRemaining: engine.gravityRemaining,
      started: engine.started,
      score: engine.score,
      cycleTime: engine.hardcore.cycleTime,
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
  const vp = isVoid ? engine.voidProtocol : null;
  const op = (b?: Matter.Body): number => (vp && b ? Math.max(0, Math.min(1, vp.opacity(b))) : 1);
  const f = level.flower;
  const bodies = engine.bodies;
  const woods = bodies.filter((b) => b.label === 'cut' && engine.isObstacleVisible(b));
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
  dScale *= (drop.circleRadius ?? DROP_R) / DROP_R;
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
            <Stop offset="0" stopColor={isVoid ? VD.bgDeep : P.skyTop} />
            <Stop offset="1" stopColor={isVoid ? VD.skyBottom : P.skyBottom} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={size.w} height={size.h} fill="url(#sky)" />
        <G transform={`translate(${ox + shx} ${oy + shy}) scale(${scale})`}>
          {isVoid && (
            <G>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Rect key={`vg${i}`} x={-300 + i * 100} y={0} width={1.5} height={GROUND} fill={VD.purple} opacity={0.12} />
              ))}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <Rect key={`vh${i}`} x={sceneryLeft} y={i * 60} width={sceneryRight - sceneryLeft} height={1.5} fill={VD.purple} opacity={0.1} />
              ))}
              <Circle cx={300} cy={90} r={52} fill={VD.purpleDeep} opacity={0.35} />
              <Circle cx={300} cy={90} r={34} fill={VD.red} opacity={0.5 + 0.1 * Math.sin(t * 2)} />
              <Rect x={sceneryLeft} y={GROUND} width={sceneryRight - sceneryLeft} height={sceneryBottom - GROUND} fill={VD.bg} />
              <Rect x={sceneryLeft} y={GROUND - 2} width={sceneryRight - sceneryLeft} height={10} fill={VD.red} opacity={0.25} />
              <Rect x={sceneryLeft} y={GROUND} width={sceneryRight - sceneryLeft} height={3} fill={VD.red} />
            </G>
          )}
          {!isVoid && [0, 1, 2, 3, 4, 5].map((i) => (
            <Rect key={`ray${i}`} x={-300 + i * 150} y={0} width={60} height={GROUND} fill={P.white} opacity={0.12} />
          ))}
          {!isVoid && (<G>
          {[[40, 150], [250, 230], [90, 330], [330, 380]].map(([x, y], i) => (
            <Path key={`sp${i}`} d={`M${x} ${y - 8} L${x + 2.5} ${y - 2.5} L${x + 8} ${y} L${x + 2.5} ${y + 2.5} L${x} ${y + 8} L${x - 2.5} ${y + 2.5} L${x - 8} ${y} L${x - 2.5} ${y - 2.5} Z`} fill={P.white} opacity={0.5 + 0.4 * Math.sin(t * 2 + i)} />
          ))}
          <Circle cx={300} cy={80} r={34} fill={P.marigold} opacity={0.9} />
          <Circle cx={300} cy={80} r={46} fill={P.marigold} opacity={0.25} />
          {clouds.map((c, i) => (
            <G key={i} transform={`translate(${c.x} ${c.y}) scale(${c.s})`} opacity={0.85}>
              <Ellipse cx={0} cy={0} rx={30} ry={11} fill={P.white} />
              <Ellipse cx={-10} cy={-8} rx={14} ry={11} fill={P.white} />
              <Ellipse cx={10} cy={-11} rx={17} ry={13} fill={P.white} />
            </G>
          ))}
          <Path d={`M${sceneryLeft} ${GROUND} L-300 ${GROUND} Q-60 480 120 540 T 420 520 T 700 ${GROUND} L${sceneryRight} ${GROUND} L${sceneryRight} ${sceneryBottom} L${sceneryLeft} ${sceneryBottom} Z`} fill={mix(P.leaf, P.skyBottom, 0.35)} />
          <Rect x={sceneryLeft} y={GROUND} width={sceneryRight - sceneryLeft} height={sceneryBottom - GROUND} fill={P.soil} />
          <Rect x={sceneryLeft} y={GROUND} width={sceneryRight - sceneryLeft} height={9} fill={P.leaf} />
          {Array.from({ length: 14 }).map((_, i) => (
            <Rect key={`chk${i}`} x={-300 + i * 80} y={GROUND + 12} width={40} height={14} fill={P.soilDeep} opacity={0.25} />
          ))}
          <Rect x={sceneryLeft} y={GROUND + 9} width={sceneryRight - sceneryLeft} height={3} fill={P.ink} opacity={0.35} />
          {[20, 90, 170, 240, 320].map((x, i) => (
            <Ellipse key={i} cx={x} cy={GROUND + 24 + (i % 2) * 14} rx={7} ry={3} fill={P.soilDeep} opacity={0.5} />
          ))}

          </G>)}
          {level.thorns.map((th, i) => {
            const n = Math.max(1, Math.round(th.w / 16));
            const w = th.w / n;
            return (
              <G key={i}>
                {isVoid && Array.from({ length: n }).map((_, j) => (
                  <G key={`g${j}`}>
                    <Path d={`M${th.x + j * w} ${th.y + 22} L${th.x + j * w + w / 2} ${th.y - 2} L${th.x + (j + 1) * w} ${th.y + 22} Z`} fill="none" stroke={VD.red} strokeWidth={11} opacity={0.18 + 0.08 * Math.sin(t * 4)} strokeLinejoin="round" />
                    <Path d={`M${th.x + j * w} ${th.y + 22} L${th.x + j * w + w / 2} ${th.y - 2} L${th.x + (j + 1) * w} ${th.y + 22} Z`} fill="none" stroke={VD.red} strokeWidth={6} opacity={0.35} strokeLinejoin="round" />
                  </G>
                ))}
                {Array.from({ length: n }).map((_, j) => (
                  <Path
                    key={j}
                    d={`M${th.x + j * w} ${th.y + 22} L${th.x + j * w + w / 2} ${th.y - 2} L${th.x + (j + 1) * w} ${th.y + 22} Z`}
                    fill={hardcore ? HOT : P.thorn}
                    stroke={isVoid ? '#FFC2D1' : P.ink}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                  />
                ))}
              </G>
            );
          })}

          {level.soil.map((b, i) => {
            const sb = engine.soilBodies[i];
            if (sb && !engine.isObstacleVisible(sb)) return null;
            const px = sb ? sb.position.x : b.x, py = sb ? sb.position.y : b.y, pa = sb ? sb.angle : (b.angle ?? 0);
            return (
            isVoid && sb ? (
              <G key={i} opacity={op(sb)}>
                <Path d={polyPath(sb.vertices)} fill={VD.panelHi} stroke={VD.purple} strokeWidth={3} strokeLinejoin="round" />
              </G>
            ) : (
            <G key={i} opacity={op(sb)} transform={`translate(${px} ${py}) rotate(${(pa * 180) / Math.PI})`}>
              <Rect x={-b.w / 2} y={-b.h / 2} width={b.w} height={b.h} rx={7} fill={isVoid ? VD.panelHi : P.soil} stroke={isVoid ? VD.purple : P.ink} strokeWidth={3} />
              <Rect x={-b.w / 2 + 1.5} y={-b.h / 2 + 1.5} width={b.w - 3} height={Math.min(8, b.h / 2)} rx={4} fill={isVoid ? VD.magenta : P.leaf} />
              <Rect x={-b.w / 2 + 8} y={b.h / 2 - 7} width={Math.max(8, b.w * 0.18)} height={3} rx={1.5} fill={P.soilDeep} opacity={0.6} />
            </G>
            )
            );
          })}

          {woods.map((b) => (
            <G key={b.id} opacity={op(b)}>
              <Path d={polyPath(b.vertices)} fill={isVoid ? VD.purpleDeep : P.wood} stroke={isVoid ? VD.magenta : P.ink} strokeWidth={3} strokeLinejoin="round" />
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
          {engine.strokes.map((s, i) => isVoid ? (
            <G key={i}>
              {s.bodies.map((b) => {
                const o = vp ? Math.max(0, Math.min(1, vp.strokeOpacity(b))) : 1;
                if (o <= 0) return null;
                return (
                  <G key={b.id} opacity={o}>
                    <Path d={polyPath(b.vertices)} fill={VD.ok} stroke={VD.purpleDeep} strokeWidth={3} strokeLinejoin="round" />
                  </G>
                );
              })}
            </G>
          ) : (
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

          <AdvancedLayer engine={engine} level={level} />

          {bodies
            .filter((b) => b.label === 'stone' && engine.isObstacleVisible(b))
            .map((b) => (
              <Circle key={b.id} opacity={op(b)} cx={b.position.x} cy={b.position.y} r={b.circleRadius ?? 20} fill={isVoid ? VD.panelHi : P.stone} stroke={isVoid ? VD.purple : P.ink} strokeWidth={3} />
            ))}

          {showHint && [
            // Draw the current path last so an overlapping overview cannot obscure it.
            ...(hintOverview ? level.hint.map((h, i) => ({ h, i })).filter(({ i }) => i !== hintStep) : []),
            ...(level.hint[hintStep] ? [{ h: level.hint[hintStep], i: hintStep }] : []),
          ].map(({ h, i }) => {
            const active = i === hintStep;
            const start = h.pts[0];
            return (
              <G key={i} opacity={active ? 1 : 0.3} testID={`hint-path-${i + 1}`}>
                {active && <Polyline points={pts2(h.pts)} fill="none" stroke={P.white} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />}
                <Polyline
                  points={pts2(h.pts)}
                  fill="none"
                  stroke={h.kind === 'draw' ? P.dropDeep : P.coralDeep}
                  strokeWidth={active ? 4 : 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="8 9"
                  strokeDashoffset={ghostOff}
                />
                {start && (
                  <G transform={`translate(${start.x} ${start.y})`}>
                    <Circle r={12} fill={active ? P.marigold : P.white} stroke={P.ink} strokeWidth={2.5} />
                    <SvgText y={5} textAnchor="middle" fontSize={14} fontWeight="bold" fill={P.ink}>{i + 1}</SvgText>
                  </G>
                )}
              </G>
            );
          })}

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

          {engine.particles.map((q, i) => q.shard ? (
            <Path key={i} d={`M0 ${-q.r * 1.6} L${q.r * 1.1} ${q.r} L${-q.r * 1.2} ${q.r * 0.6} Z`} fill={q.color} opacity={1 - q.life / q.max} transform={`translate(${q.x} ${q.y}) rotate(${(i * 67 + q.life * 40) % 360})`} />
          ) : (
            <Circle key={i} cx={q.x} cy={q.y} r={q.r * (1 - q.life / q.max * 0.5)} fill={q.color} opacity={1 - q.life / q.max} />
          ))}
          <Circle cx={-100} cy={-100} r={DROP_R} fill="none" />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none', cursor: 'crosshair' } as object) : {}),
  },
});
