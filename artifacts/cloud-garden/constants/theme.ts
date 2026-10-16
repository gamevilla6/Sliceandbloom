export const P = {
  paper: '#FFF3DC',
  paperDeep: '#FBE0B0',
  ink: '#17343B',
  inkSoft: '#4C6A70',
  coral: '#FF5D4D',
  coralDeep: '#C9362A',
  marigold: '#FFC233',
  skyTop: '#9ED8F0',
  skyBottom: '#FFF3DC',
  drop: '#3EA6FF',
  dropDeep: '#1F6FD1',
  leaf: '#4FB36B',
  leafDeep: '#2E8049',
  soil: '#C8754A',
  soilDeep: '#8E4A2C',
  wood: '#EBAE50',
  woodDeep: '#A8691F',
  stone: '#7F90A3',
  stoneDeep: '#4D5C6D',
  thorn: '#D6384A',
  mint: '#7FD9C4',
  petal: '#FF7BA5',
  wilt: '#A39274',
  white: '#FFFBF2',
};

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
