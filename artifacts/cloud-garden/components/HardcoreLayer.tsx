import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F, P, R } from '@/constants/theme';
import { PressScale } from '@/components/GameUi';

export type Mode = 'classic' | 'hardcore' | 'genesis';

// Hot signal red reserved for Hardcore: lasers, timer pressure, failure.
export const HOT = '#FF2A3D';

export function ModeSwitch({ mode, onChange, tight }: { mode: Mode; onChange: (m: Mode) => void; tight?: boolean }) {
  const opt = (m: Mode, label: string, icon: keyof typeof Ionicons.glyphMap) => {
    const on = mode === m;
    return (
      <PressScale
        key={m}
        onPress={() => onChange(m)}
        testID={`mode-${m}`}
        label={m === 'classic' ? 'Campaign Mode, Levels 1 to 100'
          : m === 'genesis' ? 'The Genesis Gauntlet, 45 Masterclass challenges' : 'Hardcore mode, 45 timed levels'}
        selected={on}
        containerStyle={{ flexGrow: 1, flexBasis: 90, minWidth: 0 }}
        style={[styles.seg, on && (m === 'classic' ? styles.segClassic : m === 'genesis' ? styles.segGen : styles.segHard)]}
      >
        <Ionicons name={icon} size={16} color={on ? P.white : P.ink} />
        <Text numberOfLines={1} style={[styles.segText, on && { color: P.white }, tight && { fontSize: 12 }]}>{label}</Text>
      </PressScale>
    );
  };
  return (
    <View style={styles.switchRow} testID="region-mode" accessibilityRole="tablist">
      {opt('classic', tight ? 'Campaign 100' : 'Campaign', 'leaf')}
      {opt('hardcore', tight ? 'Hardcore 45' : 'Hardcore', 'flame')}
      {opt('genesis', tight ? 'Genesis 45' : 'Genesis Gauntlet', 'planet')}
    </View>
  );
}

const fmt = (s: number) => `${Math.max(0, s).toFixed(1)}s`;

export function HardcoreHud({ started, timeLeft, limit, elapsed, gold, par, moves, maxMoves, gravity, nextFlip }: { nextFlip?: number; started: boolean; timeLeft: number; limit: number; elapsed: number; gold: number; par: number; moves: number; maxMoves: number; gravity: number }) {
  const left = started && Number.isFinite(timeLeft) ? timeLeft : limit;
  const pct = limit > 0 ? Math.max(0, Math.min(1, left / limit)) : 0;
  const urgent = started && left <= Math.min(5, limit * 0.25);
  const goldOk = elapsed <= gold && moves <= par;
  const movesLeft = Math.max(0, maxMoves - moves);
  return (
    <View style={styles.hud} testID="region-hardcore-hud">
      <View style={styles.hudRow}>
        <View style={[styles.chip, urgent && { backgroundColor: HOT }]} testID="hc-timer" accessibilityLabel={`${left.toFixed(1)} seconds remaining of ${limit}${gravity > 0 ? `, gravity reversed for ${gravity.toFixed(1)} seconds` : ''}`} accessibilityLiveRegion="none">
          <Ionicons name={gravity > 0 ? 'arrow-up' : 'timer'} size={16} color={urgent ? P.white : P.ink} />
          <Text style={[styles.chipText, urgent && { color: P.white }]}>{started ? fmt(left) : `${limit}s`}</Text>
        </View>
        <View style={[styles.chip, movesLeft === 0 && { backgroundColor: P.coral }]} testID="hc-moves" accessibilityLabel={`${moves} of ${maxMoves} moves used`}>
          <Ionicons name="hand-left" size={15} color={P.ink} />
          <Text style={styles.chipText}>{moves}/{maxMoves}</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: goldOk ? P.marigold : P.paperDeep, opacity: goldOk ? 1 : 0.7 }]} testID="hc-gold" accessibilityLabel={`Gold goal, finish within ${gold} seconds using at most ${par} moves${goldOk ? '' : ', missed'}`}>
          <Ionicons name="star" size={15} color={P.ink} />
          <Text style={styles.chipText}>{goldOk ? `${gold}s · ${par} ${par === 1 ? 'move' : 'moves'}` : 'Gold missed'}</Text>
        </View>
          {nextFlip !== undefined && gravity <= 0 && (
            <View style={[styles.chip, { backgroundColor: P.petal }]} testID="hc-cycle" accessibilityLabel={`Gravity flips in ${nextFlip.toFixed(1)} seconds`}>
              <Ionicons name="swap-vertical" size={15} color={P.ink} />
              <Text style={styles.chipText}>FLIP {fmt(nextFlip)}</Text>
            </View>
          )}
          <View style={[styles.gravityCue, { opacity: gravity > 0 ? 1 : 0 }]} testID="hc-gravity" accessible={gravity > 0} accessibilityElementsHidden={gravity <= 0} accessibilityLabel={`Gravity inverted for ${gravity.toFixed(1)} seconds`}>
            <Ionicons name="arrow-up" size={15} color={P.ink} />
            <Text style={styles.chipText}>{fmt(gravity)}</Text>
          </View>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: urgent ? HOT : P.mint }]} />
      </View>
    </View>
  );
}

export function HardcoreFail({ reason, onRetry, title = 'Wilted' }: { reason: string; onRetry: () => void; title?: string }) {
  return (
    <View style={styles.failWrap} pointerEvents="box-none" testID="hc-fail">
      <View style={styles.fail} accessibilityLiveRegion="assertive">
        <Text style={styles.failKicker}>{title}</Text>
        <Text style={styles.failText} numberOfLines={2}>{reason || 'Try again, faster.'}</Text>
        <PressScale onPress={onRetry} testID="retry" label="Retry now" style={styles.failBtn}>
          <Ionicons name="refresh" size={18} color={P.ink} />
          <Text style={styles.failBtnText}>Retry now</Text>
        </PressScale>
      </View>
    </View>
  );
}

const lift = { shadowColor: P.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 } as const;
const styles = StyleSheet.create({
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
  fail: { maxWidth: 320, width: '100%', alignItems: 'center', gap: 6, backgroundColor: P.paper, borderWidth: 4, borderColor: P.ink, borderRadius: R.card, padding: 14, ...lift, shadowColor: HOT },
  failKicker: { fontFamily: F.bold, fontSize: 24, color: P.coralDeep, textTransform: 'uppercase' },
  failText: { fontFamily: F.semi, fontSize: 14, color: P.inkSoft, textAlign: 'center' },
  failBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, backgroundColor: P.marigold, borderWidth: 3, borderColor: P.ink, borderRadius: R.btn },
  failBtnText: { fontFamily: F.bold, fontSize: 16, color: P.ink },
});
