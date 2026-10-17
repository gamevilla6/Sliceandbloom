import React from 'react';
import { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { GardenEngine } from '@/lib/engine';
import type { Level } from '@/lib/levels';
import { W } from '@/lib/levels';
import { F, GN, P } from '@/constants/theme';
import { HOT } from '@/components/HardcoreLayer';

const OK = P.mint;
const poly = (v: { x: number; y: number }[]) => 'M' + v.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L') + ' Z';
const deg = (a: number) => `${Math.round((((a * 180) / Math.PI) % 180 + 180) % 180)}°`;

export function GenesisLayer({ engine, level }: { engine: GardenEngine; level: Level }) {
  'use no memo';
  // Mutable Matter state: read every frame, never cache.
  const g = engine.genesis;
  const t = engine.time;
  const pulse = 0.6 + 0.4 * Math.sin(t * 6);
  const rec = g.receivers;
  const recDone = rec.filter((r) => r.active).length;
  const stagesDone = g.pulleys.filter((p) => p.active).length;
  const budsDone = g.buds.filter((b) => b.complete).length;
  const parts: string[] = [];
  if (level.laserReflection) parts.push(`Receivers ${recDone}/${rec.length}`);
  if (level.multiStagePulley) parts.push(`Stages ${stagesDone}/${g.pulleys.length}`);
  if (level.splitDropletRequired) parts.push(`Buds ${budsDone}/${g.buds.length}`);
  return (
    <G testID="genesis-layer" pointerEvents="none">
      {/* Beams: red when hazardous, gold trace once solved */}
      {g.beams.map((b, i) => (
        <G key={`beam${i}`}>
          <Line x1={b.a.x} y1={b.a.y} x2={b.b.x} y2={b.b.y} stroke={b.active ? HOT : GN.gold} strokeWidth={b.width + (b.active ? 4 : 2)} strokeOpacity={b.active ? 0.25 : 0.18} strokeLinecap="round" />
          <Line x1={b.a.x} y1={b.a.y} x2={b.b.x} y2={b.b.y} stroke={b.active ? HOT : GN.gold} strokeWidth={b.active ? b.width : 1.5} strokeDasharray={b.active ? undefined : '5 5'} strokeLinecap="round" />
        </G>
      ))}

      {/* Physical mirrors with swipe cue */}
      {g.mirrors.map((m, i) => {
        const cx = m.position.x, cy = m.position.y;
        const cue = level.hint[i]?.pts;
        const a = cue?.[0] ?? { x: cx - 16, y: cy - 16 };
        const b = cue?.[cue.length - 1] ?? { x: cx + 16, y: cy + 16 };
        return (
          <G key={`mirror${i}`} testID={`genesis-mirror-${i}`} accessibilityLabel={`Mirror ${i + 1}, angle ${deg(m.angle)}. Swipe diagonally across to rotate.`}>
            <Path d={poly(m.vertices)} fill={GN.glow} stroke={P.ink} strokeWidth={3} strokeLinejoin="round" />
            {!rec[i]?.active && <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={GN.orange} strokeWidth={2} strokeDasharray="4 4" strokeOpacity={0.4 + 0.5 * pulse} />}
            <SvgText x={cx} y={cy - 26} fontSize={11} fontFamily={F.bold} fill={GN.gold} stroke={P.ink} strokeWidth={0.6} textAnchor="middle">{`M${i + 1} ${deg(m.angle)}`}</SvgText>
          </G>
        );
      })}

      {/* Receivers */}
      {rec.map((r, i) => {
        const rad = r.spec.radius ?? 14;
        return (
          <G key={`rec${i}`} testID={`genesis-receiver-${i}`} accessibilityLabel={`Receiver ${i + 1} ${r.active ? 'active' : 'waiting for laser'}`}>
            {!r.active && <Path d={poly(r.gate.vertices)} fill={GN.panelHi} stroke={GN.orange} strokeWidth={3} strokeLinejoin="round" />}
            <Circle cx={r.spec.x} cy={r.spec.y} r={rad + 4} fill="none" stroke={r.active ? OK : GN.amber} strokeWidth={2} strokeDasharray={r.active ? undefined : '4 3'} opacity={r.active ? 1 : 0.5 + 0.5 * pulse} />
            <Circle cx={r.spec.x} cy={r.spec.y} r={rad} fill={r.active ? OK : GN.bg} stroke={P.ink} strokeWidth={3} />
            <SvgText x={r.spec.x} y={r.spec.y + 4} fontSize={12} fontFamily={F.bold} fill={r.active ? P.ink : GN.gold} textAnchor="middle">{i + 1}</SvgText>
          </G>
        );
      })}

      {/* Pulley assemblies */}
      {g.pulleys.map((p, i) => {
        const w = p.weight.position, gt = p.gate.position, ax = p.weightRope.pointA;
        const gx = p.gateRope.pointA;
        const b = p.spec.button;
        const col = p.active ? OK : GN.amber;
        const next = i > 0;
        return (
          <G key={`pul${i}`} testID={`genesis-pulley-${i}`} accessibilityLabel={`Pulley stage ${i + 1} ${p.active ? 'active' : p.released ? 'running' : 'waiting'}`}>
            {!p.active && (
              <>
                <Line x1={ax.x} y1={ax.y} x2={w.x} y2={w.y} stroke={P.ink} strokeWidth={3} />
                <Line x1={gx.x} y1={gx.y} x2={gt.x} y2={gt.y} stroke={P.ink} strokeWidth={3} />
                <Line x1={ax.x} y1={ax.y} x2={gx.x} y2={gx.y} stroke={GN.gold} strokeWidth={2} />
              </>
            )}
            <Circle cx={ax.x} cy={ax.y} r={7} fill={GN.glow} stroke={P.ink} strokeWidth={3} />
            {gx.x !== ax.x || gx.y !== ax.y ? <Circle cx={gx.x} cy={gx.y} r={7} fill={GN.glow} stroke={P.ink} strokeWidth={3} /> : null}
            <Rect x={b.x - b.w / 2} y={b.y - b.h / 2} width={b.w} height={b.h} rx={3} fill={p.active ? OK : GN.bg} stroke={col} strokeWidth={2.5} opacity={p.active ? 1 : 0.7 + 0.3 * pulse} />
            <SvgText x={b.x} y={b.y - b.h / 2 - 5} fontSize={12} fontFamily={F.bold} fill={p.active ? OK : GN.gold} stroke={P.ink} strokeWidth={0.5} textAnchor="middle">{i + 1}</SvgText>
            <Path d={poly(p.weight.vertices)} fill={p.active ? OK : GN.orange} stroke={P.ink} strokeWidth={3} strokeLinejoin="round" />
            {!p.active && <Path d={poly(p.gate.vertices)} fill={GN.amber} stroke={P.ink} strokeWidth={3} strokeLinejoin="round" />}
            {!p.released && (
              <>
                <Line x1={p.latch.pointA.x} y1={p.latch.pointA.y} x2={w.x} y2={w.y} stroke={next ? GN.textSoft : HOT} strokeWidth={next ? 2 : 4} strokeDasharray={next ? '3 4' : undefined} strokeLinecap="round" />
                <Circle cx={(p.latch.pointA.x + w.x) / 2} cy={(p.latch.pointA.y + w.y) / 2} r={next ? 3 : 5} fill={next ? GN.textSoft : HOT} stroke={P.ink} strokeWidth={1.5} />
              </>
            )}
          </G>
        );
      })}

      {/* Wedge */}
      {g.wedge && <Path testID="genesis-wedge" d={poly(g.wedge.vertices)} fill={GN.amber} stroke={P.ink} strokeWidth={3} strokeLinejoin="round" />}

      {/* Buds */}
      {level.splitDropletRequired && g.buds.map((b, i) => {
        const { x, y, base } = b.spec;
        const done = b.complete;
        return (
          <G key={`bud${i}`} testID={`genesis-bud-${i}`} accessibilityLabel={`Bud ${i + 1} ${done ? 'bloomed' : 'waiting for droplet ' + (i + 1)}`}>
            {!done && <Circle cx={x} cy={y} r={30} fill={GN.glow} fillOpacity={0.06} stroke={GN.gold} strokeWidth={1} strokeDasharray="2 5" opacity={0.5} />}
            <Circle cx={x} cy={y} r={done ? 24 : 16} fill={done ? P.petal : GN.bg} stroke={done ? GN.gold : GN.amber} strokeWidth={3} strokeDasharray={done ? undefined : '4 3'} opacity={done ? 1 : 0.7 + 0.3 * pulse} />
            {done && <Circle cx={x} cy={y} r={8} fill={GN.gold} stroke={P.ink} strokeWidth={2} />}
            {done && [0, 1, 2, 3, 4].map((k) => <Circle key={k} cx={x + Math.cos(k * 1.2566) * 24} cy={y + Math.sin(k * 1.2566) * 24} r={7} fill={P.petal} stroke={P.ink} strokeWidth={2} />)}
            {done && <Circle cx={x} cy={y} r={8} fill={GN.gold} stroke={P.ink} strokeWidth={2} />}
            {base > y && <Line x1={x} y1={y + 16} x2={x} y2={base} stroke={P.leafDeep} strokeWidth={4} />}
            <SvgText x={x} y={y + 4} fontSize={12} fontFamily={F.bold} fill={done ? P.ink : GN.gold} textAnchor="middle">{i + 1}</SvgText>
          </G>
        );
      })}

      {/* Split children */}
      {g.children.map((c, i) => {
        if (g.isCollected(c)) return null;
        const n = (c.plugin?.budIndex ?? i) + 1;
        const r = c.circleRadius ?? 8;
        return (
          <G key={`drop${i}`} testID={`genesis-droplet-${n - 1}`} accessibilityLabel={`Droplet ${n}, matches bud ${n}`}>
            <Circle cx={c.position.x} cy={c.position.y} r={r} fill={P.drop} stroke={P.ink} strokeWidth={3} />
            <Circle cx={c.position.x - r * 0.3} cy={c.position.y - r * 0.3} r={r * 0.25} fill={P.white} opacity={0.8} />
            <SvgText x={c.position.x} y={c.position.y + 4} fontSize={Math.max(9, r)} fontFamily={F.bold} fill={P.white} textAnchor="middle">{n}</SvgText>
          </G>
        );
      })}

      {/* Status, kept small along the top edge */}
      {parts.length > 0 && (
        <G testID="genesis-objectives" accessibilityLabel={`Genesis objectives: ${parts.join(', ')}`}>
          <Rect x={W / 2 - 132} y={4} width={264} height={18} rx={9} fill={GN.bg} fillOpacity={0.78} stroke={GN.line} strokeWidth={1.5} />
          <SvgText x={W / 2} y={17} fontSize={10} fontFamily={F.bold} fill={GN.gold} textAnchor="middle">{parts.join(' · ')}</SvgText>
        </G>
      )}
    </G>
  );
}
