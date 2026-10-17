import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { AppRewardProfile } from '../lib/appRewards';
import { BannerAdComponent, BANNER_AD_RESERVED_HEIGHT } from './BannerAdComponent';
import { DAILY_REWARDS, SKINS, VAULT_ODDS, dailyStatus, formatCountdown, type HubRewardAction, type SkinId, type VaultTier } from '../lib/rewardHub';

export type RewardHubProps = {
  profile: AppRewardProfile; now: number; ready: boolean; supported: boolean;
  adStatus: 'idle' | 'loading' | 'ready' | 'showing' | 'unavailable';
  adReady?: boolean;
  pendingReward: HubRewardAction | 'retryInk' | 'hint' | null;
  message?: string; storageError?: string; canUseBrush: boolean; canSkip: boolean; inGenesis: boolean;
  onWatch: (action: HubRewardAction) => void; onWheelWager: () => void; onUseBrush: () => void;
  onUseRefill: () => void; onUseFastPass: () => void; onSkip: (genesisOnly: boolean) => void;
  onEquipSkin: (skin: SkinId) => void; onRetrySave: () => void; onClose: () => void;
};

const C = { bg: '#140D08', panel: '#211409', panel2: '#2C1B0D', gold: '#F2B93B', glow: '#FFDE8A', deep: '#9A6A12', text: '#F7E8C8', dim: '#BFA57A', ok: '#8FD694', warn: '#FF9A7A' };
const SECTORS = [
  { t: '0×', c: '#3A2A1A', d: 'No multiplier' }, { t: '2×', c: '#7A5418', d: '40 ink' },
  { t: '5×', c: '#B8801F', d: '100 ink' }, { t: '500', c: '#F2B93B', d: 'Jackpot' },
];
const WHEEL_ODDS = [40, 40, 18, 2];
const SECTOR_SPAN = WHEEL_ODDS.map(o => o * 3.6);
const SECTOR_START = SECTOR_SPAN.map((_, i) => SECTOR_SPAN.slice(0, i).reduce((x, y) => x + y, 0));
const SECTOR_CENTER = SECTOR_START.map((st, i) => st + SECTOR_SPAN[i] / 2);
const CHEST: Record<VaultTier, { name: string; a: string; b: string }> = {
  bronze: { name: 'Bronze', a: '#C98A55', b: '#7A4A25' },
  silver: { name: 'Silver', a: '#E3E6EC', b: '#8C93A3' },
  gold: { name: 'Gold', a: '#FFD966', b: '#B8801F' },
};
const TIER_ACTION: Record<VaultTier, HubRewardAction> = { bronze: 'vaultBronze', silver: 'vaultSilver', gold: 'vaultGold' };

function ChestIcon({ tier }: { tier: VaultTier }) {
  const { a, b } = CHEST[tier];
  return (
    <Svg width={64} height={52} viewBox="0 0 64 52">
      <Path d="M6 22 Q6 6 32 6 Q58 6 58 22Z" fill={a} stroke={C.glow} strokeWidth={1.5} />
      <Rect x={6} y={22} width={52} height={26} rx={4} fill={b} stroke={C.glow} strokeWidth={1.5} />
      <Rect x={6} y={20} width={52} height={5} fill={a} />
      <Rect x={26} y={18} width={12} height={14} rx={3} fill="#2A1A0A" stroke={C.glow} strokeWidth={1.5} />
      <Circle cx={32} cy={24} r={2} fill={C.glow} />
    </Svg>
  );
}

function Wheel({ size, rotation }: { size: number; rotation: ReturnType<typeof useSharedValue<number>> }) {
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const r = 100;
  const pt = (deg: number, rad: number) => ({ x: 100 + rad * Math.sin(deg * Math.PI / 180), y: 100 - rad * Math.cos(deg * Math.PI / 180) });
  const arc = (i: number) => {
    const p0 = pt(SECTOR_START[i], r), p1 = pt(SECTOR_START[i] + SECTOR_SPAN[i], r);
    return `M100 100 L${p0.x} ${p0.y} A${r} ${r} 0 0 1 ${p1.x} ${p1.y}Z`;
  };
  return (
    <View style={{ width: size, height: size + 14, alignItems: 'center' }}>
      <Svg width={22} height={22} viewBox="0 0 22 22" style={{ zIndex: 2, marginBottom: -10 }}>
        <Path d="M2 2 H20 L11 20Z" fill={C.glow} stroke="#2A1A0A" strokeWidth={2} />
      </Svg>
      <Animated.View style={style}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Circle cx={100} cy={100} r={99} fill={C.deep} />
          {SECTORS.map((s, i) => (
            <G key={s.t}>
              <Path d={arc(i)} fill={s.c} stroke={C.glow} strokeWidth={1.5} />
              {i < 3 && <SvgText x={pt(SECTOR_CENTER[i], 66).x} y={pt(SECTOR_CENTER[i], 66).y + 6} fill={C.text} fontSize={20} fontWeight="bold" textAnchor="middle">{s.t}</SvgText>}
            </G>
          ))}
          <Circle cx={100} cy={100} r={14} fill="#2A1A0A" stroke={C.glow} strokeWidth={2} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Spark({ i, on }: { i: number; on: boolean }) {
  const o = useSharedValue(0);
  useEffect(() => {
    if (!on) { cancelAnimation(o); o.value = 0; return; }
    o.value = withDelay(i * 260, withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 900 })), -1));
    return () => cancelAnimation(o);
  }, [on, i, o]);
  const st = useAnimatedStyle(() => ({ opacity: on ? o.value : 0.35, transform: [{ scale: 0.6 + o.value * 0.6 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 6 + (i % 3) * 14, left: `${8 + i * 11}%`, width: 6, height: 6, borderRadius: 3, backgroundColor: C.glow }, st]} />;
}

function Sec({ title, sub, children, testID }: { title: string; sub?: string; children: React.ReactNode; testID?: string }) {
  return (
    <View style={s.sec} testID={testID}>
      <Text style={s.h2} accessibilityRole="header">{title}</Text>
      {!!sub && <Text style={s.dim}>{sub}</Text>}
      {children}
    </View>
  );
}
function Btn({ label, onPress, disabled, primary, testID }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.btn, primary ? s.btnP : s.btnG, disabled && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.97 }] }]}>
      <Text style={[s.btnT, primary && { color: '#2A1A0A' }]} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

export function RewardHub(p: RewardHubProps) {
  const { profile: pr, now, adStatus, pendingReward } = p;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= 700, land = width > height;
  const busy = adStatus === 'loading' || adStatus === 'ready' || adStatus === 'showing';
  const [bannerHeight, setBannerHeight] = useState<number>(BANNER_AD_RESERVED_HEIGHT);
  const bannerSpace = Platform.OS === 'web' ? 0 : bannerHeight;
  const locked = !p.ready || !!p.storageError || busy;
  // Owned inventory and free-credit wagers work without an available ad SDK.
  const spendOff = locked;
  const [confirm, setConfirm] = useState(false);
  const [still, setStill] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {});
    const a = AccessibilityInfo.addEventListener('reduceMotionChanged', setStill);
    const b = AppState.addEventListener('change', st => setActive(st === 'active'));
    return () => { a.remove(); b.remove(); };
  }, []);
  const animate = !still && active;

  const wheelSize = Math.min(220, Math.max(150, width - 120));
  const rot = useSharedValue(0);
  const seen = useRef<string | null>(pr.history[0]?.id ?? null);
  const [spinning, setSpinning] = useState(false);
  const top = pr.history[0];
  useEffect(() => {
    if (!top || top.id === seen.current) return;
    seen.current = top.id;
    if (top.kind !== 'wheel' || top.wheelIndex === undefined) return;
    const target = -SECTOR_CENTER[top.wheelIndex];
    const base = Math.ceil(rot.value / 360) * 360;
    if (!animate) { rot.value = base + target; return; }
    setSpinning(true);
    rot.value = withTiming(base + 360 * 4 + target, { duration: 2600, easing: Easing.out(Easing.cubic) }, fin => { if (fin) { /* settled */ } });
    const t = setTimeout(() => setSpinning(false), 2700);
    return () => clearTimeout(t);
  }, [top, animate, rot]);
  useEffect(() => () => cancelAnimation(rot), [rot]);
  useEffect(() => {
    if (!animate) { cancelAnimation(rot); setSpinning(false); }
  }, [animate, rot]);

  const day = dailyStatus(pr, now);
  const vaultMs = pr.vaultNextAt - now, vaultWait = vaultMs > 0;
  const infMs = pr.infiniteInkUntil - now;

  const adLabel = (a: HubRewardAction, idle: string) => {
    if (!p.supported) return 'Videos unavailable on web';
    if (pendingReward !== a) return p.adReady ? idle.replace('Load video', 'Watch video') : idle;
    if (adStatus === 'loading') return 'Loading video…';
    if (adStatus === 'showing') return 'Video playing…';
    if (adStatus === 'ready') return 'Watch video';
    if (adStatus === 'unavailable') return 'Retry loading video';
    return idle;
  };
  const adOff = (a: HubRewardAction, extra = false) => !p.ready || !!p.storageError || !p.supported || extra
    || adStatus === 'loading' || adStatus === 'showing' || (busy && pendingReward !== a);

  return (
    <View style={[s.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 + bannerSpace, paddingLeft: insets.left + 10, paddingRight: insets.right + 10 }]} testID="reward-hub">
      <View style={[s.card, { maxWidth: wide ? 920 : 560 }]}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Text style={s.title} accessibilityRole="header">Reward Vault</Text>
            <Text style={s.dim}>Free virtual rewards only. No purchases, no cash-out.</Text>
          </View>
          <View style={s.wallet} testID="hub-wallet"><Text style={s.walletT}>{pr.inkCredits} ink credits</Text></View>
          <Pressable testID="reward-hub-close" accessibilityRole="button" accessibilityLabel="Close" disabled={adStatus === 'showing'} onPress={p.onClose} style={[s.x, adStatus === 'showing' && { opacity: 0.35 }]}>
            <Text style={s.btnT}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 12, gap: 12, flexDirection: 'row', flexWrap: 'wrap' }} showsVerticalScrollIndicator={false}>
          {!!p.storageError && (
            <View style={[s.sec, s.full, { borderColor: C.warn }]}>
              <Text style={[s.dim, { color: C.warn }]} accessibilityLiveRegion="polite">{p.storageError}</Text>
              <Btn label="Retry save" onPress={p.onRetrySave} primary testID="retry-reward-save" />
            </View>
          )}
          {!p.ready && <Text style={[s.dim, s.full]}>Loading saved rewards…</Text>}
          {!!p.message && <Text style={[s.dim, s.full, { color: C.glow }]} accessibilityLiveRegion="polite" testID="reward-hub-message">{p.message}</Text>}
          {!p.supported && <Text style={[s.dim, s.full]}>Reward videos need the native iOS or Android app. This preview never simulates ad rewards; owned items and free-credit wagers still work.</Text>}

          <View style={[s.col, wide && s.half]}>
            <Sec title="Daily calendar" sub="Watching an optional video claims the day. Miss a day and the streak restarts at day 1; after day 7 it loops to day 1." testID="daily-calendar">
              <View style={s.days}>
                {DAILY_REWARDS.map((r, i) => {
                  const d = i + 1, done = day.claimedToday ? d <= day.displayedDay : d < day.day, cur = d === day.day && !day.claimedToday;
                  return (
                    <View key={d} style={[s.day, done && s.dayDone, cur && s.dayCur]} accessibilityLabel={`Day ${d}: ${r.label}, ${r.credits} ink credits${done ? ', claimed' : ''}`}>
                      <Text style={s.dayN}>{done ? '✓' : d}</Text>
                      <Text style={s.dayT} numberOfLines={2}>{r.label}</Text>
                      <Text style={s.dayC}>+{r.credits} ink</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={s.dim}>
                {day.claimedToday ? `Claimed. Next reward in ${formatCountdown(day.nextAt - now)}` : day.canClaim ? `Today: ${DAILY_REWARDS[day.day - 1].label} + ${DAILY_REWARDS[day.day - 1].credits} ink` : 'Not claimable yet; your clock looks earlier than your last claim.'}
              </Text>
              <Btn testID="daily-claim" primary label={day.claimedToday ? 'Claimed today' : adLabel('dailyBrush', 'Load video · claim day ' + day.day)}
                disabled={adOff('dailyBrush', !day.canClaim)} onPress={() => p.onWatch('dailyBrush')} />
              <Text style={s.dim}>Golden Brushes: {pr.goldenBrushes}</Text>
            </Sec>

            <Sec title="Mystery Vault" sub="Optional video opens one chest. One shared cooldown of 1 hour." testID="vault">
              <Text style={s.dim} testID="vault-countdown">{vaultWait ? `Next chest in ${formatCountdown(vaultMs)}` : 'A chest is ready'}</Text>
              <View style={s.chests}>
                {(['bronze', 'silver', 'gold'] as VaultTier[]).map(t => {
                  const o = VAULT_ODDS[t], a = TIER_ACTION[t];
                  return (
                    <View key={t} style={s.chest}>
                      <View>
                        <ChestIcon tier={t} />
                        <Spark i={t === 'bronze' ? 0 : t === 'silver' ? 3 : 6} on={animate && !vaultWait} />
                      </View>
                      <Text style={s.h3}>{CHEST[t].name}</Text>
                      <Text style={s.odds}>{o.infinite}% infinite ink{'\n'}{o.skip}% level skip{'\n'}{o.skin}% skin</Text>
                      <Btn testID={`vault-${t}`} label={vaultWait ? 'Cooling down' : adLabel(a, 'Load video')} primary
                        disabled={adOff(a, vaultWait)} onPress={() => p.onWatch(a)} />
                    </View>
                  );
                })}
              </View>
              <Text style={s.dim}>
                Prizes: 5 minutes of infinite line length (stroke and time limits still apply), an instant level skip, or one of 3 equally likely skins (Neon, Crystal, Lava). A duplicate skin pays 100 ink credits.
              </Text>
            </Sec>
          </View>

          <View style={[s.col, wide && s.half]}>
            <Sec title="Ink Rush wheel" sub="Odds: 0× 40%, 2× 40%, 5× 18%, jackpot 2%. Ink credits are free and virtual." testID="ink-rush-wheel">
              <View style={{ alignItems: 'center' }}><Wheel size={wheelSize} rotation={rot} /></View>
              <View style={s.legend}>
                {SECTORS.map((x, i) => <Text key={x.t} style={s.odds}>{x.t} · {x.d} · {WHEEL_ODDS[i]}%</Text>)}
              </View>
              <Text style={s.dim}>Wedge size matches the odds; the 2% jackpot is the thin gold sliver at the top-left of the pointer. Wager 20 ink credits: 2× pays 40, 5× pays 100, jackpot pays 500, 0× pays 0. Ad spin: no wager; a 0× result still grants 10 ink credits.</Text>
              {confirm ? (
                <View style={s.sec} accessibilityLiveRegion="polite">
                  <Text style={s.dim}>Confirm: stake 20 free virtual ink credits. 40% of spins pay 0, so you can lose the stake. No real money is involved.</Text>
                  <View style={s.row}>
                    <Btn label="Cancel" onPress={() => setConfirm(false)} />
                    <Btn testID="wheel-confirm" primary label="Confirm 20 ink wager" disabled={spendOff || spinning || pr.inkCredits < 20} onPress={() => { setConfirm(false); p.onWheelWager(); }} />
                  </View>
                </View>
              ) : (
                <Btn testID="wheel-wager" primary label="Wager 20 ink…" disabled={spendOff || spinning || pr.inkCredits < 20} onPress={() => setConfirm(true)} />
              )}
              <Btn testID="wheel-ad" label={adLabel('wheelAd', 'Load video · free spin')} disabled={adOff('wheelAd') || spinning} onPress={() => p.onWatch('wheelAd')} />
              {pr.inkCredits < 20 && <Text style={s.dim}>You need 20 ink credits to wager. The free ad spin is optional.</Text>}
            </Sec>

            <Sec title="Inventory" sub={infMs > 0 ? `Infinite ink active: ${formatCountdown(infMs)} left` : 'Items you own'}>
              <Text style={s.dim}>Golden Brushes {pr.goldenBrushes} · Ink refills {pr.inkRefills}</Text>
              <Text style={s.dim}>Level skips {pr.levelSkips} · Genesis skips {pr.genesisSkips} · Fast-passes {pr.genesisFastPasses}</Text>
              <View style={s.row}>
                <Btn label="Use brush" disabled={spendOff || !p.canUseBrush || pr.goldenBrushes < 1} onPress={p.onUseBrush} />
                <Btn testID="use-ink-refill" label="Use ink refill" disabled={spendOff || !p.canUseBrush || pr.inkRefills < 1} onPress={p.onUseRefill} />
              </View>
              <View style={s.row}>
                <Btn testID="use-level-skip" label="Level skip" disabled={spendOff || !p.canSkip || pr.levelSkips < 1} onPress={() => p.onSkip(false)} />
                <Btn testID="use-genesis-skip" label={p.inGenesis ? 'Genesis skip' : 'Genesis skip (opens Genesis)'} disabled={spendOff || (p.inGenesis && !p.canSkip) || pr.genesisSkips < 1} onPress={() => p.onSkip(true)} />
              </View>
              <Text style={s.dim}>Ink refill resets this attempt to full base ink; the Golden Brush retries with +50% ink. Both need a level with drawable ink. A skip opens the next stage only: no stars, score or completed status. A fast-pass instead lets you try one locked Genesis challenge without changing unlocks.</Text>
              <View style={s.row}>
                <Btn label={adLabel('fastPass', 'Load video · fast-pass')} disabled={adOff('fastPass')} onPress={() => p.onWatch('fastPass')} />
                <Btn label="Use fast-pass" disabled={spendOff || pr.genesisFastPasses < 1} onPress={p.onUseFastPass} />
              </View>
            </Sec>

            <Sec title="Skins" sub="Vault skins are cosmetic only.">
              <View style={s.row}>
                {SKINS.map(k => {
                  const own = pr.skins.includes(k.id), eq = pr.equippedSkin === k.id;
                  return (
                    <Pressable key={k.id} testID={`skin-${k.id}`} accessibilityRole="button" accessibilityLabel={`${k.name}, ${eq ? 'equipped' : own ? 'owned' : 'locked'}`}
                      disabled={!own || eq || locked} onPress={() => p.onEquipSkin(k.id)} style={[s.skin, eq && { borderColor: C.glow }, !own && { opacity: 0.45 }]}>
                      <View style={[s.dot, { backgroundColor: k.color, borderColor: k.shine }]} />
                      <Text style={s.odds} numberOfLines={1}>{k.name}</Text>
                      <Text style={[s.odds, { color: eq ? C.ok : C.dim }]}>{eq ? 'Equipped' : own ? 'Equip' : 'Locked'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Sec>

            <Sec title="Recent rewards" testID="reward-history">
              {pr.history.length === 0 && <Text style={s.dim}>Nothing yet. Rewards appear here.</Text>}
              {pr.history.slice(0, 5).map(h => <Text key={h.id} style={s.odds}>• {h.label}</Text>)}
            </Sec>
          </View>
          {land && <View style={{ height: 4 }} />}
        </ScrollView>
      </View>
      {Platform.OS !== 'web' && <View pointerEvents="box-none" style={{ position: 'absolute', bottom: insets.bottom + 4, left: insets.left, right: insets.right, alignItems: 'center' }}>
        <BannerAdComponent onHeightChange={setBannerHeight} />
      </View>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10,6,3,0.92)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  card: { flex: 1, width: '100%', backgroundColor: C.bg, borderRadius: 20, borderWidth: 2, borderColor: C.gold, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: C.deep, flexWrap: 'wrap' },
  title: { color: C.glow, fontSize: 22, fontWeight: '800' },
  wallet: { borderWidth: 1, borderColor: C.gold, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.panel2 },
  walletT: { color: C.glow, fontWeight: '700', fontSize: 13 },
  x: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%' },
  col: { width: '100%', gap: 12 },
  half: { width: '48.5%' },
  sec: { backgroundColor: C.panel, borderColor: C.deep, borderWidth: 1.5, borderRadius: 16, padding: 12, gap: 8 },
  h2: { color: C.gold, fontSize: 17, fontWeight: '800' },
  h3: { color: C.text, fontSize: 14, fontWeight: '800' },
  dim: { color: C.dim, fontSize: 12.5, lineHeight: 18 },
  odds: { color: C.text, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  day: { flexGrow: 1, flexBasis: 70, minHeight: 74, borderRadius: 10, borderWidth: 1, borderColor: C.deep, backgroundColor: C.panel2, padding: 6, alignItems: 'center' },
  dayDone: { borderColor: C.ok, opacity: 0.8 }, dayCur: { borderColor: C.glow, borderWidth: 2 },
  dayN: { color: C.glow, fontWeight: '800', fontSize: 15 }, dayT: { color: C.text, fontSize: 10.5, textAlign: 'center' }, dayC: { color: C.gold, fontSize: 11, fontWeight: '700' },
  chests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chest: { flexGrow: 1, flexBasis: 135, alignItems: 'center', gap: 4, backgroundColor: C.panel2, borderRadius: 12, borderWidth: 1, borderColor: C.gold, padding: 8 },
  legend: { alignItems: 'center', gap: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { flexGrow: 1, flexBasis: 130, minHeight: 44, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.gold },
  btnP: { backgroundColor: C.gold }, btnG: { backgroundColor: C.panel2 },
  btnT: { color: C.glow, fontWeight: '800', fontSize: 13, textAlign: 'center' },
  skin: { flexGrow: 1, flexBasis: 70, alignItems: 'center', gap: 3, padding: 8, borderRadius: 12, borderWidth: 1.5, borderColor: C.deep, backgroundColor: C.panel2 },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 3 },
});
