import React from 'react';
import { Circle, G, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import type { GardenEngine } from '@/lib/engine';
import type { Level } from '@/lib/levels';
import { F, P } from '@/constants/theme';

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
            {s.active ? (
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

      {adv.weights.map((b) => {
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
