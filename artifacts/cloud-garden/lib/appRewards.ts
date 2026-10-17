import { DEFAULT_HUB, readHubInventory, type HubInventory } from './rewardHub';

export interface AppRewardProfile extends HubInventory {
  dailyClaimDate: string | null;
  goldenBrushes: number;
  genesisFastPasses: number;
  rewardedInkRetries: number;
  rewardedHints: number;
  rewardedAdsCompleted: number;
  fastPassTrialsCleared: number;
}

export const DEFAULT_APP_REWARDS: AppRewardProfile = {
  ...DEFAULT_HUB,
  dailyClaimDate: null,
  goldenBrushes: 0,
  genesisFastPasses: 0,
  rewardedInkRetries: 0,
  rewardedHints: 0,
  rewardedAdsCompleted: 0,
  fastPassTrialsCleared: 0,
};

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value)))
    : 0;
}

export function readAppRewardProfile(raw: unknown): AppRewardProfile {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Partial<AppRewardProfile>
    : {};
  const date = typeof value.dailyClaimDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.dailyClaimDate)
    ? value.dailyClaimDate
    : null;
  return {
    ...readHubInventory(value),
    dailyClaimDate: date,
    goldenBrushes: count(value.goldenBrushes),
    genesisFastPasses: count(value.genesisFastPasses),
    rewardedInkRetries: count(value.rewardedInkRetries),
    rewardedHints: count(value.rewardedHints),
    rewardedAdsCompleted: count(value.rewardedAdsCompleted),
    fastPassTrialsCleared: count(value.fastPassTrialsCleared),
  };
}

export function localRewardDay(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function claimDailyGoldenBrush(profile: AppRewardProfile, day: string): AppRewardProfile {
  if (profile.dailyClaimDate === day) return profile;
  return {
    ...profile,
    dailyClaimDate: day,
    goldenBrushes: profile.goldenBrushes + 1,
    rewardedAdsCompleted: profile.rewardedAdsCompleted + 1,
  };
}

export function consumeGoldenBrush(profile: AppRewardProfile): AppRewardProfile {
  return profile.goldenBrushes > 0
    ? { ...profile, goldenBrushes: profile.goldenBrushes - 1 }
    : profile;
}

export function grantGenesisFastPass(profile: AppRewardProfile): AppRewardProfile {
  return {
    ...profile,
    genesisFastPasses: profile.genesisFastPasses + 1,
    rewardedAdsCompleted: profile.rewardedAdsCompleted + 1,
  };
}

export function consumeGenesisFastPass(profile: AppRewardProfile): AppRewardProfile {
  return profile.genesisFastPasses > 0
    ? { ...profile, genesisFastPasses: profile.genesisFastPasses - 1 }
    : profile;
}

export function recordRewardedInkRetry(profile: AppRewardProfile): AppRewardProfile {
  return {
    ...profile,
    rewardedInkRetries: profile.rewardedInkRetries + 1,
    rewardedAdsCompleted: profile.rewardedAdsCompleted + 1,
  };
}

export function recordRewardedHint(profile: AppRewardProfile): AppRewardProfile {
  return {
    ...profile,
    rewardedHints: profile.rewardedHints + 1,
    rewardedAdsCompleted: profile.rewardedAdsCompleted + 1,
  };
}

export function recordFastPassTrialClear(profile: AppRewardProfile): AppRewardProfile {
  return { ...profile, fastPassTrialsCleared: profile.fastPassTrialsCleared + 1 };
}
