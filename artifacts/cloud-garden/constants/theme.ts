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

// The Void Protocol: dark neon red / purple. Used only when Void mode is selected.
export const VD = {
  bg: '#0B0614',
  bgDeep: '#05030A',
  skyBottom: '#2A0D3F',
  panel: '#170C28',
  panelHi: '#241042',
  line: '#4B1F7A',
  text: '#F3E8FF',
  textSoft: '#B79AD9',
  red: '#FF2457',
  redDeep: '#B3123A',
  purple: '#9B4DFF',
  purpleDeep: '#5B21B6',
  magenta: '#E040FB',
  gold: '#FFC857',
  ok: '#3DF5C0',
};

/** The Genesis Gauntlet's amber arcade palette. */
export const GN = {
  bg: '#211308',
  bgDeep: '#120A04',
  skyBottom: '#3A2109',
  panel: '#2B1A0A',
  panelHi: '#442909',
  line: '#8F5212',
  text: '#FFF3D6',
  textSoft: '#E4B96E',
  amber: '#FFB21C',
  gold: '#FFD34E',
  orange: '#FF6B1B',
  glow: '#FFE08A',
  ink: '#241405',
};

/** Holographic cyan and gold palette for Singularity Paradox. */
export const SG = {
  bg: '#06121F',
  bgDeep: '#030912',
  skyBottom: '#102A43',
  panel: '#0B1D30',
  panelHi: '#12324A',
  line: '#22536E',
  text: '#E7FBFF',
  textSoft: '#95C8D8',
  cyan: '#4CEBFF',
  cyanDeep: '#10A8D0',
  gold: '#FFC857',
  violet: '#8A76FF',
  glow: '#A5F7FF',
};

/** Gold vault styling used by the persistent ad-reward hub. */
export const REWARD_GOLD = {
  bg: '#18110A',
  panel: '#2A1C0B',
  panelHi: '#3B290E',
  line: '#A97923',
  text: '#FFF2C2',
  textSoft: '#E4C37A',
  gold: '#FFD35A',
  glow: '#FFF0A8',
};
