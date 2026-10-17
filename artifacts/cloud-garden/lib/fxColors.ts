/** Shared engine-side effect colors; kept in lib so the physics test build stays platform-free. */
export const FX = {
  campaign: { water: '#247BEB', mint: '#5FE0C0', white: '#FFFDF5', petal: '#FF7BA5', gold: '#FFD348', leaf: '#4FB36B', wood: '#EBAE50', woodDeep: '#A8691F' },
  genesis: { amber: '#FFB21C', orange: '#FF6B1B', gold: '#FFD34E', glow: '#FFE08A' },
  void: { red: '#FF2457', magenta: '#E040FB', purple: '#9B4DFF', text: '#F3E8FF', ok: '#3DF5C0', gold: '#FFC857' },
  singularity: { cyan: '#4CEBFF', gold: '#FFC857', violet: '#8A76FF', glow: '#A5F7FF' },
} as const;
