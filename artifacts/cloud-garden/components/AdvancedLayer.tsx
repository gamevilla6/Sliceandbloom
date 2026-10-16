import React from 'react';
import { Circle, G, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import type { GardenEngine } from '@/lib/engine';
import { W } from '@/lib/levels';
import type { Level } from '@/lib/levels';
import { F, P } from '@/constants/theme';
import { InfinityLayer } from '@/components/InfinityLayer';
import { HOT } from '@/components/HardcoreLayer';

const poly = (v: { x: number; y: number }[]) => 'M' + v.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L') + ' Z';

export function AdvancedLayer({ engine, level }: { engine: GardenEngine; level: Level }) {
  'use no memo';
  // Do not cache SVG maps by stable arrays: their Matter bodies change every tick.
  const t = engine.time;
  const adv = engine.advanced;
  const label = (x: number, y: number, s: string, c: string = P.ink) => (
    <SvgText x={x} y={y} fontSize={10} fontFamily={F.semi} fill={c} textAnchor="middle">{s}</SvgText>
  );
  return (
    <G>
      {(level.winds ?? []).map((z, i) => {
        const fx = z.force.x, fy = z.force.y;
        const mag = Math.hypot(fx, fy) || 1;
        const ux = fx / mag, uy = fy / mag;
        const horiz = Math.abs(ux) >= Math.abs(uy);
        const span = horiz ? z.w : z.h;
        return (
          <G key={`w${i}`}>
            <Rect x={z.x - z.w / 2} y={z.y - z.h / 2} width={z.w} height={z.h} rx={14} fill={P.skyTop} opacity={0.18} stroke={P.drop} strokeWidth={2} strokeDasharray="6 8" strokeDashoffset={-t * 30} />
            {Array.from({ length: 6 }).map((_, j) => {
              const k = ((t * 0.35 + j / 6) % 1);
              const lane = (j + 0.5) / 6;
              const along = (k - 0.5) * span;
              const px = horiz ? z.x + along * Math.sign(ux || 1) : z.x - z.w / 2 + lane * z.w;
              const py = horiz ? z.y - z.h / 2 + lane * z.h : z.y + along * Math.sign(uy || 1);
              const L = 16;
              const ex = px + ux * L, ey = py + uy * L;
              const op = Math.sin(k * Math.PI) * 0.9;
              return (
                <G key={j} opacity={op}>
                  <Path d={`M${px} ${py} L${ex} ${ey}`} stroke={P.white} strokeWidth={3} strokeLinecap="round" />
                  <Polyline points={`${ex - ux * 5 - uy * 4},${ey - uy * 5 + ux * 4} ${ex},${ey} ${ex - ux * 5 + uy * 4},${ey - uy * 5 - ux * 4}`} fill="none" stroke={P.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                </G>
              );
            })}
            {label(z.x, z.y - z.h / 2 + 14, 'WIND', P.dropDeep)}
          </G>
        );
      })}

      {adv.movers.map(({ spec, body }, i) => {
        const ax = spec.axis === 'x';
        const x0 = ax ? spec.x - spec.amplitude : spec.x;
        const x1 = ax ? spec.x + spec.amplitude : spec.x;
        const y0 = ax ? spec.y : spec.y - spec.amplitude;
        const y1 = ax ? spec.y : spec.y + spec.amplitude;
        const { x, y } = body.position;
        const teeth = Math.max(2, Math.round(spec.w / 12));
        return (
          <G key={`m${i}`}>
            <Path d={`M${x0} ${y0} L${x1} ${y1}`} stroke={P.ink} strokeWidth={8} strokeLinecap="round" opacity={0.25} />
            <Path d={`M${x0} ${y0} L${x1} ${y1}`} stroke={P.paper} strokeWidth={3} strokeLinecap="round" strokeDasharray="4 6" />
            <G transform={`translate(${x} ${y}) rotate(${(body.angle * 180) / Math.PI})`}>
              <Rect x={-spec.w / 2} y={-spec.h / 2} width={spec.w} height={spec.h} rx={5} fill={P.thorn} stroke={P.ink} strokeWidth={3} />
              {Array.from({ length: teeth }).map((_, j) => {
                const w = spec.w / teeth;
                const bx = -spec.w / 2 + j * w;
                return <Path key={j} d={`M${bx} ${-spec.h / 2} L${bx + w / 2} ${-spec.h / 2 - 7} L${bx + w} ${-spec.h / 2} Z M${bx} ${spec.h / 2} L${bx + w / 2} ${spec.h / 2 + 7} L${bx + w} ${spec.h / 2} Z`} fill={P.coral} stroke={P.ink} strokeWidth={2} strokeLinejoin="round" />;
              })}
              <Circle r={4} fill={P.marigold} stroke={P.ink} strokeWidth={2} />
            </G>
          </G>
        );
      })}

      {adv.portals.map(({ spec, a, b }, i) => (
        <G key={`p${i}`}>
          <Path d={`M${a.position.x} ${a.position.y} L${b.position.x} ${b.position.y}`} stroke={P.petal} strokeWidth={2} strokeDasharray="3 9" strokeDashoffset={-t * 20} opacity={0.35} />
          {[[a, P.petal, 'A', 1], [b, P.mint, 'B', -1]].map(([body, col, name, dir]) => {
            const bd = body as typeof a;
            const c = col as string;
            const r = spec.r;
            return (
              <G key={name as string} transform={`translate(${bd.position.x} ${bd.position.y})`}>
                <Circle r={r + 5 + Math.sin(t * 3) * 2} fill={c} opacity={0.25} />
                <Circle r={r} fill={P.ink} opacity={0.85} stroke={P.ink} strokeWidth={3} />
                <G rotation={(dir as number) * t * 120}>
                  <Circle r={r - 3} fill="none" stroke={c} strokeWidth={4} strokeDasharray="10 7" strokeLinecap="round" />
                </G>
                <Circle r={r * 0.4} fill={c} opacity={0.6 + 0.3 * Math.sin(t * 4)} />
                {label(0, 4, name as string, P.white)}
                {!!spec.rotation && (
                  <G rotation={(dir as number) * (spec.rotation * 180) / Math.PI}>
                    <Path d={`M0 ${-r - 4} L0 ${-r - 16} M-5 ${-r - 11} L0 ${-r - 17} L5 ${-r - 11}`} stroke={c} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </G>
                )}
              </G>
            );
          })}
        </G>
      ))}

      {adv.switches.map((s, i) => {
        const g = s.gate;
        const bp = s.button.position;
        const bw = s.spec.button.w, bh = s.spec.button.h;
        const press = s.active ? 4 : 0;
        return (
          <G key={`s${i}`}>
            <Path d={`M${bp.x} ${bp.y} L${s.spec.gate.x} ${s.spec.gate.y}`} stroke={s.active ? P.leaf : P.marigold} strokeWidth={2} strokeDasharray="2 8" strokeDashoffset={s.active ? 0 : -t * 16} opacity={0.5} />
            <Rect x={bp.x - bw / 2 - 4} y={bp.y + bh / 2 - 3} width={bw + 8} height={6} rx={3} fill={P.stoneDeep} stroke={P.ink} strokeWidth={2} />
            <Rect x={bp.x - bw / 2} y={bp.y - bh / 2 + press} width={bw} height={bh - press} rx={4} fill={s.active ? P.leaf : P.marigold} stroke={P.ink} strokeWidth={3} />
            {label(bp.x, bp.y - bh / 2 - 6, s.active ? 'PRESSED' : 'HEAVY ONLY', P.ink)}
            {!engine.isObstacleVisible(g) ? null : s.active ? (
              <G opacity={0.55}>
                <Path d={poly(g.vertices)} fill="none" stroke={P.leaf} strokeWidth={2} strokeDasharray="4 6" />
                {label(s.spec.gate.x, s.spec.gate.y + 4, 'OPEN', P.leafDeep)}
              </G>
            ) : (
              <G>
                <Path d={poly(g.vertices)} fill={P.coral} stroke={P.ink} strokeWidth={3} strokeLinejoin="round" />
                <Path d={`M${s.spec.gate.x - s.spec.gate.w / 2 + 6} ${s.spec.gate.y} L${s.spec.gate.x + s.spec.gate.w / 2 - 6} ${s.spec.gate.y}`} stroke={P.paper} strokeWidth={3} strokeDasharray="6 6" />
                {label(s.spec.gate.x, s.spec.gate.y - s.spec.gate.h / 2 - 5, 'LOCKED', P.coralDeep)}
              </G>
            )}
          </G>
        );
      })}

      {(level.gravityZones ?? []).map((z, i) => {
        const on = engine.gravityRemaining > 0;
        return (
          <G key={`g${i}`} transform={`translate(${z.x} ${z.y}) rotate(${((z.angle ?? 0) * 180) / Math.PI})`}>
            <Rect x={-z.w / 2} y={-z.h / 2} width={z.w} height={z.h} rx={10} fill={P.petal} opacity={on ? 0.28 : 0.14} stroke={P.petal} strokeWidth={2.5} strokeDasharray="7 7" strokeDashoffset={-t * 24} />
            {[-1, 0, 1].map((j) => {
              const k = (t * 0.6 + j * 0.33 + 1) % 1;
              const ay = z.h / 2 - 10 - k * Math.max(0, z.h - 20);
              return <Path key={j} d={`M${j * Math.min(24, z.w / 4)} ${ay + 8} L${j * Math.min(24, z.w / 4)} ${ay - 6} M${j * Math.min(24, z.w / 4) - 5} ${ay - 1} L${j * Math.min(24, z.w / 4)} ${ay - 7} L${j * Math.min(24, z.w / 4) + 5} ${ay - 1}`} stroke={P.coralDeep} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={Math.sin(k * Math.PI) * 0.9} />;
            })}
            {label(0, -z.h / 2 + 13, on ? `UP ${engine.gravityRemaining.toFixed(1)}s` : engine.hardcore.zones[i]?.used ? 'SPENT' : `FLIP ${z.duration}s`, P.coralDeep)}
          </G>
        );
      })}

      {(level.lasers ?? []).map((l, i) => {
        const w = l.width ?? 6;
        const on = engine.hardcore.isLaserActive(i);
        const pulse = 0.75 + 0.25 * Math.sin(t * 14 + i);
        const d = `M${l.a.x} ${l.a.y} L${l.b.x} ${l.b.y}`;
        const mx = (l.a.x + l.b.x) / 2, my = (l.a.y + l.b.y) / 2;
        return (
          <G key={`l${i}`}>
            {on ? (
              <G>
                <Path d={d} stroke={HOT} strokeWidth={w + 10} strokeLinecap="round" opacity={0.2 * pulse} />
                <Path d={d} stroke={HOT} strokeWidth={w + 3} strokeLinecap="round" opacity={0.55} />
                <Path d={d} stroke={HOT} strokeWidth={w} strokeLinecap="butt" opacity={pulse} />
                <Path d={d} stroke={P.white} strokeWidth={Math.max(1.5, w * 0.3)} strokeLinecap="butt" opacity={0.9} />
              </G>
            ) : (
              <Path d={d} stroke={P.stone} strokeWidth={2} strokeDasharray="3 7" opacity={0.5} />
            )}
            {[l.a, l.b].map((p, j) => (
              <G key={j} opacity={on ? 1 : 0.6}>
                <Circle cx={p.x} cy={p.y} r={w / 2 + 5} fill={P.stoneDeep} stroke={P.ink} strokeWidth={3} />
                <Circle cx={p.x} cy={p.y} r={w / 2 + 1} fill={on ? HOT : P.stone} stroke={P.ink} strokeWidth={1.5} />
              </G>
            ))}
            {label(mx, my - w / 2 - 8, on ? 'ON' : 'OFF', on ? HOT : P.stoneDeep)}
          </G>
        );
      })}

      {engine.hardcore.rotors.filter((r) => engine.isObstacleVisible(r.body)).map(({ spec, body }, i) => {
        const dir = (level.rotatingBarrierSpeed ?? 1) >= 0 ? 1 : -1;
        const { x, y } = body.position;
        return (
          <G key={`r${i}`}>
            <Circle cx={spec.x} cy={spec.y} r={Math.min(spec.w, spec.h) / 2 + 12} fill="none" stroke={P.petal} strokeWidth={2} strokeDasharray="4 8" opacity={0.5} strokeDashoffset={-dir * t * 20} />
            <Path d={poly(body.vertices)} fill="#7A4DE0" stroke={P.ink} strokeWidth={3} strokeLinejoin="round" />
            <G transform={`translate(${x} ${y}) rotate(${(body.angle * 180) / Math.PI})`}>
              <Path d={`M${-spec.w / 2 + 6} 0 L${spec.w / 2 - 6} 0`} stroke={P.marigold} strokeWidth={Math.max(3, spec.h * 0.5)} strokeDasharray="8 8" opacity={0.95} />
            </G>
            <Circle cx={spec.x} cy={spec.y} r={7} fill={P.marigold} stroke={P.ink} strokeWidth={2.5} />
            <Path d={dir > 0 ? `M${spec.x - 3} ${spec.y - 2} L${spec.x + 3} ${spec.y} L${spec.x - 3} ${spec.y + 2}` : `M${spec.x + 3} ${spec.y - 2} L${spec.x - 3} ${spec.y} L${spec.x + 3} ${spec.y + 2}`} stroke={P.ink} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </G>
        );
      })}

      {engine.hardcore.crushers.filter((c) => engine.isObstacleVisible(c.left) || engine.isObstacleVisible(c.right)).map(({ spec, left, right }, i) => (
        <G key={`c${i}`}>
          <Path d={`M0 ${spec.y} L${W} ${spec.y}`} stroke={P.ink} strokeWidth={6} opacity={0.18} />
          <Path d={`M0 ${spec.y} L${W} ${spec.y}`} stroke={HOT} strokeWidth={2} strokeDasharray="5 7" strokeDashoffset={-t * 18} opacity={0.7} />
          {[left, right].map((b, j) => (
            <Path key={j} d={poly(b.vertices)} fill={HOT} stroke={P.ink} strokeWidth={3} strokeLinejoin="round" />
          ))}
          {label((left.position.x + right.position.x) / 2, spec.y - spec.h / 2 - 6, 'CRUSH', HOT)}
        </G>
      ))}

      <InfinityLayer engine={engine} level={level} />

      {adv.weights.filter((b) => engine.isObstacleVisible(b)).map((b) => {
        const bw = b.bounds.max.x - b.bounds.min.x;
        const cx = b.position.x, cy = b.position.y;
        return (
          <G key={b.id}>
            <Path d={poly(b.vertices)} fill={P.inkSoft} stroke={P.ink} strokeWidth={3.5} strokeLinejoin="round" />
            <G transform={`translate(${cx} ${cy}) rotate(${(b.angle * 180) / Math.PI})`}>
              <Rect x={-bw / 4} y={-bw / 4} width={bw / 2} height={bw / 2} rx={3} fill="none" stroke={P.marigold} strokeWidth={2.5} />
              {label(0, 4, 'HVY', P.marigold)}
            </G>
          </G>
        );
      })}
    </G>
  );
}
