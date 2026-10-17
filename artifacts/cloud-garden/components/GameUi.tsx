import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Linking, Platform, Pressable, ScrollView, ScrollViewProps, StyleProp, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F, GN, P, R, REWARD_GOLD, SG, VD } from '@/constants/theme';
import { useSafeInsets } from '@/components/layout';
import { BannerAdComponent, BANNER_AD_RESERVED_HEIGHT } from '@/components/BannerAdComponent';
import { Level } from '@/lib/levels';
import { haptic } from '@/lib/haptics';
import { levelGrid, levelScrollOffset } from '@/lib/levelGrid';
import appConfig from '../app.json';

// Keep displayed credits and contact details aligned with release metadata.
const { developerName, supportEmail } = appConfig.expo.extra;

type UiTone = 'campaign' | 'genesis' | 'hardcore' | 'void' | 'singularity' | 'reward';

export function PressScale({
  children,
  onPress,
  style,
  containerStyle,
  disabled,
  testID,
  label,
  role = 'button',
  selected,
}: {
  children: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  testID?: string;
  label?: string;
  role?: 'button' | 'switch';
  selected?: boolean;
}) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  return (
    <Pressable
      style={containerStyle}
      testID={testID}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected, checked: role === 'switch' ? selected : undefined }}
      disabled={disabled}
      onPressIn={() => to(0.9)}
      onPressOut={() => to(1)}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
    >
      <Animated.View style={[style, { transform: [{ scale: s }], opacity: disabled ? 0.55 : 1 }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Stars({ count, size = 30, pop = false }: { count: number; size?: number; pop?: boolean }) {
  const vals = useRef([0, 1, 2].map(() => new Animated.Value(pop ? 0 : 1))).current;
  useEffect(() => {
    if (!pop) return;
    Animated.stagger(
      160,
      vals.map((v) => Animated.spring(v, { toValue: 1, useNativeDriver: true, bounciness: 14, speed: 10 })),
    ).start();
  }, [pop, vals]);
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {vals.map((v, i) => (
        <Animated.View key={i} style={{ transform: [{ scale: v }, { rotate: i === 1 ? '0deg' : i === 0 ? '-10deg' : '10deg' }] }}>
          <Ionicons name={i < count ? 'star' : 'star-outline'} size={size} color={i < count ? P.marigold : P.inkSoft} style={styles.starShadow} />
        </Animated.View>
      ))}
    </View>
  );
}

export function Card({ children, onClose, title, scrollID, expanded = false, scrollRef, onScrollLayout, onContentSizeChange, footer, dark, tone, showBanner = false }: {
  dark?: boolean;
  tone?: UiTone;
  showBanner?: boolean;
  children: ReactNode;
  onClose?: () => void;
  title?: string;
  scrollID?: string;
  expanded?: boolean;
  scrollRef?: React.Ref<ScrollView>;
  onScrollLayout?: ScrollViewProps['onLayout'];
  onContentSizeChange?: ScrollViewProps['onContentSizeChange'];
  footer?: ReactNode;
}) {
  const a = useRef(new Animated.Value(0)).current;
  const { height } = useWindowDimensions();
  const ins = useSafeInsets();
  const [loadedBannerHeight, setLoadedBannerHeight] = useState<number | null>(null);
  useEffect(() => {
    Animated.spring(a, { toValue: 1, useNativeDriver: true, bounciness: 10, speed: 12 }).start();
  }, [a]);
  const pad = expanded ? 8 : 14;
  const bannerHeight = showBanner ? loadedBannerHeight ?? BANNER_AD_RESERVED_HEIGHT : 0;
  const availableHeight = Math.max(0, height - ins.top - ins.bottom - pad * 2 - bannerHeight);
  const short = expanded && availableHeight < 400;
  const toneStyle = tone === 'void' ? styles.cardDark
    : tone === 'singularity' ? styles.cardSingularity
      : tone === 'genesis' ? styles.cardGenesis
        : tone === 'reward' ? styles.cardReward : undefined;
  const toneScrim = tone === 'void' ? { backgroundColor: 'rgba(5,3,10,0.82)' }
    : tone === 'singularity' ? { backgroundColor: 'rgba(3,9,18,0.82)' }
      : tone === 'genesis' ? { backgroundColor: 'rgba(30,17,5,0.72)' }
        : tone === 'reward' ? { backgroundColor: 'rgba(18,12,4,0.78)' } : undefined;
  const toneTitle = tone === 'void' ? { color: VD.text }
    : tone === 'singularity' ? { color: SG.cyan }
      : tone === 'genesis' ? { color: GN.gold }
        : tone === 'reward' ? { color: REWARD_GOLD.gold } : undefined;
  return (
    <Animated.View style={[styles.scrim, dark && { backgroundColor: 'rgba(5,3,10,0.82)' }, toneScrim, { opacity: a, paddingTop: ins.top + pad, paddingBottom: ins.bottom + pad + bannerHeight, paddingLeft: ins.left + pad, paddingRight: ins.right + pad }]}>
      <Animated.View style={[styles.card, dark && styles.cardDark, toneStyle, expanded && { maxWidth: 840, height: availableHeight }, short && { padding: 12 }, { maxHeight: availableHeight, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]} accessibilityViewIsModal>
        {title !== undefined && (
          <View style={[styles.cardHead, short && { marginBottom: 8 }]}>
            <Text style={[styles.cardTitle, dark && { color: VD.text }, toneTitle, short && { fontSize: 22 }]} numberOfLines={1}>{title}</Text>
            {onClose && (
              <PressScale onPress={onClose} testID="close-sheet" label="Close" style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={P.white} />
              </PressScale>
            )}
          </View>
        )}
        <ScrollView ref={scrollRef} onLayout={onScrollLayout} onContentSizeChange={onContentSizeChange} style={[styles.body, expanded && { flex: 1, minHeight: 0 }]} testID={scrollID} showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: expanded ? 8 : 4 }} alwaysBounceHorizontal={false}>
          {children}
        </ScrollView>
        {footer}
      </Animated.View>
      {showBanner && (
        <View style={[styles.bannerDock, { bottom: ins.bottom + 4 }]} pointerEvents="box-none">
          <BannerAdComponent onHeightChange={setLoadedBannerHeight} />
        </View>
      )}
    </Animated.View>
  );
}

export function Btn({ dark, tone, label, icon, onPress, kind = 'primary', testID, disabled }: { dark?: boolean; tone?: UiTone; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; kind?: 'primary' | 'ghost'; testID?: string; disabled?: boolean }) {
  const darkMode = dark || tone === 'void' || tone === 'singularity' || tone === 'reward';
  const toneBtn = tone === 'void' ? (kind === 'primary' ? styles.btnVoid : styles.btnVoidGhost)
    : tone === 'singularity' ? (kind === 'primary' ? styles.btnSing : styles.btnSingGhost)
      : tone === 'genesis' ? (kind === 'primary' ? styles.btnGenesis : styles.btnGenesisGhost)
        : tone === 'reward' ? (kind === 'primary' ? styles.btnReward : styles.btnRewardGhost) : undefined;
  const iconColor = darkMode ? tone === 'singularity' ? SG.cyan : tone === 'reward' ? REWARD_GOLD.gold : VD.text
    : kind === 'primary' ? P.white : P.ink;
  const textColor = darkMode ? tone === 'singularity' ? SG.text : tone === 'reward' ? REWARD_GOLD.text : VD.text
    : kind === 'primary' ? P.white : P.ink;
  return (
    <PressScale disabled={disabled} onPress={onPress} testID={testID} label={label} containerStyle={styles.btnSlot} style={[styles.btn, kind === 'primary' ? styles.btnPrimary : styles.btnGhost, dark && tone === 'void' && (kind === 'primary' ? styles.btnVoid : styles.btnVoidGhost), toneBtn]}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text numberOfLines={1} style={[styles.btnText, { color: textColor }]}>{label}</Text>
    </PressScale>
  );
}

export function WinCard({ dark, tone, badge, deaths, masterclass, trial, score, highScore, bestTime, level, stars, elapsed, hasNext, onNext, onReplay, onLevels }: { dark?: boolean; tone?: UiTone; badge?: string; deaths?: number; masterclass?: boolean; trial?: boolean; score?: number; highScore?: number; bestTime?: number; level: Level; stars: number; elapsed?: number; hasNext: boolean; onNext: () => void; onReplay: () => void; onLevels: () => void }) {
  const subColor = tone === 'singularity' ? SG.textSoft : tone === 'genesis' ? GN.textSoft : dark ? VD.textSoft : P.inkSoft;
  return (
    <Card dark={dark} tone={tone} showBanner={Platform.OS !== 'web'}>
      <Text style={[styles.kicker, dark && { color: VD.red }, tone === 'singularity' && { color: SG.cyan }, tone === 'genesis' && { color: GN.gold }]}>{level.name}</Text>
      <Text style={[styles.big, dark && { color: VD.purple, textShadowColor: VD.red }, tone === 'singularity' && { color: SG.cyan, textShadowColor: SG.gold }, tone === 'genesis' && { color: GN.gold, textShadowColor: GN.orange }]}>{trial ? 'Fast-pass trial cleared' : dark ? 'Protocol cleared' : masterclass ? 'Masterclass complete' : tone === 'singularity' ? 'Paradox solved' : 'It bloomed!'}</Text>
      <Text style={[styles.brand, tone === 'singularity' && { color: SG.textSoft }, tone === 'genesis' && { color: GN.textSoft } ]}>Slice & Bloom</Text>
      <View style={{ marginVertical: 14 }}>
        <Stars count={stars} size={44} pop />
      </View>
      <Text style={[styles.sub, { color: subColor }]}>{trial ? 'This preview does not change permanent unlock progress.'
        : level.hardcore
        ? `${(elapsed ?? 0).toFixed(1)}s · ${stars === 3 ? 'Gold earned!' : `Gold needs ${level.hardcore.goldTime}s or less and at most ${level.par} ${level.par === 1 ? 'move' : 'moves'}.`}`
        : stars === 3 ? 'Perfect watering.' : stars === 2 ? 'Nicely done. Fewer moves earn a third star.' : 'Bloomed. Try fewer moves for more stars.'}</Text>
      {dark && (
        <Text style={[styles.sub, { marginTop: 6, fontFamily: F.bold, color: badge === 'Gold' ? VD.gold : VD.text }]} testID="win-badge">
          Badge: {badge ?? 'Cleared'}{deaths !== undefined ? ` · ${deaths} ${deaths === 1 ? 'death' : 'deaths'} on this level` : ''}
        </Text>
      )}
      {level.hardcore && score !== undefined && (
        <Text style={[styles.sub, { marginTop: 6, fontFamily: F.bold, color: tone === 'singularity' ? SG.cyan : tone === 'genesis' ? GN.gold : dark ? VD.text : P.ink }]} testID="win-score">
          Score {score}{highScore !== undefined ? ` · Best ${highScore}` : ''}{bestTime !== undefined ? ` · Best time ${bestTime.toFixed(1)}s` : ''}
        </Text>
      )}
      <View style={styles.row}>
        {hasNext ? <Btn dark={dark} tone={tone} label="Next" icon="arrow-forward" onPress={onNext} testID="next-level" /> : <Btn dark={dark} tone={tone} label="All grown" icon="grid" onPress={onLevels} testID="all-levels" />}
      </View>
      <View style={styles.row}>
        <Btn dark={dark} tone={tone} label="Replay" icon="refresh" kind="ghost" onPress={onReplay} testID="replay" />
        <Btn dark={dark} tone={tone} label="Levels" icon="grid" kind="ghost" onPress={onLevels} testID="win-levels" />
      </View>
    </Card>
  );
}

export function LoseCard({ reason, tone = 'campaign', onRetry, onHint, onLevels, rewardedRetry }: {
  tone?: UiTone;
  reason: string;
  onRetry: () => void;
  onHint: () => void;
  onLevels: () => void;
  rewardedRetry?: {
    status: 'idle' | 'loading' | 'ready' | 'showing' | 'unavailable';
    supported: boolean;
    message?: string;
    onPress: () => void;
  };
}) {
  return (
    <Card tone={tone} showBanner={Platform.OS !== 'web'}>
      <Text style={[styles.kicker, tone === 'singularity' && { color: SG.cyan }, tone === 'genesis' && { color: GN.gold }]}>{tone === 'singularity' ? 'PARADOX FAILED' : tone === 'genesis' ? 'TRY AGAIN' : 'Oh no'}</Text>
      <Text style={[styles.big, tone === 'singularity' && { color: SG.cyan, textShadowColor: SG.gold }, tone === 'genesis' && { color: GN.gold, textShadowColor: GN.orange }]}>{tone === 'singularity' ? 'Timeline collapsed' : 'Cloud dried up'}</Text>
      <Text style={[styles.sub, tone === 'singularity' && { color: SG.textSoft }, tone === 'genesis' && { color: GN.textSoft }, { marginVertical: 12 }]}>{reason}</Text>
      {rewardedRetry?.supported && (
        <>
          <Text style={[styles.sub, tone === 'singularity' && { color: SG.textSoft }, tone === 'genesis' && { color: GN.textSoft }, { textAlign: 'center' }]}>
            Watch a quick video for +50% Extra Ink &amp; Revive!
          </Text>
          <View style={styles.row}>
            <Btn
              tone={tone}
              label={
                rewardedRetry.status === 'ready' ? 'Watch video · +50% ink'
                  : rewardedRetry.status === 'showing' ? 'Ad playing…'
                    : rewardedRetry.status === 'loading' ? 'Loading rewarded ad…'
                      : rewardedRetry.status === 'idle' ? 'Load rewarded ad'
                        : 'Try loading video again'
              }
              icon="play-circle"
              kind="ghost"
              disabled={rewardedRetry.status === 'loading' || rewardedRetry.status === 'showing'}
              onPress={rewardedRetry.onPress}
              testID="rewarded-retry"
            />
          </View>
          {!!rewardedRetry.message && (
            <Text style={[styles.rewardedNote, tone === 'singularity' && { color: SG.textSoft }, tone === 'genesis' && { color: GN.textSoft }]} testID="rewarded-retry-status" accessibilityLiveRegion="polite">
              {rewardedRetry.message}
            </Text>
          )}
        </>
      )}
      <View style={styles.row}>
        <Btn tone={tone} label="Retry" icon="refresh" onPress={onRetry} testID="retry" />
      </View>
      <View style={styles.row}>
        <Btn tone={tone} label="Hint" icon="bulb" kind="ghost" onPress={onHint} testID="fail-hint" />
        <Btn tone={tone} label="Levels" icon="grid" kind="ghost" onPress={onLevels} testID="fail-levels" />
      </View>
    </Card>
  );
}

export function LevelPicker({ deaths, badges, scores, bestTimes, levels, unlocked, fastPasses = 0, stars, current, onPick, onClose, title = 'Garden beds', noun = 'Bed' }: { deaths?: Record<string, number>; badges?: Record<string, string>; scores?: Record<string, number>; bestTimes?: Record<string, number>; levels: Level[]; unlocked: number; fastPasses?: number; stars: Record<string, number>; current: number; onPick: (i: number) => void; onClose: () => void; title?: string; noun?: string }) {
  const { width, height, fontScale } = useWindowDimensions();
  const ins = useSafeInsets();
  const showBanner = Platform.OS !== 'web';
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const short = height - ins.top - ins.bottom - 16 - (showBanner ? BANNER_AD_RESERVED_HEIGHT : 0) < 400;
  const estimatedWidth = Math.min(840, width - ins.left - ins.right - 16) - (short ? 32 : 44);
  const { gap, columns, tileWidth } = levelGrid(measuredWidth || Math.max(0, estimatedWidth), fontScale);
  const hc = !!levels[0]?.hardcore;
  const vd = !!levels[0]?.voidProtocol;
  const sg = levels[0]?.visualMode === 'singularity';
  const genesis = levels[0]?.visualMode === 'genesis';
  const pickerTone: UiTone | undefined = vd ? 'void' : sg ? 'singularity' : genesis ? 'genesis' : undefined;
  const [records, setRecords] = useState(false);
  const genesisPages: { n: string; a: number; b: number; note?: string }[] = [
    ...['Precision', 'Pressure', 'Gauntlet'].map((n, i) => ({ n, a: i * 15, b: i * 15 + 14 })),
    ...([['Refraction', 'Bounce the laser off mirrors to light the bloom.'], ['Counterweight', 'Chain pulley stages so each weight lifts the next.'], ['Twin Bloom', 'Split the droplet and water both flowers.'], ['Resonance', 'Mix lasers, pulleys and splits under the clock.'], ['Master Circuit', 'Every mechanic, countdown running.']] as const)
      .map(([n, note], i) => ({ n, note, a: 45 + i * 11, b: 55 + i * 11 })),
  ].filter((p) => p.a < levels.length).map((p) => ({ ...p, b: Math.min(p.b, levels.length - 1) }));
  const pages: { n: string; a: number; b: number; note?: string }[] | null = genesis && levels.length > 45 ? genesisPages : vd
    ? [
      { n: 'Shadow', a: 0, b: 13 }, { n: 'Decay', a: 14, b: 27 },
      { n: 'Gravity', a: 28, b: 41 }, { n: 'Protocol', a: 42, b: Math.min(54, levels.length - 1) },
      ...Array.from({ length: Math.ceil(Math.max(0, levels.length - 55) / 14) }, (_, i) => ({
        n: ['Aftermath', 'Abyss', 'Collapse', 'Event Horizon'][i] ?? 'Beyond',
        a: 55 + i * 14, b: Math.min(levels.length - 1, 68 + i * 14),
      })),
    ]
    : sg
      ? ['Photon', 'Event Horizon', 'Quasar', 'Paradox', 'Singularity'].map((n, i) => ({ n, a: i * 11, b: Math.min(levels.length - 1, i * 11 + 10) }))
    : hc
    ? Array.from({ length: Math.ceil(levels.length / 15) }, (_, i) => ({
      n: ['Precision', 'Pressure', 'Gauntlet', 'Ascendant', 'Apex', 'Overdrive', 'Final Circuit'][i] ?? `Circuit ${i + 1}`,
      a: i * 15, b: Math.min(levels.length - 1, i * 15 + 14),
    }))
    : levels.length > 45
      ? [{ n: 'Campaign', a: 0, b: 44 }, { n: 'Infinity Cascade', a: 45, b: 59 }, { n: 'Infinity Cascade', a: 60, b: 74 }, { n: 'Infinity Cascade', a: 75, b: 89 }, { n: 'Infinity Cascade', a: 90, b: levels.length - 1 }]
      : null;
  const [chap, setChap] = useState(Math.max(0, pages ? pages.findIndex((p) => current >= p.a && current <= p.b) : 0));
  const tileHeight = Math.max(short ? 112 : 124, Math.ceil(84 * fontScale + 30)) + (hc ? 20 : 0) + (vd ? 18 : 0);
  const pg = pages ? pages[chap] ?? pages[0] : null;
  const range = pg ? levels.map((_, i) => i).filter((i) => i >= pg.a && i <= pg.b) : levels.map((_, i) => i);
  const scrollRef = useRef<ScrollView>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [jump, setJump] = useState(0);
  const [gridLayout, setGridLayout] = useState<{ key: string; top: number } | null>(null);
  // A new layout must be measured after rotation, text resizing or chapter changes.
  // Ordinary browsing does not change this key, so it never snaps back while scrolling.
  const layoutKey = `${width}:${height}:${fontScale}:${measuredWidth}:${columns}:${tileHeight}:${chap}:${records}:${current}:${jump}`;
  const currentPage = Math.max(0, pages ? pages.findIndex((p) => current >= p.a && current <= p.b) : 0);
  const relativeIndex = range.indexOf(current);
  useEffect(() => {
    if (!viewportHeight || !contentHeight) return;
    if (!records && gridLayout?.key !== layoutKey) return;
    const y = records ? 0 : levelScrollOffset({
      index: relativeIndex, columns, tileHeight, gap, gridTop: gridLayout?.top ?? 0,
      viewportHeight, contentHeight,
    });
    // Wait for native content bounds to commit; cancel stale work on reflow/unmount.
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [layoutKey, gridLayout, records, relativeIndex, columns, tileHeight, gap, viewportHeight, contentHeight]);
  const returnToCurrent = () => {
    setRecords(false);
    setChap(currentPage);
    setJump((n) => n + 1);
  };
  return (
    <Card dark={vd} tone={pickerTone} title={title} onClose={onClose} scrollID="level-list" expanded showBanner={showBanner}
      scrollRef={scrollRef}
      onScrollLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
      onContentSizeChange={(_, h) => setContentHeight(h)}
      footer={
        <PressScale testID="current-level" label={`Return to current ${noun.toLowerCase()} ${levels[current]?.id ?? current + 1}`} onPress={returnToCurrent} containerStyle={styles.currentSlot} style={[styles.currentBtn, vd && { backgroundColor: VD.purpleDeep, borderColor: VD.purple }, sg && styles.sgCurrent, genesis && styles.gnCurrent]}>
          <Ionicons name="locate" size={20} color={vd ? VD.text : sg ? SG.cyan : genesis ? GN.gold : P.ink} />
          <Text style={[styles.currentText, vd && { color: VD.text }, sg && { color: SG.text }, genesis && { color: GN.text }]}>Current {noun.toLowerCase()} · {levels[current]?.id ?? current + 1}</Text>
        </PressScale>
      }>
      {hc && (
        <PressScale testID="records-toggle" selected={records} label={records ? 'Show level grid' : 'Show personal records, ranked by best score'} onPress={() => setRecords((r) => !r)} containerStyle={{ marginBottom: 10 }} style={[styles.chap, { flexDirection: 'row', gap: 6 }, vd && styles.vTile, sg && styles.sgTile, genesis && styles.gnTile, records && { backgroundColor: vd ? VD.purpleDeep : sg ? SG.panelHi : genesis ? GN.panelHi : P.marigold }]}>
          <Ionicons name="trophy" size={18} color={vd ? VD.text : sg ? SG.gold : genesis ? GN.gold : P.ink} />
          <Text style={[styles.chapT, vd && { color: VD.text }, sg && { color: SG.text }, genesis && { color: GN.text }]}>{records ? 'Back to levels' : 'Personal records'}</Text>
        </PressScale>
      )}
      {hc && records && (
        <View testID="records-list" accessibilityLabel="Personal records on this device">
          <Text style={[styles.chapT, vd && { color: VD.text }, sg && { color: SG.text }, genesis && { color: GN.text }]}>Personal records (this device)</Text>
          {levels.map((l, i) => ({ l, i, s: scores?.[String(i)] })).sort((a, b) => (b.s ?? -1) - (a.s ?? -1) || a.i - b.i).map(({ l, i, s }, r) => (
            <Text key={l.id} style={[styles.tileRec, vd && { color: VD.textSoft, paddingVertical: 3 }, sg && { color: SG.textSoft, paddingVertical: 3 }, genesis && { color: GN.textSoft, paddingVertical: 3 }]} accessibilityLabel={`${noun} ${l.id}, ${l.name}, best score ${s ?? 'none'}${vd ? `, ${deaths?.[String(i)] ?? 0} deaths, badge ${badges?.[String(i)] ?? 'none'}` : ''}`}>
              {s !== undefined ? `#${r + 1}` : '–'}  {noun} {l.id} {l.name}: {s ?? '—'} · {bestTimes?.[String(i)] !== undefined ? `${bestTimes[String(i)].toFixed(1)}s` : '—'} · {stars[i] ?? 0}/3 stars{vd ? ` · ${deaths?.[String(i)] ?? 0} deaths · ${badges?.[String(i)] ?? '—'}` : ''}
            </Text>
          ))}
        </View>
      )}
      {pages && !records && (
        <View style={styles.chapRow}>
          {pages.map(({ n, a, b }, c) => (
            <PressScale key={c} testID={`chapter-${c}`} selected={chap === c} label={`${n}, levels ${a + 1} to ${b + 1}`} onPress={() => setChap(c)} containerStyle={{ flexGrow: 1, flexBasis: pages.length > 3 ? 84 : 100 }} style={[styles.chap, vd && styles.vTile, sg && styles.sgTile, genesis && styles.gnTile, chap === c && { backgroundColor: vd ? VD.redDeep : sg ? SG.cyanDeep : genesis ? GN.orange : P.coralDeep }]}>
              <Text style={[styles.chapT, vd && { color: VD.text }, sg && { color: SG.text }, genesis && { color: GN.text }, chap === c && { color: P.white }]} numberOfLines={1}>{n}</Text>
              <Text style={[styles.chapS, vd && { color: VD.textSoft }, sg && { color: SG.textSoft }, genesis && { color: GN.textSoft }, chap === c && { color: P.white }]}>{a + 1}–{b + 1}</Text>
            </PressScale>
          ))}
        </View>
      )}
      {genesis && !records && pg?.note && (
        <Text style={[styles.tileRec, { color: GN.textSoft, textAlign: 'left', marginBottom: 8, fontSize: 13 }]} testID="chapter-note" accessibilityLiveRegion="polite">{pg.n}: {pg.note}</Text>
      )}
      {!(hc && records) && <View key={layoutKey} style={[styles.grid, { gap }]} onLayout={(e) => {
        setMeasuredWidth(e.nativeEvent.layout.width);
        setGridLayout({ key: layoutKey, top: e.nativeEvent.layout.y });
      }}>
        {range.map((i) => {
          const l = levels[i];
          const fastPassTrial = i > unlocked && fastPasses > 0;
          const locked = i > unlocked && !fastPassTrial;
          return (
              <PressScale key={l.id} containerStyle={{ width: tileWidth }} disabled={locked} label={locked ? `${noun} ${l.id}, ${l.name}, locked` : fastPassTrial ? `${noun} ${l.id}, ${l.name}, temporary fast-pass trial` : `${noun} ${l.id}, ${l.name}`} selected={i === current} onPress={() => onPick(i)} testID={`level-${l.id}`} style={[styles.tile, { height: tileHeight }, vd && styles.vTile, sg && styles.sgTile, genesis && styles.gnTile, i === current && (vd ? styles.vTileCur : sg ? styles.sgTileCur : genesis ? styles.gnTileCur : styles.tileCur), locked && { backgroundColor: vd ? VD.bgDeep : sg ? SG.bgDeep : genesis ? GN.bgDeep : P.paperDeep }]}>
               {locked ? <Ionicons name="lock-closed" size={22} color={vd ? VD.textSoft : sg ? SG.textSoft : genesis ? GN.textSoft : P.inkSoft} /> : <Text style={[styles.tileNum, vd && { color: VD.text }, sg && { color: SG.cyan }, genesis && { color: GN.gold }]}>{l.id}</Text>}
               <Text style={[styles.tileName, vd && { color: VD.textSoft }, sg && { color: SG.textSoft }, genesis && { color: GN.textSoft }, { minHeight: 30 * Math.max(1, fontScale) }]} numberOfLines={2}>{l.name}</Text>
              <Stars count={stars[i] ?? 0} size={14} />
              {vd && <Text style={[styles.tileRec, { color: badges?.[String(i)] === 'Gold' ? VD.gold : VD.textSoft }]}>{deaths?.[String(i)] ?? 0} deaths · {badges?.[String(i)] ?? 'No badge'}</Text>}
              {fastPassTrial
                ? <Text style={[styles.tileRec, styles.fastPassTrial]}>FAST-PASS TRIAL</Text>
                : hc && <Text style={[styles.tileRec, vd && { color: VD.textSoft }]}>{scores?.[String(i)] !== undefined ? scores[String(i)] : '—'} · {bestTimes?.[String(i)] !== undefined ? `${bestTimes[String(i)].toFixed(1)}s` : '—'}</Text>}
            </PressScale>
          );
        })}
      </View>}
    </Card>
  );
}

function Toggle({ on, onChange, label, sub, testID, tone }: { on: boolean; onChange: (v: boolean) => void; label: string; sub: string; testID: string; tone?: UiTone }) {
  const textTone = tone === 'singularity' ? SG.text : tone === 'genesis' ? GN.text : tone === 'void' ? VD.text : P.ink;
  const subTone = tone === 'singularity' ? SG.textSoft : tone === 'genesis' ? GN.textSoft : tone === 'void' ? VD.textSoft : P.inkSoft;
  const dark = tone === 'void' || tone === 'singularity';
  return (
    <PressScale onPress={() => onChange(!on)} testID={testID} role="switch" selected={on} label={`${label}: ${sub}`} style={styles.toggleRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.toggleLabel, { color: textTone }]}>{label}</Text>
        <Text style={[styles.toggleSub, { color: subTone }]}>{sub}</Text>
      </View>
      <View style={[styles.track, dark && { backgroundColor: tone === 'singularity' ? SG.panelHi : VD.panelHi, borderColor: tone === 'singularity' ? SG.cyan : VD.line }, on && { backgroundColor: tone === 'singularity' ? SG.cyanDeep : tone === 'genesis' ? GN.amber : P.drop }]}>
        <View style={[styles.knob, on && { transform: [{ translateX: 20 }] }]} />
      </View>
    </PressScale>
  );
}

export function SettingsSheet({ dark, tone, haptics, guides, sound, onHaptics, onGuides, onSound, onReset, onClose, resetLabel = 'Reset progress' }: { dark?: boolean; tone?: UiTone; resetLabel?: string; haptics: boolean; guides: boolean; sound: boolean; onHaptics: (v: boolean) => void; onSound: (v: boolean) => void; onGuides: (v: boolean) => void; onReset: () => void; onClose: () => void }) {
  const [armed, setArmed] = React.useState(false);
  const [supportError, setSupportError] = React.useState(false);
  return (
    <Card title="Settings" onClose={onClose} dark={dark} tone={tone}>
      <Text style={[styles.brand, tone === 'singularity' && { color: SG.textSoft }, tone === 'genesis' && { color: GN.textSoft }]} >Slice & Bloom</Text>
      <Text testID="developer-credit" style={[styles.developerCredit, dark && { color: VD.text }, tone === 'singularity' && { color: SG.textSoft }, tone === 'genesis' && { color: GN.textSoft }]}>By {developerName}</Text>
      <Text selectable testID="support-email" style={[styles.developerCredit, dark && { color: VD.text }, tone === 'singularity' && { color: SG.textSoft }, tone === 'genesis' && { color: GN.textSoft }]}>{supportEmail}</Text>
      <Btn dark={dark} tone={tone} label="Email support" icon="mail" kind="ghost" testID="email-support" onPress={() => {
        setSupportError(false);
        // Opening a draft never sends mail. Keep the address selectable above
        // so devices without a configured mail app still have a usable contact.
        void Linking.openURL(`mailto:${supportEmail}?subject=${encodeURIComponent('Slice & Bloom support')}`)
          .catch(() => setSupportError(true));
      }} />
      {supportError && <Text accessibilityLiveRegion="polite" style={[styles.developerCredit, dark && { color: VD.text }]}>Could not open a mail app. Please copy the email address above to contact support.</Text>}
      <Toggle on={sound} onChange={onSound} label="Sound" sub="Snips, rope twangs and splashes" testID="toggle-sound" tone={tone} />
      <Toggle on={haptics} onChange={onHaptics} label="Haptics" sub="Taps, cuts and splashes" testID="toggle-haptics" tone={tone} />
      <Toggle on={guides} onChange={onGuides} label="Cut guides" sub="Dashed outline on timber you can slice" testID="toggle-guides" tone={tone} />
      <View style={{ height: 8 }} />
      <Btn
        dark={dark}
        tone={tone}
        label={armed ? 'Tap again to erase' : resetLabel}
        icon="trash"
        kind="ghost"
        testID="reset-progress"
        onPress={() => {
          if (armed) {
            onReset();
            setArmed(false);
          } else setArmed(true);
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  developerCredit: { fontFamily: F.semi, fontSize: 14, color: P.inkSoft, textAlign: 'center', marginBottom: 12 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,39,92,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  bannerDock: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 51 },
  card: { width: '100%', maxWidth: 420, backgroundColor: P.paper, borderRadius: R.card, borderWidth: 4, borderColor: P.ink, borderTopColor: P.ink, padding: 18, alignItems: 'stretch', flexShrink: 1, shadowColor: P.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 0 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { flex: 1, fontFamily: F.bold, fontSize: 28, textTransform: 'uppercase', color: P.ink },
  body: { flexGrow: 0, flexShrink: 1 },
  currentSlot: { marginTop: 10, flexShrink: 0 },
  currentBtn: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8, borderRadius: R.btn, borderWidth: 3, borderColor: P.ink, backgroundColor: P.marigold },
  currentText: { fontFamily: F.bold, fontSize: 14, color: P.ink, flexShrink: 1 },
  closeBtn: { width: 44, height: 44, borderRadius: R.btn, backgroundColor: P.coral, borderWidth: 3, borderColor: P.ink, alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: F.semi, fontSize: 12, color: P.inkSoft, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  kicker: { fontFamily: F.bold, fontSize: 14, color: P.coralDeep, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1.5 },
  big: { fontFamily: F.bold, fontSize: 38, color: P.drop, textShadowColor: P.marigold, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0, textAlign: 'center' },
  sub: { fontFamily: F.medium, fontSize: 15, color: P.inkSoft, textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  btnSlot: { flexGrow: 1, flexBasis: 120, minWidth: 0 },
  btn: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderRadius: R.btn, borderWidth: 3, borderColor: P.ink, shadowColor: P.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  rewardedNote: { fontFamily: F.medium, fontSize: 13, color: P.inkSoft, textAlign: 'center', marginTop: 6 },
  hubIntro: { fontFamily: F.medium, fontSize: 14, color: P.inkSoft, lineHeight: 20, marginBottom: 12 },
  rewardOffer: { borderWidth: 3, borderColor: P.ink, borderRadius: R.card, backgroundColor: P.paperDeep, padding: 12, marginBottom: 12, gap: 6 },
  rewardOfferHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rewardOfferTitle: { flex: 1, fontFamily: F.bold, fontSize: 17, color: P.ink },
  rewardOfferCopy: { fontFamily: F.medium, fontSize: 13, color: P.inkSoft, lineHeight: 18 },
  rewardInventory: { fontFamily: F.bold, fontSize: 13, color: P.dropDeep },
  rewardFootnote: { fontFamily: F.medium, fontSize: 12, color: P.coralDeep, textAlign: 'center' },
  rewardMessage: { fontFamily: F.bold, fontSize: 14, color: P.dropDeep, textAlign: 'center', paddingVertical: 8 },
  fastPassTrial: { color: P.coralDeep },
  btnPrimary: { backgroundColor: P.drop },
  btnGhost: { backgroundColor: P.marigold },
  btnText: { fontFamily: F.bold, fontSize: 17 },
  starShadow: { textShadowColor: P.ink, textShadowRadius: 0, textShadowOffset: { width: 0, height: 2 } },
  cardDark: { backgroundColor: VD.bg, borderColor: VD.purple, shadowColor: VD.red, shadowOpacity: 0.6, shadowRadius: 0 },
  cardSingularity: { backgroundColor: SG.bg, borderColor: SG.cyan, shadowColor: SG.violet, shadowOpacity: 0.8 },
  cardGenesis: { backgroundColor: GN.bg, borderColor: GN.amber, shadowColor: GN.orange, shadowOpacity: 0.9 },
  cardReward: { backgroundColor: REWARD_GOLD.bg, borderColor: REWARD_GOLD.gold, shadowColor: REWARD_GOLD.glow, shadowOpacity: 0.9 },
  btnVoid: { backgroundColor: VD.redDeep, borderColor: VD.red, shadowColor: VD.red },
  btnVoidGhost: { backgroundColor: VD.panelHi, borderColor: VD.purple, shadowColor: VD.purple },
  btnSing: { backgroundColor: SG.cyanDeep, borderColor: SG.cyan, shadowColor: SG.cyan },
  btnSingGhost: { backgroundColor: SG.panelHi, borderColor: SG.line, shadowColor: SG.violet },
  btnGenesis: { backgroundColor: GN.orange, borderColor: GN.amber, shadowColor: GN.orange },
  btnGenesisGhost: { backgroundColor: GN.panelHi, borderColor: GN.line, shadowColor: GN.amber },
  btnReward: { backgroundColor: REWARD_GOLD.gold, borderColor: REWARD_GOLD.glow, shadowColor: REWARD_GOLD.gold },
  btnRewardGhost: { backgroundColor: REWARD_GOLD.panelHi, borderColor: REWARD_GOLD.line, shadowColor: REWARD_GOLD.gold },
  vTile: { backgroundColor: VD.panel, borderColor: VD.line, shadowColor: VD.purple },
  vTileCur: { backgroundColor: VD.purpleDeep, borderColor: VD.red },
  sgTile: { backgroundColor: SG.panel, borderColor: SG.line, shadowColor: SG.violet },
  sgTileCur: { backgroundColor: SG.panelHi, borderColor: SG.cyan, shadowColor: SG.cyan },
  gnTile: { backgroundColor: GN.panel, borderColor: GN.line, shadowColor: GN.orange },
  gnTileCur: { backgroundColor: GN.panelHi, borderColor: GN.gold, shadowColor: GN.amber },
  sgCurrent: { backgroundColor: SG.panelHi, borderColor: SG.cyan },
  gnCurrent: { backgroundColor: GN.panelHi, borderColor: GN.gold },
  sgCurrentText: { color: SG.text },
  gnCurrentText: { color: GN.text },
  sgChip: { color: SG.text, backgroundColor: SG.cyanDeep },
  gnChip: { color: GN.bgDeep, backgroundColor: GN.amber },
  vaultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 8, marginBottom: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: REWARD_GOLD.line },
  vaultLabel: { fontFamily: F.bold, fontSize: 14, color: REWARD_GOLD.gold, textAlign: 'center' },
  vaultText: { color: REWARD_GOLD.textSoft },
  vaultTitle: { color: REWARD_GOLD.text },
  vaultInventory: { color: REWARD_GOLD.gold },
  vaultOffer: { backgroundColor: REWARD_GOLD.panel, borderColor: REWARD_GOLD.line, shadowColor: REWARD_GOLD.gold, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.8, shadowRadius: 5, elevation: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '100%', backgroundColor: P.white, borderRadius: R.btn, borderWidth: 3, borderColor: P.ink, shadowColor: P.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8 },
  chapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chap: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: P.white, borderWidth: 3, borderColor: P.ink, borderRadius: R.btn, paddingHorizontal: 8 },
  chapT: { fontFamily: F.bold, fontSize: 14, color: P.ink },
  chapS: { fontFamily: F.semi, fontSize: 11, color: P.inkSoft },
  tileRec: { fontFamily: F.semi, fontSize: 11, color: P.inkSoft },
  tileCur: { backgroundColor: P.marigold },
  tileNum: { fontFamily: F.bold, fontSize: 30, color: P.ink },
  tileName: { width: '100%', fontFamily: F.semi, fontSize: 12, lineHeight: 15, color: P.ink, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingVertical: 10, gap: 12 },
  toggleLabel: { fontFamily: F.semi, fontSize: 18, color: P.ink },
  toggleSub: { fontFamily: F.regular, fontSize: 13, color: P.inkSoft },
  track: { width: 52, height: 30, borderRadius: 15, backgroundColor: P.paperDeep, borderWidth: 2.5, borderColor: P.ink, padding: 2 },
  knob: { width: 21, height: 21, borderRadius: 11, backgroundColor: P.white, borderWidth: 2, borderColor: P.ink },
});
