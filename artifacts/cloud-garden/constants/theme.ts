export const P = {
  paper: '#FFF5D6',
  paperDeep: '#FFE79A',
  ink: '#14275C',
  inkSoft: '#4A5A8C',
  coral: '#FF665A',
  coralDeep: '#D63E33',
  marigold: '#FFD348',
  skyTop: '#7CC4FF',
  skyBottom: '#FFF5D6',
  drop: '#247BEB',
  dropDeep: '#1558B8',
  leaf: '#4FB36B',
  leafDeep: '#2E8049',
  soil: '#C8754A',
  soilDeep: '#8E4A2C',
  wood: '#EBAE50',
  woodDeep: '#A8691F',
  stone: '#7F90A3',
  stoneDeep: '#4D5C6D',
  thorn: '#D6384A',
  mint: '#5FE0C0',
  petal: '#FF7BA5',
  wilt: '#A39274',
  white: '#FFFDF5',
};

export const R = { btn: 14, card: 22, frame: 20 };

export const F = {
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semi: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
};

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a: string, b: string, t: number) {
  const x = hex(a);
  const y = hex(b);
  const k = Math.max(0, Math.min(1, t));
  const r = x.map((v, i) => Math.round(v + (y[i] - v) * k));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
}
