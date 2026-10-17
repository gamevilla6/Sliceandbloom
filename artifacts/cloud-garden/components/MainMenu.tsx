import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Platform } from 'react-native';
import { Pressable } from 'react-native';
import { F, P, R } from '../constants/theme';
import { GENESIS_LEVELS } from '../lib/genesisLevels';
import { HARDCORE_LEVELS } from '../lib/hardcoreLevels';
import { LEVELS } from '../lib/levels';
import { SINGULARITY_LEVELS } from '../lib/singularityLevels';
import { VOID_LEVELS } from '../lib/voidLevels';
import { Btn, Card } from './GameUi';

export type MenuMode = 'classic' | 'hardcore' | 'genesis' | 'void' | 'singularity';

const MODES: { id: MenuMode; name: string; blurb: string; count: number; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'classic', name: 'Classic', blurb: 'The garden campaign', count: LEVELS.length, icon: 'flower', color: P.leaf },
  { id: 'hardcore', name: 'Hardcore', blurb: 'Tighter, harder beds', count: HARDCORE_LEVELS.length, icon: 'flame', color: P.coral },
  { id: 'genesis', name: 'Genesis', blurb: 'Locks, pulleys, twin buds', count: GENESIS_LEVELS.length, icon: 'git-network', color: P.marigold },
  { id: 'void', name: 'Void', blurb: 'Deaths count here', count: VOID_LEVELS.length, icon: 'skull', color: P.stoneDeep },
  { id: 'singularity', name: 'Singularity', blurb: 'Paradox puzzles', count: SINGULARITY_LEVELS.length, icon: 'infinite', color: P.drop },
];

export function MainMenu({ mode, currentLevel, onContinue, onSelectMode, onRewards }: {
  mode: MenuMode;
  currentLevel: number;
  onContinue: () => void;
  onSelectMode: (mode: MenuMode) => void;
  onRewards: () => void;
}) {
  const cur = MODES.find(m => m.id === mode) ?? MODES[0];
  return (
    <Card title="Slice & Bloom" expanded showBanner={Platform.OS !== 'web'} onClose={onContinue}>
      <View testID="main-menu" style={s.wrap}>
        <Text style={s.tag}>No ads during a puzzle. Optional videos offer boosts.</Text>
        <Btn tone="campaign" kind="primary" icon="play" label={`Continue ${cur.name} - Level ${currentLevel}`} onPress={onContinue} testID="menu-continue" />
        <Text style={s.head}>Choose a mode</Text>
        <View style={s.grid}>
          {MODES.map(m => (
            <Pressable key={m.id} testID={`menu-mode-${m.id}`} accessibilityRole="button" accessibilityLabel={`${m.name}, ${m.count} levels`} onPress={() => onSelectMode(m.id)}
              style={({ pressed }) => [s.tile, m.id === mode && s.tileOn, pressed && { transform: [{ scale: 0.97 }] }]}>
              <View style={[s.dot, { backgroundColor: m.color }]}>
                <Ionicons name={m.icon} size={18} color={P.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={s.name}>{m.name}</Text>
                <Text numberOfLines={1} style={s.sub}>{m.blurb}</Text>
              </View>
              <Text style={s.count}>{m.count}</Text>
            </Pressable>
          ))}
        </View>
        <Btn tone="campaign" kind="ghost" icon="gift" label="Rewards" onPress={onRewards} testID="menu-rewards" />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10 },
  tag: { fontFamily: F.medium, fontSize: 13, color: P.inkSoft, textAlign: 'center' },
  head: { fontFamily: F.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: P.inkSoft, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexGrow: 1, flexBasis: 240, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: R.btn, backgroundColor: P.white, borderWidth: 2, borderColor: P.paperDeep, minHeight: 56 },
  tileOn: { borderColor: P.ink },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: F.bold, fontSize: 16, color: P.ink },
  sub: { fontFamily: F.regular, fontSize: 12, color: P.inkSoft },
  count: { fontFamily: F.bold, fontSize: 18, color: P.ink },
});
