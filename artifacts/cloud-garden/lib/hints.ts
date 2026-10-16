// Presentation state only. Browsing a hint must never perform a game action.
export interface HintView {
  visible: boolean;
  step: number;
  overview: boolean;
}

export const INITIAL_HINT_VIEW: HintView = { visible: false, step: 0, overview: false };

export type HintAction =
  | { type: 'reset' | 'toggle' | 'show' | 'overview' }
  | { type: 'previous' | 'next'; count: number };

export function hintReducer(state: HintView, action: HintAction): HintView {
  switch (action.type) {
    case 'reset':
      return INITIAL_HINT_VIEW;
    case 'show':
      return { ...INITIAL_HINT_VIEW, visible: true };
    case 'toggle':
      return { ...INITIAL_HINT_VIEW, visible: !state.visible };
    case 'overview':
      return { ...state, overview: !state.overview };
    case 'previous':
    case 'next':
      return {
        ...state,
        overview: false,
        step: Math.max(0, Math.min(Math.max(0, action.count - 1), state.step + (action.type === 'next' ? 1 : -1))),
      };
  }
}
