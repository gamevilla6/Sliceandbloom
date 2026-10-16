import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameBoard, Hud, Tool } from '@/components/GameBoard';
import { LevelPicker, LoseCard, PressScale, SettingsSheet, Stars, WinCard } from '@/components/GameUi';
import { useProgress } from '@/hooks/useProgress';
import { GardenEngine } from '@/lib/engine';
import { LEVELS } from '@/lib/levels';
import { useSound } from '@/lib/audio';
import { setHapticsEnabled } from '@/lib/haptics';
import { F, P } from '@/constants/theme';

type Sheet = 'none' | 'levels' | 'settings';

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const top = Platform.OS === 'web' ? 67 : insets.top;
  const bottom = Platform.OS === 'web' ? 34 : insets.bottom;
  const { progress, ready, complete, setLast, setSetting, resetAll } = useProgress(LEVELS.length);

  const [idx, setIdx] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [tool, setTool] = useState<Tool>('draw');
  const [hint, setHint] = useState(false);
  const [sheet, setSheet] = useState<Sheet>('none');
  const [hud, setHud] = useState<Hud | null>(null);
  const [overlay, setOverlay] = useState(false);
  const engineRef = useRef<GardenEngine | null>(null);
  const loaded = useRef(false);
  const savedKey = useRef('');

  const playSound = useSound(progress.settings.sound);
  const level = LEVELS[idx];
  const tag = `${level.id}:${attempt}`;
  const live = hud && hud.tag === tag ? hud : null;
  const status = live?.status ?? 'ready';
  const inkMax = level.ink;
  const inkLeft = live ? live.inkLeft : inkMax;
  const canDraw = inkMax > 0;
  const canSlice = level.wood.length > 0 || !!level.ropes?.length;

  useEffect(() => {
    if (ready && !loaded.current) {
      loaded.current = true;
      setIdx(Math.min(progress.last, progress.unlocked, LEVELS.length - 1));
      setAttempt((a) => a + 1);
    }
  }, [ready, progress.last, progress.unlocked]);

  useEffect(() => setHapticsEnabled(progress.settings.haptics), [progress.settings.haptics]);

  useEffect(() => {
    setTool(canDraw ? 'draw' : 'slice');
  }, [idx, canDraw]);

  useEffect(() => {
    if (status === 'won' && live && savedKey.current !== tag) {
      savedKey.current = tag;
      complete(idx, live.stars);
    }
  }, [status, live, tag, idx, complete]);

  useEffect(() => {
    if (status !== 'won' && status !== 'lost') {
      setOverlay(false);
      return;
    }
    const t = setTimeout(() => setOverlay(true), status === 'won' ? 1100 : 650);
    return () => clearTimeout(t);
  }, [status, tag]);

  const onHud = useCallback((h: Hud) => setHud(h), []);

  const load = (i: number) => {
    setIdx(i);
    setLast(i);
    setAttempt((a) => a + 1);
    setHint(false);
    setSheet('none');
    setOverlay(false);
  };
  const reset = () => {
    setAttempt((a) => a + 1);
    setHint(false);
    setOverlay(false);
  };
  const release = () => engineRef.current?.release();
  const undo = () => engineRef.current?.undo();

  const inkPct = inkMax > 0 ? inkLeft / inkMax : 0;
  const caption = hint ? level.hintText : status === 'ready' ? level.lesson : '';

  if (!ready) return <View style={[styles.root, { backgroundColor: P.skyTop }]} />;

  return (
    <View style={[styles.root, { paddingTop: top + 6, paddingBottom: bottom + 8 }]}>
      <View style={styles.topBar}>
        <PressScale onPress={() => setSheet('levels')} testID="open-levels" style={styles.levelPill}>
          <Ionicons name="grid" size={18} color={P.ink} />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.pillSmall}>Bed {level.id} of {LEVELS.length}</Text>
            <Text style={styles.pillName} numberOfLines={1}>{level.name}</Text>
          </View>
        </PressScale>
        <View style={styles.brandBox}>
          <Text style={styles.brandText} numberOfLines={1}>Slice & Bloom</Text>
          <Stars count={progress.stars[idx] ?? 0} size={14} />
        </View>
        <PressScale onPress={() => setSheet('settings')} testID="open-settings" style={styles.roundBtn}>
          <Ionicons name="settings-sharp" size={20} color={P.ink} />
        </PressScale>
      </View>

      <View style={styles.inkRow}>
        <Ionicons name="water" size={16} color={P.ink} />
        <View style={styles.inkTrack}>
          <View style={[styles.inkFill, { width: `${Math.max(0, Math.min(1, inkPct)) * 100}%`, backgroundColor: inkPct < 0.2 ? P.coral : P.mint }]} />
        </View>
        <Text style={styles.inkText}>{inkMax > 0 ? `${Math.round(inkLeft)} ink` : 'no ink'}</Text>
      </View>

      <View style={styles.boardFrame}>
        <GameBoard level={level} attempt={attempt} tool={tool} showHint={hint} guides={progress.settings.guides} paused={sheet !== 'none'} playSound={playSound} engineRef={engineRef} onHud={onHud} />
        {!!caption && (
          <View style={styles.caption} pointerEvents="none">
            <Text style={styles.captionText}>{caption}</Text>
          </View>
        )}
      </View>

      <View style={styles.toolbar}>
        <View style={styles.toolGroup}>
          <ToolBtn icon="brush" label="Draw" active={tool === 'draw'} disabled={!canDraw} onPress={() => setTool('draw')} id="tool-draw" />
          <ToolBtn icon="cut" label="Slice" active={tool === 'slice'} disabled={!canSlice} onPress={() => setTool('slice')} id="tool-slice" />
        </View>
        <View style={styles.toolGroup}>
          <MiniBtn icon="arrow-undo" disabled={!live || live.strokes === 0 || status !== 'ready' && status !== 'running'} onPress={undo} id="undo" />
          <MiniBtn icon="refresh" onPress={reset} id="reset" />
          <MiniBtn icon="bulb" active={hint} onPress={() => setHint((h) => !h)} id="hint" />
        </View>
        <PressScale onPress={release} disabled={status !== 'ready'} testID="release" style={styles.release}>
          <Ionicons name="water" size={26} color={P.white} />
          <Text style={styles.releaseText}>Drop</Text>
        </PressScale>
      </View>

      {sheet === 'levels' && <LevelPicker levels={LEVELS} unlocked={progress.unlocked} stars={progress.stars} current={idx} onPick={load} onClose={() => setSheet('none')} />}
      {sheet === 'settings' && (
        <SettingsSheet
          haptics={progress.settings.haptics}
          guides={progress.settings.guides}
          sound={progress.settings.sound}
          onSound={(v) => setSetting('sound', v)}
          onHaptics={(v) => setSetting('haptics', v)}
          onGuides={(v) => setSetting('guides', v)}
          onReset={() => {
            resetAll();
            load(0);
          }}
          onClose={() => setSheet('none')}
        />
      )}
      {overlay && sheet === 'none' && status === 'won' && (
        <WinCard level={level} stars={live?.stars ?? 1} hasNext={idx + 1 < LEVELS.length} onNext={() => load(idx + 1)} onReplay={reset} onLevels={() => setSheet('levels')} />
      )}
      {overlay && sheet === 'none' && status === 'lost' && (
        <LoseCard
          reason={live?.fail ?? ''}
          onRetry={reset}
          onHint={() => {
            reset();
            setHint(true);
          }}
          onLevels={() => setSheet('levels')}
        />
      )}
    </View>
  );
}

function ToolBtn({ icon, label, active, disabled, onPress, id }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; disabled?: boolean; onPress: () => void; id: string }) {
  return (
    <PressScale onPress={onPress} disabled={disabled} testID={id} style={[styles.toolBtn, active && styles.toolBtnOn]}>
      <Ionicons name={icon} size={22} color={active ? P.white : P.ink} />
      <Text style={[styles.toolLabel, active && { color: P.white }]}>{label}</Text>
    </PressScale>
  );
}
function MiniBtn({ icon, onPress, disabled, active, id }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean; active?: boolean; id: string }) {
  return (
    <PressScale onPress={onPress} disabled={disabled} testID={id} style={[styles.roundBtn, active && { backgroundColor: P.marigold }]}>
      <Ionicons name={icon} size={20} color={P.ink} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.paper, paddingHorizontal: 12 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  levelPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: P.white, borderWidth: 3, borderColor: P.ink, borderRadius: 22, paddingVertical: 6, paddingHorizontal: 10, flexShrink: 1, maxWidth: 150 },
  brandBox: { alignItems: 'center', gap: 2 },
  brandText: { fontFamily: F.bold, fontSize: 15, color: P.ink },
  pillSmall: { fontFamily: F.medium, fontSize: 11, color: P.inkSoft, textTransform: 'uppercase', letterSpacing: 1 },
  pillName: { fontFamily: F.bold, fontSize: 17, color: P.ink },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: P.white, borderWidth: 3, borderColor: P.ink, alignItems: 'center', justifyContent: 'center' },
  inkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 8, paddingHorizontal: 4 },
  inkTrack: { flex: 1, height: 14, borderRadius: 7, backgroundColor: P.white, borderWidth: 2.5, borderColor: P.ink, overflow: 'hidden' },
  inkFill: { height: '100%', borderRadius: 5 },
  inkText: { fontFamily: F.semi, fontSize: 13, color: P.ink, minWidth: 58, textAlign: 'right' },
  boardFrame: { flex: 1, borderRadius: 28, borderWidth: 4, borderColor: P.ink, overflow: 'hidden', backgroundColor: P.skyTop },
  caption: { position: 'absolute', left: 12, right: 12, top: 12, backgroundColor: P.white, borderRadius: 18, borderWidth: 2.5, borderColor: P.ink, paddingVertical: 8, paddingHorizontal: 14 },
  captionText: { fontFamily: F.medium, fontSize: 14, color: P.ink, textAlign: 'center' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 6 },
  toolGroup: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  toolBtn: { alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 18, backgroundColor: P.white, borderWidth: 3, borderColor: P.ink },
  toolBtnOn: { backgroundColor: P.dropDeep },
  toolLabel: { fontFamily: F.semi, fontSize: 10, color: P.ink },
  release: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P.coral, borderWidth: 3, borderColor: P.ink, borderRadius: 28, paddingHorizontal: 16, height: 56 },
  releaseText: { fontFamily: F.bold, fontSize: 18, color: P.white },
});
