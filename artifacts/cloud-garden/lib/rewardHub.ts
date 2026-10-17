import type { AppRewardProfile } from './appRewards';

export type SkinId = 'classic' | 'neon' | 'crystal' | 'lava';
export type VaultTier = 'bronze' | 'silver' | 'gold';
export interface DailyRewardOffer { date: string; day: number; at: number }
export type HubRewardAction = 'dailyBrush' | 'fastPass' | 'vaultBronze' | 'vaultSilver' | 'vaultGold' | 'wheelAd';
export interface RewardOutcome { id: string; at: number; kind: string; label: string; wheelIndex?: number }
export interface HubInventory {
  streakDay: number; dailyClaimAt: number; inkCredits: number; inkRefills: number;
  infiniteInkUntil: number; levelSkips: number; genesisSkips: number;
  skins: SkinId[]; equippedSkin: SkinId; vaultNextAt: number;
  history: RewardOutcome[]; receipts: string[];
  /** Durable entitlements recover a skip if the separate progress write fails. */
  skipUnlocks: Record<string, number>;
}
export const SKINS: { id: SkinId; name: string; color: string; shine: string }[] = [
  { id: 'classic', name: 'Cloud Blue', color: '#62BFFF', shine: '#FFFFFF' },
  { id: 'neon', name: 'Neon Blue', color: '#12E3FF', shine: '#CCFFFF' },
  { id: 'crystal', name: 'Crystal Glass', color: '#B9C9FF', shine: '#FFFFFF' },
  { id: 'lava', name: 'Lava Drop', color: '#FF633D', shine: '#FFE696' },
];
export const VAULT_ODDS = {
  bronze: { infinite: 50, skip: 35, skin: 15 },
  silver: { infinite: 35, skip: 35, skin: 30 },
  gold: { infinite: 20, skip: 30, skin: 50 },
} as const;
export const DAILY_REWARDS = [
  { label: 'Ink refill', credits: 50, refill: 1, brush: 0, skip: 0, genesis: 0 },
  { label: 'Ink refill', credits: 75, refill: 1, brush: 0, skip: 0, genesis: 0 },
  { label: 'Golden Brush', credits: 100, refill: 0, brush: 1, skip: 0, genesis: 0 },
  { label: 'Double ink refill', credits: 125, refill: 2, brush: 0, skip: 0, genesis: 0 },
  { label: '2 Golden Brushes', credits: 150, refill: 0, brush: 2, skip: 0, genesis: 0 },
  { label: 'Level Skip', credits: 175, refill: 0, brush: 0, skip: 1, genesis: 0 },
  { label: 'Genesis Skip Pass', credits: 250, refill: 0, brush: 0, skip: 0, genesis: 1 },
];
export const DEFAULT_HUB: HubInventory = {
  streakDay: 0, dailyClaimAt: 0, inkCredits: 0, inkRefills: 0, infiniteInkUntil: 0,
  levelSkips: 0, genesisSkips: 0, skins: ['classic'], equippedSkin: 'classic',
  vaultNextAt: 0, history: [], receipts: [], skipUnlocks: {},
};
const number = (v: unknown, max = Number.MAX_SAFE_INTEGER) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
const isSkin = (v: unknown): v is SkinId => SKINS.some(s => s.id === v);
export function readHubInventory(raw: Partial<HubInventory>): HubInventory {
  const skins = Array.from(new Set<SkinId>(['classic', ...(Array.isArray(raw.skins) ? raw.skins.filter(isSkin) : [])]));
  return {
    streakDay: number(raw.streakDay, 7), dailyClaimAt: number(raw.dailyClaimAt),
    inkCredits: number(raw.inkCredits, 1_000_000), inkRefills: number(raw.inkRefills, 10000),
    infiniteInkUntil: number(raw.infiniteInkUntil), levelSkips: number(raw.levelSkips, 10000),
    genesisSkips: number(raw.genesisSkips, 10000), skins,
    equippedSkin: isSkin(raw.equippedSkin) && skins.includes(raw.equippedSkin) ? raw.equippedSkin : 'classic',
    vaultNextAt: number(raw.vaultNextAt),
    history: Array.isArray(raw.history) ? raw.history.filter(h => h && typeof h.id === 'string'
      && typeof h.label === 'string' && typeof h.kind === 'string' && Number.isFinite(h.at))
      .slice(0, 20).map(h => ({ id: h.id.slice(0, 120), label: h.label.slice(0, 200), kind: h.kind.slice(0, 30),
        at: number(h.at), ...(h.wheelIndex !== undefined ? { wheelIndex: number(h.wheelIndex, 3) } : {}) })) : [],
    receipts: Array.isArray(raw.receipts) ? raw.receipts.filter((id): id is string => typeof id === 'string')
      .slice(-128).map(id => id.slice(0, 120)) : [],
    skipUnlocks: Object.fromEntries(Object.entries(raw.skipUnlocks && typeof raw.skipUnlocks === 'object' ? raw.skipUnlocks : {})
      .filter(([key, n]) => ['classic', 'hardcore', 'genesis', 'void', 'singularity'].includes(key) && typeof n === 'number' && Number.isFinite(n) && n > 0)
      .map(([key, n]) => [key, number(n, 9999)])),
  };
}
export function rewardDay(now: number) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const ordinal = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};
export function dailyStatus(p: AppRewardProfile, now: number) {
  const today = rewardDay(now);
  const delta = p.dailyClaimDate ? ordinal(today) - ordinal(p.dailyClaimDate) : Infinity;
  const claimedToday = delta === 0;
  const day = delta === 1 ? p.streakDay % 7 + 1 : claimedToday ? Math.max(1, p.streakDay) : 1;
  const tomorrow = new Date(now); tomorrow.setHours(24, 0, 0, 0);
  return { claimedToday, day, canClaim: delta > 0 && now >= p.dailyClaimAt, nextAt: tomorrow.getTime(),
    displayedDay: claimedToday ? Math.max(1, p.streakDay) : day };
}
export function formatCountdown(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
/** Freeze the advertised daily prize at Watch, not at video close/midnight. */
export function createDailyRewardOffer(p: AppRewardProfile, now: number): DailyRewardOffer | undefined {
  const status = dailyStatus(p, now);
  return status.canClaim ? { date: rewardDay(now), day: status.day, at: now } : undefined;
}
const random = (r: number) => Math.min(.999999999, Math.max(0, Number.isFinite(r) ? r : 0));
const credits = (n: number) => Math.min(1_000_000, Math.max(0, n));

function finish(p: AppRewardProfile, id: string, now: number, kind: string, label: string, ad: boolean, wheelIndex?: number): AppRewardProfile {
  return { ...p, inkCredits: credits(p.inkCredits),
    rewardedAdsCompleted: p.rewardedAdsCompleted + (ad ? 1 : 0),
    receipts: [...p.receipts, id].slice(-128),
    history: [{ id, at: now, kind, label, ...(wheelIndex !== undefined ? { wheelIndex } : {}) }, ...p.history].slice(0, 20) };
}
/** Called ONLY by the SDK's earned-and-closed boundary, never by an ad button. */
export function grantHubAdReward(p: AppRewardProfile, action: HubRewardAction, now: number, id: string, rng = Math.random(), dailyOffer?: DailyRewardOffer): AppRewardProfile {
  if (!id || p.receipts.includes(id) || !Number.isFinite(now) || now < 0) return p;
  if (action === 'dailyBrush') {
    const offer = dailyOffer ?? createDailyRewardOffer(p, now);
    if (!offer || !Number.isFinite(offer.at) || offer.at < p.dailyClaimAt || !/^\d{4}-\d{2}-\d{2}$/.test(offer.date)) return p;
    const delta = p.dailyClaimDate ? ordinal(offer.date) - ordinal(p.dailyClaimDate) : Infinity;
    const expectedDay = delta === 1 ? p.streakDay % 7 + 1 : 1;
    if (!(delta > 0) || offer.day !== expectedDay) return p;
    const r = DAILY_REWARDS[offer.day - 1];
    return finish({ ...p, streakDay: offer.day, dailyClaimDate: offer.date, dailyClaimAt: Math.max(now, offer.at),
      inkCredits: p.inkCredits + r.credits, inkRefills: p.inkRefills + r.refill,
      goldenBrushes: p.goldenBrushes + r.brush, levelSkips: p.levelSkips + r.skip,
      genesisSkips: p.genesisSkips + r.genesis }, id, now, 'daily', `Day ${offer.day}: ${r.label} + ${r.credits} ink credits`, true);
  }
  if (action === 'fastPass') return finish({ ...p, genesisFastPasses: p.genesisFastPasses + 1 }, id, now, 'pass', 'Genesis Fast-Pass saved', true);
  if (action === 'wheelAd') return spinInkRush(p, now, id, true, rng);
  if (now < p.vaultNextAt) return p;
  const tier: VaultTier = action === 'vaultBronze' ? 'bronze' : action === 'vaultSilver' ? 'silver' : 'gold';
  const odds = VAULT_ODDS[tier], roll = random(rng) * 100;
  let next = { ...p, vaultNextAt: now + 3600000 }, label: string;
  if (roll < odds.infinite) {
    next.infiniteInkUntil = Math.max(now, p.infiniteInkUntil) + 300000;
    label = 'Infinite ink · 5 minutes (line length only)';
  } else if (roll < odds.infinite + odds.skip) {
    next.levelSkips++; label = 'Instant Level Skip saved';
  } else {
    const skinRoll = (roll - odds.infinite - odds.skip) / odds.skin;
    const skin = SKINS[1 + Math.min(2, Math.floor(skinRoll * 3))];
    if (next.skins.includes(skin.id)) { next.inkCredits += 100; label = `${skin.name} duplicate → 100 ink credits`; }
    else { next.skins = [...next.skins, skin.id]; label = `${skin.name} skin unlocked`; }
  }
  return finish(next, id, now, 'vault', `${tier.toUpperCase()} VAULT: ${label}`, true);
}

/** Free virtual credits only. Debit + outcome are one durable transaction. */
export function spinInkRush(p: AppRewardProfile, now: number, id: string, ad = false, rng = Math.random()) {
  if (!id || !Number.isFinite(now) || now < 0 || p.receipts.includes(id) || (!ad && p.inkCredits < 20)) return p;
  const r = random(rng), index = r < .4 ? 0 : r < .8 ? 1 : r < .98 ? 2 : 3;
  const payout = [ad ? 10 : 0, 40, 100, 500][index];
  return finish({ ...p, inkCredits: p.inkCredits - (ad ? 0 : 20) + payout }, id, now, 'wheel',
    `${['No multiplier', '2× reward', '5× reward', 'JACKPOT'][index]} · ${payout} ink${ad ? ' (ad spin)' : ' (20 ink wager)'}`, ad, index);
}
export function equipRewardSkin(p: AppRewardProfile, skin: SkinId) {
  return p.skins.includes(skin) && p.equippedSkin !== skin ? { ...p, equippedSkin: skin } : p;
}
export function consumeHubItem(p: AppRewardProfile, field: 'inkRefills' | 'levelSkips' | 'genesisSkips') {
  return p[field] > 0 ? { ...p, [field]: p[field] - 1 } : p;
}
export function consumeSkip(p: AppRewardProfile, genesisOnly: boolean, mode: string, idx: number, total: number) {
  if (!['classic', 'hardcore', 'genesis', 'void', 'singularity'].includes(mode)
    || (genesisOnly && mode !== 'genesis') || !Number.isInteger(idx) || idx < 0 || idx + 1 >= total) return p;
  const field = genesisOnly ? 'genesisSkips' : 'levelSkips';
  if (p[field] < 1) return p;
  return { ...p, [field]: p[field] - 1, skipUnlocks: { ...p.skipUnlocks, [mode]: Math.max(p.skipUnlocks[mode] ?? 0, idx + 1) } };
}
export function clearSkipEntitlement(p: AppRewardProfile, mode: string) {
  if (p.skipUnlocks[mode] === undefined) return p;
  const next = { ...p.skipUnlocks }; delete next[mode];
  return { ...p, skipUnlocks: next };
}
