import type { ReactElement } from 'react';

export const BANNER_AD_RESERVED_HEIGHT = 90;

export type BannerAdComponentProps = {
  /** Lets the containing screen keep a no-overlap slot sized to the loaded banner. */
  onHeightChange?: (height: number) => void;
};

/** Browser previews have no native AdMob SDK, so they intentionally render no ad. */
export function BannerAdComponent(_props: BannerAdComponentProps = {}): ReactElement | null {
  return null;
}
