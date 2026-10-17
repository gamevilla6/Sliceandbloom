import React from 'react';
import { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { GardenEngine } from '@/lib/engine';
import type { Level } from '@/lib/levels';
import { F, GN, P, SG, VD } from '@/constants/theme';
import { HOT } from '@/components/HardcoreLayer';

const arrow = (cx: number, cy: number, ux: number, uy: number, L: number) => {
  const sx = cx - ux * L / 2, sy = cy - uy * L / 2, ex = cx + ux * L / 2, ey = cy + uy * L / 2;
  return `M${sx} ${sy} L${ex} ${ey} M${ex - ux * 7 - uy * 5} ${ey - uy * 7 + ux * 5} L${ex} ${ey} L${ex - ux * 7 + uy * 5} ${ey - uy * 7 - ux * 5}`;
};

export function InfinityLayer({ engine, level }: { engine: GardenEngine; level: Level }) {
  'use no memo';
  const t = engine.time;
  const genesis = level.visualMode === 'genesis';
  const singularity = level.visualMode === 'singularity';
  const voidMode = !!level.voidProtocol;
  const field = voidMode ? VD.magenta : genesis ? GN.amber : singularity ? SG.cyan : P.petal;
  const flow = voidMode ? VD.red : genesis ? GN.glow : singularity ? SG.gold : P.coralDeep;
  const heatColor = voidMode ? VD.red : genesis ? GN.orange : singularity ? SG.gold : HOT;
  const mags = (level.magneticZones ?? []).map((z) => ({ z, f: z.field ?? level.magneticField }));
  const thermals = level.thermalZone ? (level.thermalZones ?? []) : [];
  const heat = engine.infinity?.heat;
  const hot: { x: number; y: number; r: number; k: number }[] = [];
  if (heat && heat.size) {
    for (const b of engine.bodies) {
      const h = heat.get(b.id);
      if (h) hot.push({ x: b.position.x, y: b.position.y, r: Math.max(14, (b.bounds.max.x - b.bounds.min.x) / 2 + 6), k: Math.min(1, h / 2) });
    }
  }
  const txt = (x: number, y: number, s: string, c: string) => (
    <SvgText x={x} y={y} fontSize={10} fontFamily={F.semi} fill={c} textAnchor="middle">{s}</SvgText>
  );
  return (
    <G>
      {mags.map(({ z, f }, i) => {
        const fx = f?.x ?? 0, fy = f?.y ?? 0;
        const m = Math.hypot(fx, fy) || 1;
        const ux = fx / m, uy = fy / m;
        return (
          <G key={`mg${i}`}>
            <Rect x={z.x - z.w / 2} y={z.y - z.h / 2} width={z.w} height={z.h} rx={12} fill={field} opacity={0.16} stroke={field} strokeWidth={2.5} strokeDasharray="3 6" strokeDashoffset={-t * 20} />
            {[-1, 0, 1].map((j) => {
              const k = (t * 0.5 + j * 0.33 + 1) % 1;
              return <Path key={j} d={arrow(z.x + (uy ? j * z.w / 4 : (k - 0.5) * z.w * 0.6), z.y + (uy ? (k - 0.5) * z.h * 0.6 : j * z.h / 4), ux, uy, 22)} stroke={flow} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={Math.sin(k * Math.PI)} />;
            })}
            {txt(z.x, z.y - z.h / 2 + 13, `MAGNET ${ux >= 0.5 ? 'E' : ux <= -0.5 ? 'W' : ''}${uy >= 0.5 ? 'S' : uy <= -0.5 ? 'N' : ''}`.trim(), flow)}
          </G>
        );
      })}
      {thermals.map((z, i) => (
        <G key={`th${i}`}>
          <Rect x={z.x - z.w / 2} y={z.y - z.h / 2} width={z.w} height={z.h} rx={8} fill={heatColor} opacity={0.22 + 0.06 * Math.sin(t * 4)} />
          <Rect x={z.x - z.w / 2} y={z.y - z.h / 2} width={z.w} height={z.h} rx={8} fill="none" stroke={heatColor} strokeWidth={4} strokeDasharray="10 6" strokeDashoffset={-t * 30} />
          {txt(z.x, z.y - z.h / 2 + 14, 'HEAT 2s', heatColor)}
        </G>
      ))}
      {hot.map((h, i) => (
        <G key={`ht${i}`}>
          <Circle cx={h.x} cy={h.y} r={h.r} fill="none" stroke={heatColor} strokeWidth={3} opacity={0.4} />
          <Circle cx={h.x} cy={h.y} r={h.r} fill="none" stroke={heatColor} strokeWidth={4} strokeDasharray={`${(h.k * 2 * Math.PI * h.r).toFixed(1)} 999`} rotation={-90} originX={h.x} originY={h.y} />
        </G>
      ))}
    </G>
  );
}
