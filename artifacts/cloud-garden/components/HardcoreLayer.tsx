import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F, P, R, VD } from '@/constants/theme';
import { PressScale } from '@/components/GameUi';
import { useSafeInsets } from '@/components/layout';
import { BannerAdComponent, BANNER_AD_RESERVED_HEIGHT } from '@/components/BannerAdComponent';
import { HARDCORE_LEVELS } from '@/lib/hardcoreLevels';

export type Mode = 'classic' | 'hardcore' | 'genesis' | 'void';

// Hot signal red reserved for Hardcore: lasers, timer pressure, failure.
export const HOT = '#FF2A3D';

export function ModeSwitch({ themed, mode, onChange, tight }: { themed?: boolean; mode: Mode; onChange: (m: Mode) => void; tight?: boolean }) {
  const opt = (m: Mode, label: string, icon: keyof typeof Ionicons.glyphMap) => {
    const on = mode === m;
    return (
      <PressScale
        key={m}
        onPress={() => onChange(m)}
        testID={`mode-${m}`}
        label={m === 'classic' ? 'Campaign Mode, Levels 1 to 100'
          : m === 'genesis' ? 'The Genesis Gauntlet, 45 Masterclass challenges'
          : m === 'void' ? 'Hardcore: The Void Protocol' : `Hardcore mode, ${HARDCORE_LEVELS.length} timed levels`}
        selected={on}
        containerStyle={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
        style={[styles.seg, tight && { gap: 3, paddingHorizontal: 3 }, on && (m === 'classic' ? styles.segClassic : m === 'genesis' ? styles.segGen : m === 'void' ? styles.segVoid : styles.segHard)]}
      >
        <Ionicons name={icon} size={tight ? 13 : 16} color={on ? P.white : themed ? VD.textSoft : P.ink} />
        <Text numberOfLines={1} style={[styles.segText, themed && { color: VD.textSoft }, on && { color: P.white }, tight && { fontSize: 10 }]}>{label}</Text>
      </PressScale>
    );
  };
  return (
    <View style={[styles.switchRow, themed && { backgroundColor: VD.panel, borderColor: VD.purple }]} testID="region-mode" accessibilityRole="tablist">
      {opt('classic', tight ? 'Camp' : 'Campaign', 'leaf')}
      {opt('hardcore', tight ? 'Hard' : 'Hardcore', 'flame')}
      {opt('genesis', tight ? 'Genesis' : 'Genesis Gauntlet', 'planet')}
      {opt('void', tight ? 'Void' : 'The Void Protocol', 'skull')}
    </View>
  );
}

const fmt = (s: number) => `${Math.max(0, s).toFixed(1)}s`;

export function HardcoreHud({ themed, started, timeLeft, limit, elapsed, gold, par, moves, maxMoves, gravity, nextFlip }: { themed?: boolean; nextFlip?: number; started: boolean; timeLeft: number; limit: number; elapsed: number; gold: number; par: number; moves: number; maxMoves: number; gravity: number }) {
  const left = started && Number.isFinite(timeLeft) ? timeLeft : limit;
  const pct = limit > 0 ? Math.max(0, Math.min(1, left / limit)) : 0;
  const urgent = started && left <= Math.min(5, limit * 0.25);
  const goldOk = elapsed <= gold && moves <= par;
  const movesLeft = Math.max(0, maxMoves - moves);
  return (
    <View style={[styles.hud, themed && { marginBottom: 0 }]} testID="region-hardcore-hud">
      <View style={styles.hudRow}>
        <View style={[styles.chip, themed && styles.vChip, urgent && { backgroundColor: HOT }]} testID="hc-timer" accessibilityLabel={`${left.toFixed(1)} seconds remaining of ${limit}${gravity > 0 ? `, gravity reversed for ${gravity.toFixed(1)} seconds` : ''}`} accessibilityLiveRegion="none">
          <Ionicons name={gravity > 0 ? 'arrow-up' : 'timer'} size={16} color={urgent ? P.white : P.ink} />
          <Text style={[styles.chipText, themed && { color: VD.text }, urgent && { color: P.white }]}>{started ? fmt(left) : `${limit}s`}</Text>
        </View>
        <View style={[styles.chip, themed && styles.vChip, movesLeft === 0 && { backgroundColor: themed ? VD.redDeep : P.coral }]} testID="hc-moves" accessibilityLabel={`${moves} of ${maxMoves} moves used`}>
          <Ionicons name="hand-left" size={15} color={P.ink} />
          <Text style={[styles.chipText, themed && { color: VD.text }]}>{moves}/{maxMoves}</Text>
        </View>
        <View style={[styles.chip, themed && styles.vChip, { backgroundColor: goldOk ? (themed ? VD.panelHi : P.marigold) : themed ? VD.panel : P.paperDeep, opacity: goldOk ? 1 : 0.7 }]} testID="hc-gold" accessibilityLabel={`Gold goal, finish within ${gold} seconds using at most ${par} moves${goldOk ? '' : ', missed'}`}>
          <Ionicons name="star" size={15} color={P.ink} />
          <Text style={[styles.chipText, themed && { color: VD.text }]}>{goldOk ? `${gold}s · ${par} ${par === 1 ? 'move' : 'moves'}` : 'Gold missed'}</Text>
        </View>
          {nextFlip !== undefined && gravity <= 0 && (
            <View style={[styles.chip, { backgroundColor: P.petal }]} testID="hc-cycle" accessibilityLabel={`Gravity flips in ${nextFlip.toFixed(1)} seconds`}>
              <Ionicons name="swap-vertical" size={15} color={P.ink} />
              <Text style={[styles.chipText, themed && { color: VD.text }]}>FLIP {fmt(nextFlip)}</Text>
            </View>
          )}
          <View style={[styles.gravityCue, { opacity: gravity > 0 ? 1 : 0 }]} testID="hc-gravity" accessible={gravity > 0} accessibilityElementsHidden={gravity <= 0} accessibilityLabel={`Gravity inverted for ${gravity.toFixed(1)} seconds`}>
            <Ionicons name="arrow-up" size={15} color={P.ink} />
            <Text style={[styles.chipText, themed && { color: VD.text }]}>{fmt(gravity)}</Text>
          </View>
      </View>
      <View style={[styles.bar, themed && { backgroundColor: VD.bgDeep, borderColor: VD.line }]}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: urgent ? HOT : themed ? VD.purple : P.mint }]} />
      </View>
    </View>
  );
}

export function HardcoreFail({ themed, reason, onRetry, title = 'Wilted', rewardedRetry }: {
  themed?: boolean;
  reason: string;
  onRetry: () => void;
  title?: string;
  rewardedRetry?: {
    status: 'idle' | 'loading' | 'ready' | 'showing' | 'unavailable';
    supported: boolean;
    message?: string;
    onPress: () => void;
  };
}) {
  const insets = useSafeInsets();
  const showBanner = Platform.OS !== 'web';
  const [loadedBannerHeight, setLoadedBannerHeight] = useState<number | null>(null);
  const bannerHeight = showBanner ? loadedBannerHeight ?? BANNER_AD_RESERVED_HEIGHT : 0;
  return (
    <View style={[styles.failWrap, showBanner && { paddingBottom: 16 + bannerHeight }]} pointerEvents="box-none" testID="hc-fail">
      <View style={[styles.fail, themed && { backgroundColor: VD.bg, borderColor: VD.red, shadowColor: VD.red }]} accessibilityLiveRegion="assertive">
        <Text style={[styles.failKicker, themed && { color: VD.red }]}>{title}</Text>
        <Text style={[styles.failText, themed && { color: VD.textSoft }]} numberOfLines={2}>{reason || 'Try again, faster.'}</Text>
        {rewardedRetry?.supported && (
          <>
            <Text style={[styles.failText, { textAlign: 'center' }]}>Watch a quick video to get +50% Extra Ink &amp; Retry instantly!</Text>
            <PressScale
              onPress={rewardedRetry.onPress}
              disabled={rewardedRetry.status === 'loading' || rewardedRetry.status === 'showing'}
              testID="rewarded-retry"
              label="Watch a rewarded video for fifty percent extra ink and retry"
              style={[styles.failBtn, themed && { backgroundColor: VD.purpleDeep, borderColor: VD.purple }]}
            >
              <Ionicons name="play-circle" size={18} color={P.ink} />
              <Text style={styles.failBtnText}>
                {rewardedRetry.status === 'loading' ? 'Loading video…'
                  : rewardedRetry.status === 'showing' ? 'Video playing…'
                    : rewardedRetry.status === 'ready' ? 'Watch · +50% ink'
                      : rewardedRetry.status === 'unavailable' ? 'Try video again'
                        : 'Load rewarded video'}
              </Text>
            </PressScale>
            {!!rewardedRetry.message && (
              <Text style={[styles.failText, { textAlign: 'center' }]} testID="rewarded-retry-status">
                {rewardedRetry.message}
              </Text>
            )}
          </>
        )}
        <PressScale onPress={onRetry} testID="retry" label="Retry now" style={[styles.failBtn, themed && { backgroundColor: VD.redDeep, borderColor: VD.red }]}>
          <Ionicons name="refresh" size={18} color={P.ink} />
          <Text style={styles.failBtnText}>Retry now</Text>
        </PressScale>
      </View>
      {showBanner && (
        <View style={[styles.bannerDock, { bottom: insets.bottom + 4 }]} pointerEvents="box-none">
          <BannerAdComponent onHeightChange={setLoadedBannerHeight} />
        </View>
      )}
    </View>
  );
}

const lift = { shadowColor: P.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 } as const;
export function VoidHud({ deaths, badge, mods, timer }: { deaths: number; badge?: string; mods: string[]; timer: React.ReactNode }) {
  return (
    <View style={styles.voidHud} testID="region-void-hud">
      {timer}
      <View style={styles.hudRow}>
        <View style={styles.vChip} testID="void-deaths" accessibilityLabel={`${deaths} deaths on this level`}>
          <Ionicons name="skull" size={14} color={VD.red} />
          <Text style={styles.vChipText}>Deaths {deaths}</Text>
        </View>
        <View style={[styles.vChip, badge === 'Gold' && { borderColor: VD.gold }]} testID="void-badge" accessibilityLabel={`Badge: ${badge ?? 'none yet'}`}>
          <Ionicons name="ribbon" size={14} color={badge === 'Gold' ? VD.gold : VD.purple} />
          <Text style={[styles.vChipText, badge === 'Gold' && { color: VD.gold }]}>{badge ?? 'No badge'}</Text>
        </View>
        {mods.map((m) => <View key={m} style={styles.vChip}><Text style={styles.vChipText}>{m}</Text></View>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segVoid: { backgroundColor: VD.redDeep, borderWidth: 1, borderColor: VD.red },
  voidHud: { gap: 6, marginBottom: 6 },
  vChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: VD.panel, borderWidth: 1.5, borderColor: VD.line, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, minHeight: 28 },
  vChipText: { fontFamily: F.bold, fontSize: 12, color: VD.text },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 3, backgroundColor: P.paperDeep, borderWidth: 3, borderColor: P.ink, borderRadius: R.btn, marginTop: 8 },
  seg: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 6 },
  segClassic: { backgroundColor: P.drop },
  segGen: { backgroundColor: P.dropDeep },
  segHard: { backgroundColor: P.coralDeep },
  segText: { fontFamily: F.bold, fontSize: 14, color: P.ink },
  hud: { marginBottom: 8, gap: 6, position: 'relative' },
  gravityCue: { position: 'absolute', right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 2, borderColor: P.ink, borderRadius: 6, paddingHorizontal: 4, backgroundColor: P.petal },
  hudRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: P.white, borderWidth: 3, borderColor: P.ink, borderRadius: R.btn, paddingHorizontal: 8, paddingVertical: 3, minHeight: 32 },
  chipText: { fontFamily: F.bold, fontSize: 13, color: P.ink },
  bar: { height: 8, borderRadius: 4, backgroundColor: P.paperDeep, borderWidth: 2, borderColor: P.ink, overflow: 'hidden' },
  barFill: { height: '100%' },
  failWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 40, padding: 16 },
  bannerDock: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 41 },
  fail: { maxWidth: 320, width: '100%', alignItems: 'center', gap: 6, backgroundColor: P.paper, borderWidth: 4, borderColor: P.ink, borderRadius: R.card, padding: 14, ...lift, shadowColor: HOT },
  failKicker: { fontFamily: F.bold, fontSize: 24, color: P.coralDeep, textTransform: 'uppercase' },
  failText: { fontFamily: F.semi, fontSize: 14, color: P.inkSoft, textAlign: 'center' },
  failBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, backgroundColor: P.marigold, borderWidth: 3, borderColor: P.ink, borderRadius: R.btn },
  failBtnText: { fontFamily: F.bold, fontSize: 16, color: P.ink },
});
