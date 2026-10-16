import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, ScrollViewProps, StyleProp, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F, P, R } from '@/constants/theme';
import { useSafeInsets } from '@/components/layout';
import { Level } from '@/lib/levels';
import { haptic } from '@/lib/haptics';
import { levelGrid, levelScrollOffset } from '@/lib/levelGrid';

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

function Card({ children, onClose, title, scrollID, expanded = false, scrollRef, onScrollLayout, onContentSizeChange, footer }: {
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
  useEffect(() => {
    Animated.spring(a, { toValue: 1, useNativeDriver: true, bounciness: 10, speed: 12 }).start();
  }, [a]);
  const pad = expanded ? 8 : 14;
  const availableHeight = Math.max(0, height - ins.top - ins.bottom - pad * 2);
  const short = expanded && availableHeight < 400;
  return (
    <Animated.View style={[styles.scrim, { opacity: a, paddingTop: ins.top + pad, paddingBottom: ins.bottom + pad, paddingLeft: ins.left + pad, paddingRight: ins.right + pad }]}>
      <Animated.View style={[styles.card, expanded && { maxWidth: 840, height: availableHeight }, short && { padding: 12 }, { maxHeight: availableHeight, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]} accessibilityViewIsModal>
        {title !== undefined && (
          <View style={[styles.cardHead, short && { marginBottom: 8 }]}>
            <Text style={[styles.cardTitle, short && { fontSize: 22 }]} numberOfLines={1}>{title}</Text>
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
    </Animated.View>
  );
}

function Btn({ label, icon, onPress, kind = 'primary', testID }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; kind?: 'primary' | 'ghost'; testID?: string }) {
  return (
    <PressScale onPress={onPress} testID={testID} label={label} containerStyle={styles.btnSlot} style={[styles.btn, kind === 'primary' ? styles.btnPrimary : styles.btnGhost]}>
      <Ionicons name={icon} size={20} color={kind === 'primary' ? P.white : P.ink} />
      <Text numberOfLines={1} style={[styles.btnText, { color: kind === 'primary' ? P.white : P.ink }]}>{label}</Text>
    </PressScale>
  );
}

export function WinCard({ masterclass, score, highScore, bestTime, level, stars, elapsed, hasNext, onNext, onReplay, onLevels }: { masterclass?: boolean; score?: number; highScore?: number; bestTime?: number; level: Level; stars: number; elapsed?: number; hasNext: boolean; onNext: () => void; onReplay: () => void; onLevels: () => void }) {
  return (
    <Card>
      <Text style={styles.kicker}>{level.name}</Text>
      <Text style={styles.big}>{masterclass ? 'Masterclass complete' : 'It bloomed!'}</Text>
      <Text style={styles.brand}>Slice & Bloom</Text>
      <View style={{ marginVertical: 14 }}>
        <Stars count={stars} size={44} pop />
      </View>
      <Text style={styles.sub}>{level.hardcore
        ? `${(elapsed ?? 0).toFixed(1)}s · ${stars === 3 ? 'Gold earned!' : `Gold needs ${level.hardcore.goldTime}s or less and at most ${level.par} ${level.par === 1 ? 'move' : 'moves'}.`}`
        : stars === 3 ? 'Perfect watering.' : stars === 2 ? 'Nicely done. Fewer moves earn a third star.' : 'Bloomed. Try fewer moves for more stars.'}</Text>
      {level.hardcore && score !== undefined && (
        <Text style={[styles.sub, { marginTop: 6, fontFamily: F.bold, color: P.ink }]} testID="win-score">
          Score {score}{highScore !== undefined ? ` · Best ${highScore}` : ''}{bestTime !== undefined ? ` · Best time ${bestTime.toFixed(1)}s` : ''}
        </Text>
      )}
      <View style={styles.row}>
        {hasNext ? <Btn label="Next" icon="arrow-forward" onPress={onNext} testID="next-level" /> : <Btn label="All grown" icon="grid" onPress={onLevels} testID="all-levels" />}
      </View>
      <View style={styles.row}>
        <Btn label="Replay" icon="refresh" kind="ghost" onPress={onReplay} testID="replay" />
        <Btn label="Levels" icon="grid" kind="ghost" onPress={onLevels} testID="win-levels" />
      </View>
    </Card>
  );
}

export function LoseCard({ reason, onRetry, onHint, onLevels }: { reason: string; onRetry: () => void; onHint: () => void; onLevels: () => void }) {
  return (
    <Card>
      <Text style={styles.kicker}>Oh no</Text>
      <Text style={styles.big}>Cloud dried up</Text>
      <Text style={[styles.sub, { marginVertical: 12 }]}>{reason}</Text>
      <View style={styles.row}>
        <Btn label="Retry" icon="refresh" onPress={onRetry} testID="retry" />
      </View>
      <View style={styles.row}>
        <Btn label="Hint" icon="bulb" kind="ghost" onPress={onHint} testID="fail-hint" />
        <Btn label="Levels" icon="grid" kind="ghost" onPress={onLevels} testID="fail-levels" />
      </View>
    </Card>
  );
}

export function LevelPicker({ scores, bestTimes, levels, unlocked, stars, current, onPick, onClose, title = 'Garden beds', noun = 'Bed' }: { scores?: Record<string, number>; bestTimes?: Record<string, number>; levels: Level[]; unlocked: number; stars: Record<string, number>; current: number; onPick: (i: number) => void; onClose: () => void; title?: string; noun?: string }) {
  const { width, height, fontScale } = useWindowDimensions();
  const ins = useSafeInsets();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const short = height - ins.top - ins.bottom - 16 < 400;
  const estimatedWidth = Math.min(840, width - ins.left - ins.right - 16) - (short ? 32 : 44);
  const { gap, columns, tileWidth } = levelGrid(measuredWidth || Math.max(0, estimatedWidth), fontScale);
  const hc = !!levels[0]?.hardcore;
  const [records, setRecords] = useState(false);
  const pages: { n: string; a: number; b: number }[] | null = hc
    ? [{ n: 'Precision', a: 0, b: 14 }, { n: 'Pressure', a: 15, b: 29 }, { n: 'Gauntlet', a: 30, b: 44 }]
    : levels.length > 45
      ? [{ n: 'Campaign', a: 0, b: 44 }, { n: 'Infinity Cascade', a: 45, b: 59 }, { n: 'Infinity Cascade', a: 60, b: 74 }, { n: 'Infinity Cascade', a: 75, b: 89 }, { n: 'Infinity Cascade', a: 90, b: levels.length - 1 }]
      : null;
  const [chap, setChap] = useState(Math.max(0, pages ? pages.findIndex((p) => current >= p.a && current <= p.b) : 0));
  const tileHeight = Math.max(short ? 112 : 124, Math.ceil(84 * fontScale + 30)) + (hc ? 20 : 0);
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
    <Card title={title} onClose={onClose} scrollID="level-list" expanded
      scrollRef={scrollRef}
      onScrollLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
      onContentSizeChange={(_, h) => setContentHeight(h)}
      footer={
        <PressScale testID="current-level" label={`Return to current ${noun.toLowerCase()} ${levels[current]?.id ?? current + 1}`} onPress={returnToCurrent} containerStyle={styles.currentSlot} style={styles.currentBtn}>
          <Ionicons name="locate" size={20} color={P.ink} />
          <Text style={styles.currentText}>Current {noun.toLowerCase()} · {levels[current]?.id ?? current + 1}</Text>
        </PressScale>
      }>
      {hc && (
        <PressScale testID="records-toggle" selected={records} label={records ? 'Show level grid' : 'Show personal records, ranked by best score'} onPress={() => setRecords((r) => !r)} containerStyle={{ marginBottom: 10 }} style={[styles.chap, { flexDirection: 'row', gap: 6 }, records && { backgroundColor: P.marigold }]}>
          <Ionicons name="trophy" size={18} color={P.ink} />
          <Text style={styles.chapT}>{records ? 'Back to levels' : 'Personal records'}</Text>
        </PressScale>
      )}
      {hc && records && (
        <View testID="records-list" accessibilityLabel="Personal records on this device">
          <Text style={styles.chapT}>Personal records (this device)</Text>
          {levels.map((l, i) => ({ l, i, s: scores?.[String(i)] })).sort((a, b) => (b.s ?? -1) - (a.s ?? -1) || a.i - b.i).map(({ l, i, s }, r) => (
            <Text key={l.id} style={styles.tileRec} accessibilityLabel={`${noun} ${l.id}, ${l.name}, best score ${s ?? 'none'}`}>
              {s !== undefined ? `#${r + 1}` : '–'}  {noun} {l.id} {l.name}: {s ?? '—'} · {bestTimes?.[String(i)] !== undefined ? `${bestTimes[String(i)].toFixed(1)}s` : '—'} · {stars[i] ?? 0}/3 stars
            </Text>
          ))}
        </View>
      )}
      {pages && !records && (
        <View style={styles.chapRow}>
          {pages.map(({ n, a, b }, c) => (
            <PressScale key={c} testID={`chapter-${c}`} selected={chap === c} label={`${n}, levels ${a + 1} to ${b + 1}`} onPress={() => setChap(c)} containerStyle={{ flexGrow: 1, flexBasis: pages.length > 3 ? 84 : 100 }} style={[styles.chap, chap === c && { backgroundColor: P.coralDeep }]}>
              <Text style={[styles.chapT, chap === c && { color: P.white }]} numberOfLines={1}>{n}</Text>
              <Text style={[styles.chapS, chap === c && { color: P.white }]}>{a + 1}–{b + 1}</Text>
            </PressScale>
          ))}
        </View>
      )}
      {!(hc && records) && <View key={layoutKey} style={[styles.grid, { gap }]} onLayout={(e) => {
        setMeasuredWidth(e.nativeEvent.layout.width);
        setGridLayout({ key: layoutKey, top: e.nativeEvent.layout.y });
      }}>
        {range.map((i) => {
          const l = levels[i];
          const locked = i > unlocked;
          return (
            <PressScale key={l.id} containerStyle={{ width: tileWidth }} disabled={locked} label={locked ? `${noun} ${l.id}, ${l.name}, locked` : `${noun} ${l.id}, ${l.name}`} selected={i === current} onPress={() => onPick(i)} testID={`level-${l.id}`} style={[styles.tile, { height: tileHeight }, i === current && styles.tileCur, locked && { backgroundColor: P.paperDeep }]}>
              {locked ? <Ionicons name="lock-closed" size={22} color={P.inkSoft} /> : <Text style={styles.tileNum}>{l.id}</Text>}
              <Text style={[styles.tileName, { minHeight: 30 * Math.max(1, fontScale) }]} numberOfLines={2}>{l.name}</Text>
              <Stars count={stars[i] ?? 0} size={14} />
              {hc && <Text style={styles.tileRec}>{scores?.[String(i)] !== undefined ? scores[String(i)] : '—'} · {bestTimes?.[String(i)] !== undefined ? `${bestTimes[String(i)].toFixed(1)}s` : '—'}</Text>}
            </PressScale>
          );
        })}
      </View>}
    </Card>
  );
}

function Toggle({ on, onChange, label, sub, testID }: { on: boolean; onChange: (v: boolean) => void; label: string; sub: string; testID: string }) {
  return (
    <PressScale onPress={() => onChange(!on)} testID={testID} role="switch" selected={on} label={`${label}: ${sub}`} style={styles.toggleRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <View style={[styles.track, on && { backgroundColor: P.drop }]}>
        <View style={[styles.knob, on && { transform: [{ translateX: 20 }] }]} />
      </View>
    </PressScale>
  );
}

export function SettingsSheet({ haptics, guides, sound, onHaptics, onGuides, onSound, onReset, onClose, resetLabel = 'Reset progress' }: { resetLabel?: string; haptics: boolean; guides: boolean; sound: boolean; onHaptics: (v: boolean) => void; onSound: (v: boolean) => void; onGuides: (v: boolean) => void; onReset: () => void; onClose: () => void }) {
  const [armed, setArmed] = React.useState(false);
  return (
    <Card title="Settings" onClose={onClose}>
      <Text style={styles.brand}>Slice & Bloom</Text>
      <Toggle on={sound} onChange={onSound} label="Sound" sub="Snips, rope twangs and splashes" testID="toggle-sound" />
      <Toggle on={haptics} onChange={onHaptics} label="Haptics" sub="Taps, cuts and splashes" testID="toggle-haptics" />
      <Toggle on={guides} onChange={onGuides} label="Cut guides" sub="Dashed outline on timber you can slice" testID="toggle-guides" />
      <View style={{ height: 8 }} />
      <Btn
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
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,39,92,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
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
  btnPrimary: { backgroundColor: P.drop },
  btnGhost: { backgroundColor: P.marigold },
  btnText: { fontFamily: F.bold, fontSize: 17 },
  starShadow: { textShadowColor: P.ink, textShadowRadius: 0, textShadowOffset: { width: 0, height: 2 } },
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
