import React, { ReactNode, useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F, P, R } from '@/constants/theme';
import { useSafeInsets } from '@/components/layout';
import { Level } from '@/lib/levels';
import { haptic } from '@/lib/haptics';

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

function Card({ children, onClose, title, scrollID }: { children: ReactNode; onClose?: () => void; title?: string; scrollID?: string }) {
  const a = useRef(new Animated.Value(0)).current;
  const { height } = useWindowDimensions();
  const ins = useSafeInsets();
  useEffect(() => {
    Animated.spring(a, { toValue: 1, useNativeDriver: true, bounciness: 10, speed: 12 }).start();
  }, [a]);
  const pad = 14;
  return (
    <Animated.View style={[styles.scrim, { opacity: a, paddingTop: ins.top + pad, paddingBottom: ins.bottom + pad, paddingLeft: ins.left + pad, paddingRight: ins.right + pad }]}>
      <Animated.View style={[styles.card, { maxHeight: height - ins.top - ins.bottom - pad * 2, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
        {title !== undefined && (
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
            {onClose && (
              <PressScale onPress={onClose} testID="close-sheet" label="Close" style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={P.white} />
              </PressScale>
            )}
          </View>
        )}
        <ScrollView style={styles.body} testID={scrollID} showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 4 }}>
          {children}
        </ScrollView>
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

export function WinCard({ level, stars, hasNext, onNext, onReplay, onLevels }: { level: Level; stars: number; hasNext: boolean; onNext: () => void; onReplay: () => void; onLevels: () => void }) {
  return (
    <Card>
      <Text style={styles.kicker}>{level.name}</Text>
      <Text style={styles.big}>It bloomed!</Text>
      <Text style={styles.brand}>Slice & Bloom</Text>
      <View style={{ marginVertical: 14 }}>
        <Stars count={stars} size={44} pop />
      </View>
      <Text style={styles.sub}>{stars === 3 ? 'Perfect watering.' : stars === 2 ? 'Nicely done. Fewer moves earn a third star.' : 'Bloomed. Try fewer moves for more stars.'}</Text>
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

export function LevelPicker({ levels, unlocked, stars, current, onPick, onClose }: { levels: Level[]; unlocked: number; stars: Record<string, number>; current: number; onPick: (i: number) => void; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const ins = useSafeInsets();
  const cardW = Math.min(420, width - ins.left - ins.right - 28);
  const inner = cardW - 42;
  const gap = 10;
  const cols = Math.max(2, Math.floor((inner + gap) / 98));
  const tileW = Math.floor((inner - gap * (cols - 1)) / cols);
  return (
    <Card title="Garden beds" onClose={onClose} scrollID="level-list">
      <View style={styles.grid}>
        {levels.map((l, i) => {
          const locked = i > unlocked;
          return (
            <PressScale key={l.id} containerStyle={{ width: tileW }} disabled={locked} label={locked ? `Bed ${l.id}, locked` : `Bed ${l.id}, ${l.name}`} selected={i === current} onPress={() => onPick(i)} testID={`level-${l.id}`} style={[styles.tile, i === current && styles.tileCur, locked && { backgroundColor: P.paperDeep }]}>
              {locked ? <Ionicons name="lock-closed" size={22} color={P.inkSoft} /> : <Text style={styles.tileNum}>{l.id}</Text>}
              <Text style={styles.tileName} numberOfLines={2}>{l.name}</Text>
              <Stars count={stars[i] ?? 0} size={14} />
            </PressScale>
          );
        })}
      </View>
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

export function SettingsSheet({ haptics, guides, sound, onHaptics, onGuides, onSound, onReset, onClose }: { haptics: boolean; guides: boolean; sound: boolean; onHaptics: (v: boolean) => void; onSound: (v: boolean) => void; onGuides: (v: boolean) => void; onReset: () => void; onClose: () => void }) {
  const [armed, setArmed] = React.useState(false);
  return (
    <Card title="Settings" onClose={onClose}>
      <Text style={styles.brand}>Slice & Bloom</Text>
      <Toggle on={sound} onChange={onSound} label="Sound" sub="Snips, rope twangs and splashes" testID="toggle-sound" />
      <Toggle on={haptics} onChange={onHaptics} label="Haptics" sub="Taps, cuts and splashes" testID="toggle-haptics" />
      <Toggle on={guides} onChange={onGuides} label="Cut guides" sub="Dashed outline on timber you can slice" testID="toggle-guides" />
      <View style={{ height: 8 }} />
      <Btn
        label={armed ? 'Tap again to erase' : 'Reset progress'}
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
  tile: { width: '100%', aspectRatio: 0.9, backgroundColor: P.white, borderRadius: R.btn, borderWidth: 3, borderColor: P.ink, shadowColor: P.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 },
  tileCur: { backgroundColor: P.marigold },
  tileNum: { fontFamily: F.bold, fontSize: 30, color: P.ink },
  tileName: { fontFamily: F.semi, fontSize: 12, color: P.ink, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingVertical: 10, gap: 12 },
  toggleLabel: { fontFamily: F.semi, fontSize: 18, color: P.ink },
  toggleSub: { fontFamily: F.regular, fontSize: 13, color: P.inkSoft },
  track: { width: 52, height: 30, borderRadius: 15, backgroundColor: P.paperDeep, borderWidth: 2.5, borderColor: P.ink, padding: 2 },
  knob: { width: 21, height: 21, borderRadius: 11, backgroundColor: P.white, borderWidth: 2, borderColor: P.ink },
});
