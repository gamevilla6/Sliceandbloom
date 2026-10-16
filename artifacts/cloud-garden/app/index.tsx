import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard, Hud, Tool } from '@/components/GameBoard';
import { LevelPicker, LoseCard, PressScale, SettingsSheet, Stars, WinCard } from '@/components/GameUi';
import { useLayoutMode } from '@/components/layout';
import { useProgress } from '@/hooks/useProgress';
import { GardenEngine } from '@/lib/engine';
import { LEVELS } from '@/lib/levels';
import { useSound } from '@/lib/audio';
import { setHapticsEnabled } from '@/lib/haptics';
import { F, P, R } from '@/constants/theme';

type Sheet = 'none' | 'levels' | 'settings';

export default function GameScreen() {
  'use no memo';
  // Retry is an explicit useMemo dependency even though its factory only reads level.
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
  // The world belongs to the screen, not the responsive board's mount point.
  const gameEngine = useMemo(() => new GardenEngine(level), [level, attempt]);
  useEffect(() => () => gameEngine.dispose(), [gameEngine]);
  const tag = `${level.id}:${attempt}`;
  const live = hud && hud.tag === tag ? hud : null;
  const status = live?.status ?? 'ready';
  const inkMax = level.ink;
  const inkLeft = live ? live.inkLeft : inkMax;
  const canDraw = inkMax > 0;
  const canSlice = level.wood.length > 0 || !!level.ropes?.length || level.stones.length > 0 || !!level.weights?.length;

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
  const { landscape, compact, panelW, availW, insets } = useLayoutMode();
  const tightTools = !landscape && availW < 380;
  const unit = compact ? 48 : 56;
  const showBrand = !landscape && availW >= 360;

  if (!ready) return <View style={[styles.root, { backgroundColor: P.skyTop }]} />;

  const header = (
    <View style={styles.topBar} testID="region-header">
      <PressScale onPress={() => setSheet('levels')} testID="open-levels" label={`Garden beds. Bed ${level.id} of ${LEVELS.length}, ${level.name}`} containerStyle={styles.pillSlot} style={styles.levelPill}>
        <Ionicons name="grid" size={18} color={P.ink} />
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <Text style={styles.pillSmall} numberOfLines={1}>Bed {level.id} of {LEVELS.length}</Text>
          <Text style={styles.pillName} numberOfLines={1}>{level.name}</Text>
        </View>
      </PressScale>
      {!landscape && (
        <View style={styles.brandBox}>
          {showBrand && <Text style={[styles.brandText, { color: P.white }]} numberOfLines={1}>Slice & Bloom</Text>}
          <Stars count={progress.stars[idx] ?? 0} size={14} />
        </View>
      )}
      <PressScale onPress={() => setSheet('settings')} testID="open-settings" label="Settings" style={styles.roundBtn}>
        <Ionicons name="settings-sharp" size={20} color={P.ink} />
      </PressScale>
    </View>
  );
  const ink = (
    <View style={styles.inkRow} testID="region-ink">
      <Ionicons name="water" size={16} color={P.ink} />
      <View style={styles.inkTrack}>
        <View style={[styles.inkFill, { width: `${Math.max(0, Math.min(1, inkPct)) * 100}%`, backgroundColor: inkPct < 0.2 ? P.coral : P.mint }]} />
      </View>
      <Text style={styles.inkText}>{inkMax > 0 ? `${Math.round(inkLeft)} ink` : 'no ink'}</Text>
      <Text style={styles.moveText} testID="move-count" accessibilityLabel={`${live?.actions ?? 0} moves used`}>
        {live?.actions ?? 0} moves
      </Text>
    </View>
  );
  const captionEl = (!!caption || !landscape) && (
    <View style={[styles.caption, !caption && { opacity: 0 }, !landscape && { minHeight: compact ? 44 : 52 }]} testID="region-caption" accessibilityLiveRegion="polite">
      <Text style={[styles.captionText, compact && { fontSize: 12.5 }]}>{caption || ' '}</Text>
    </View>
  );
  const tools = (
    <View style={[styles.toolbar, landscape && { justifyContent: 'center' }]} testID="region-tools">
      <View style={[styles.toolGroup, tightTools && { gap: 4 }]}>
        <ToolBtn size={tightTools ? 44 : unit} icon="brush" label="Draw" active={tool === 'draw'} disabled={!canDraw} onPress={() => setTool('draw')} id="tool-draw" />
        <ToolBtn size={tightTools ? 44 : unit} icon="cut" label="Slice" active={tool === 'slice'} disabled={!canSlice} onPress={() => setTool('slice')} id="tool-slice" />
      </View>
      <View style={[styles.toolGroup, tightTools && { gap: 4 }]}>
        <MiniBtn name="Undo" icon="arrow-undo" disabled={!live || live.strokes === 0 || (status !== 'ready' && status !== 'running')} onPress={undo} id="undo" />
        <MiniBtn name="Reset level" icon="refresh" onPress={reset} id="reset" />
        <MiniBtn name={hint ? 'Hide hint' : 'Show hint'} icon="bulb" active={hint} onPress={() => setHint((h) => !h)} id="hint" />
      </View>
      <PressScale onPress={release} disabled={status !== 'ready'} testID="release" label="Drop water" containerStyle={[styles.releaseSlot, tightTools && { flexGrow: 0, flexBasis: 44, minWidth: 44 }]} style={[styles.release, { height: tightTools ? 44 : unit }, tightTools && { paddingHorizontal: 0 }]}>
        <Ionicons name="water" size={24} color={P.white} />
        {!tightTools && <Text style={styles.releaseText}>Drop</Text>}
      </PressScale>
    </View>
  );
  const frame = (
    <View style={styles.stageArea} testID="region-stage">
      <GameBoard key={tag} engine={gameEngine} level={level} attempt={attempt} tool={tool} showHint={hint} guides={progress.settings.guides} paused={sheet !== 'none'} playSound={playSound} engineRef={engineRef} onHud={onHud} />
    </View>
  );

  return (
    <View style={styles.outer}>
      {landscape ? (
        <View style={[styles.root, styles.rootRow, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 6, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]} testID="layout-landscape">
          <View style={styles.landGroup}>
            <View style={{ width: panelW }} testID="region-panel">
              <ScrollView contentContainerStyle={[styles.panelContent, compact && { gap: 4, paddingVertical: 0 }]} showsVerticalScrollIndicator={false}>
                {!compact && <Text style={styles.brandText} numberOfLines={1}>Slice & Bloom</Text>}
                {header}
                {!compact && <Stars count={progress.stars[idx] ?? 0} size={16} />}
                {ink}
                {captionEl}
                {tools}
              </ScrollView>
            </View>
            {frame}
          </View>
        </View>
      ) : (
        <View style={[styles.root, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 8, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]} testID="layout-portrait">
          <View style={styles.column}>
            {header}
            {ink}
            {frame}
            {captionEl}
            {tools}
          </View>
        </View>
      )}

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

function ToolBtn({ icon, label, active, disabled, onPress, id, size }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; disabled?: boolean; onPress: () => void; id: string; size: number }) {
  return (
    <PressScale onPress={onPress} disabled={disabled} testID={id} label={`${label} tool`} selected={active} style={[styles.toolBtn, { width: size, height: size }, active && styles.toolBtnOn]}>
      <Ionicons name={icon} size={22} color={active ? P.white : P.ink} />
      <Text style={[styles.toolLabel, active && { color: P.white }]}>{label}</Text>
    </PressScale>
  );
}
function MiniBtn({ icon, onPress, disabled, active, id, name }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean; active?: boolean; id: string; name: string }) {
  return (
    <PressScale onPress={onPress} disabled={disabled} testID={id} label={name} selected={active} style={[styles.roundBtn, active && { backgroundColor: P.marigold }]}>
      <Ionicons name={icon} size={20} color={P.ink} />
    </PressScale>
  );
}

const lift = { shadowColor: P.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 } as const;
const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: P.paper },
  root: { flex: 1, backgroundColor: P.paper },
  rootRow: { alignItems: 'stretch', justifyContent: 'center' },
  column: { flex: 1, width: '100%', alignSelf: 'center', minHeight: 0 },
  landGroup: { flex: 1, flexDirection: 'row', alignSelf: 'center', width: '100%', gap: 14, minHeight: 0 },
  panelContent: { flexGrow: 1, justifyContent: 'center', gap: 10, paddingVertical: 6 },
  stageArea: { flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', backgroundColor: P.skyTop },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pillSlot: { flexShrink: 1, flexGrow: 1, minWidth: 0 },
  levelPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: P.marigold, borderWidth: 3, borderColor: P.ink, borderRadius: R.btn, minHeight: 48, paddingVertical: 4, paddingHorizontal: 10, ...lift },
  brandBox: { alignItems: 'center', gap: 2, flexShrink: 0, backgroundColor: P.drop, borderWidth: 3, borderColor: P.ink, borderRadius: R.btn, paddingHorizontal: 10, paddingVertical: 3, ...lift },
  brandText: { fontFamily: F.bold, fontSize: 15, color: P.ink, letterSpacing: 0.3 },
  pillSmall: { fontFamily: F.semi, fontSize: 10.5, color: P.ink, textTransform: 'uppercase', letterSpacing: 1 },
  pillName: { fontFamily: F.bold, fontSize: 17, color: P.ink },
  roundBtn: { width: 44, height: 44, borderRadius: R.btn, backgroundColor: P.white, borderWidth: 3, borderColor: P.ink, alignItems: 'center', justifyContent: 'center', ...lift },
  inkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: P.white, borderRadius: R.btn, borderWidth: 3, borderColor: P.ink },
  inkTrack: { flex: 1, height: 16, borderRadius: 8, backgroundColor: P.paperDeep, borderWidth: 2.5, borderColor: P.ink, overflow: 'hidden' },
  inkFill: { height: '100%', borderRadius: 5 },
  inkText: { fontFamily: F.bold, fontSize: 13, color: P.ink, minWidth: 58, textAlign: 'right' },
  moveText: { fontFamily: F.semi, fontSize: 11, color: P.inkSoft, paddingLeft: 7, borderLeftWidth: 2, borderLeftColor: P.inkSoft },
  caption: { backgroundColor: P.drop, borderRadius: R.btn, borderWidth: 3, borderColor: P.ink, paddingVertical: 6, paddingHorizontal: 12, marginTop: 10, justifyContent: 'center' },
  captionText: { fontFamily: F.semi, fontSize: 14, color: P.white, textAlign: 'center' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, columnGap: 8, rowGap: 8 },
  toolGroup: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  toolBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: R.btn, backgroundColor: P.white, borderWidth: 3, borderColor: P.ink, ...lift },
  toolBtnOn: { backgroundColor: P.drop },
  toolLabel: { fontFamily: F.bold, fontSize: 10, color: P.ink },
  releaseSlot: { flexGrow: 1, flexBasis: 96, minWidth: 96 },
  release: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: P.coral, borderWidth: 3, borderColor: P.ink, borderRadius: R.btn, paddingHorizontal: 14, ...lift, shadowOffset: { width: 0, height: 5 } },
  releaseText: { fontFamily: F.bold, fontSize: 19, color: P.white, textTransform: 'uppercase', letterSpacing: 1 },
});
