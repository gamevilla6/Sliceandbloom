import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard, Hud, Tool } from '@/components/GameBoard';
import { LevelPicker, LoseCard, PressScale, SettingsSheet, Stars, WinCard } from '@/components/GameUi';
import { useLayoutMode } from '@/components/layout';
import { HardcoreFail, HardcoreHud, Mode, ModeSwitch, VoidHud } from '@/components/HardcoreLayer';
import { useProgress } from '@/hooks/useProgress';
import { GardenEngine } from '@/lib/engine';
import { LEVELS } from '@/lib/levels';
import { HARDCORE_LEVELS } from '@/lib/hardcoreLevels';
import { GENESIS_LEVELS } from '@/lib/genesisLevels';
import { VOID_LEVELS } from '@/lib/voidLevels';
import { useSound } from '@/lib/audio';
import { setHapticsEnabled } from '@/lib/haptics';
import { F, P, R, VD } from '@/constants/theme';
import { hintReducer, INITIAL_HINT_VIEW } from '@/lib/hints';
import { useRewardedRetry } from '@/lib/rewardedAds';

type Sheet = 'none' | 'levels' | 'settings';

export default function GameScreen() {
  'use no memo';
  // Retry is an explicit useMemo dependency even though its factory only reads level.
  const classic = useProgress(LEVELS.length);
  const hard = useProgress(HARDCORE_LEVELS.length, 'cloud-garden:hardcore:v1');
  const gen = useProgress(GENESIS_LEVELS.length, 'cloud-garden:genesis:v1');
  const vd = useProgress(VOID_LEVELS.length, 'cloud-garden:void:v1');
  const [mode, setMode] = useState<Mode>('classic');
  const hardcore = mode !== 'classic';
  const isGenesis = mode === 'genesis';
  const isVoid = mode === 'void';
  const arcade = isVoid ? vd : isGenesis ? gen : hard;
  const active = hardcore ? arcade : classic;
  const ready = classic.ready && hard.ready && gen.ready && vd.ready;
  const { setLast } = active;
  const hardComplete = arcade.complete;
  const classicComplete = classic.complete;
  const { setSetting } = classic;
  // Settings are shared and always live on the classic record.
  const progress = { ...active.progress, settings: classic.progress.settings };
  const levels = isVoid ? VOID_LEVELS : isGenesis ? GENESIS_LEVELS : hardcore ? HARDCORE_LEVELS : LEVELS;

  const [idx, setIdx] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [tool, setTool] = useState<Tool>('draw');
  const [hintView, dispatchHint] = useReducer(hintReducer, INITIAL_HINT_VIEW);
  const hint = hintView.visible;
  const [sheet, setSheet] = useState<Sheet>('none');
  const [hud, setHud] = useState<Hud | null>(null);
  const [overlay, setOverlay] = useState(false);
  const engineRef = useRef<GardenEngine | null>(null);
  const loaded = useRef(false);
  const savedKey = useRef('');
  const deathKey = useRef('');

  const playSound = useSound(progress.settings.sound);
  const level = levels[idx];
  const hc = level.hardcore;
  // The world belongs to the screen, not the responsive board's mount point.
  const gameEngine = useMemo(() => new GardenEngine(level), [level, attempt]);
  useEffect(() => () => gameEngine.dispose(), [gameEngine]);
  const tag = `${mode}:${level.id}:${attempt}`;
  const live = hud && hud.tag === tag ? hud : null;
  const status = live?.status ?? 'ready';
  const thermalFailure = !!level.thermalZone && status === 'lost' && !!live?.fail.startsWith('Thermal');
  const inkMax = gameEngine.inkMax;
  const inkLeft = live ? live.inkLeft : inkMax;
  const canDraw = inkMax > 0;
  const canSlice = level.wood.length > 0 || !!level.ropes?.length || level.stones.length > 0 || !!level.weights?.length;

  useEffect(() => {
    if (ready && !loaded.current) {
      loaded.current = true;
      setIdx(Math.min(progress.last, progress.unlocked, levels.length - 1));
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
      if (hardcore) hardComplete(idx, live.stars, { score: live.score, time: live.elapsed });
      else classicComplete(idx, live.stars);
    }
  }, [status, live, tag, idx, hardcore, hardComplete, classicComplete]);

  // Void deaths: exactly once per lost attempt, before the 450ms auto retry.
  const recordDeath = vd.recordDeath;
  useEffect(() => {
    if (isVoid && status === 'lost' && live && deathKey.current !== tag) {
      deathKey.current = tag;
      recordDeath(idx);
    }
  }, [isVoid, status, live, tag, idx, recordDeath]);

  useEffect(() => {
    if (status !== 'won' && status !== 'lost') {
      setOverlay(false);
      return;
    }
    const t = setTimeout(() => setOverlay(true), status === 'won' ? 1100 : (hardcore || thermalFailure) ? 0 : 650);
    return () => clearTimeout(t);
  }, [status, tag, hardcore, thermalFailure]);

  const resetRef = useRef<() => void>(() => {});
  // Hardcore failures retry themselves; an open sheet suspends that.
  useEffect(() => {
    const thermal = !!level.thermalZone && !!live?.fail.includes('Thermal');
    if (!(hardcore || thermal) || status !== 'lost' || sheet !== 'none') return;
    const t = setTimeout(() => resetRef.current(), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hardcore, status, sheet, tag, level, live?.fail]);

  const sheetRef = useRef(sheet);
  sheetRef.current = sheet;
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key !== 'r' && e.key !== 'R') return;
      if (sheetRef.current !== 'none') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      resetRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const onHud = useCallback((h: Hud) => setHud(h), []);

  const load = (i: number) => {
    setIdx(i);
    setLast(i);
    setAttempt((a) => a + 1);
    dispatchHint({ type: 'reset' });
    setSheet('none');
    setOverlay(false);
  };
  const reset = () => {
    setAttempt((a) => a + 1);
    dispatchHint({ type: 'reset' });
    setOverlay(false);
  };
  resetRef.current = reset;
  const canOfferRewardedRetry = overlay && sheet === 'none' && status === 'lost' && !hardcore && !thermalFailure;
  const rewardedRetry = useRewardedRetry(canOfferRewardedRetry, reset);
  const switchMode = (m: Mode) => {
    if (m === mode) return;
    const p = m === 'void' ? vd.progress : m === 'genesis' ? gen.progress : m === 'hardcore' ? hard.progress : classic.progress;
    const n = m === 'void' ? VOID_LEVELS.length : m === 'genesis' ? GENESIS_LEVELS.length : m === 'hardcore' ? HARDCORE_LEVELS.length : LEVELS.length;
    setMode(m);
    setIdx(Math.min(p.last, p.unlocked, n - 1));
    setAttempt((a) => a + 1);
    dispatchHint({ type: 'reset' });
    setSheet('none');
    setOverlay(false);
    setHud(null);
  };
  const release = () => engineRef.current?.release();
  const undo = () => engineRef.current?.undo();

  const inkPct = inkMax > 0 ? inkLeft / inkMax : 0;
  const rules = 'First touch starts the timer. Undo: no refunds.';
  const caption = hint ? level.hintText : status === 'ready' ? (hc ? `${level.lesson.replace(/^HARDCORE · /, '')} ${rules}` : level.lesson) : '';
  const currentHint = level.hint[hintView.step];
  const noun = isVoid ? 'Void' : isGenesis ? 'Challenge' : hardcore ? 'Hardcore' : 'Bed';
  const modeName = isVoid ? 'The Void Protocol' : isGenesis ? 'The Genesis Gauntlet' : hardcore ? 'Hardcore levels' : 'Garden beds';
  const vr = level.voidProtocol;
  const vProg = vd.progress;
  const deathsHere = vProg.deaths[String(idx)] ?? 0;
  const badgeHere = vProg.badges[String(idx)];
  const maxMoves = hc?.maxStrokes ?? 0;
  const { landscape, compact, panelW, availW, insets } = useLayoutMode();
  const tightTools = !landscape && availW < 380;
  const unit = compact ? 48 : 56;
  const showBrand = !landscape && availW >= 360;

  if (!ready) return <View style={[styles.root, { backgroundColor: P.skyTop }]} />;

  const header = (
    <View style={styles.topBar} testID="region-header">
      <PressScale onPress={() => setSheet('levels')} testID="open-levels" label={`${modeName}. ${noun} ${level.id} of ${levels.length}, ${level.name}`} containerStyle={styles.pillSlot} style={[styles.levelPill, isVoid && styles.vBtn, isVoid && { backgroundColor: VD.panelHi }]}>
        <Ionicons name="grid" size={18} color={isVoid ? VD.text : P.ink} />
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <Text style={[styles.pillSmall, isVoid && { color: VD.red }]} numberOfLines={1}>{noun} {level.id} of {levels.length}</Text>
          <Text style={[styles.pillName, isVoid && { color: VD.text }]} numberOfLines={1}>{level.name}</Text>
        </View>
      </PressScale>
      {!landscape && (
        <View style={[styles.brandBox, isVoid && styles.vBtn]}>
          {showBrand && <Text style={[styles.brandText, { color: P.white }]} numberOfLines={1}>Slice & Bloom</Text>}
          <Stars count={progress.stars[idx] ?? 0} size={14} />
        </View>
      )}
      <PressScale onPress={() => setSheet('settings')} testID="open-settings" label="Settings" style={[styles.roundBtn, isVoid && styles.vBtn]}>
        <Ionicons name="settings-sharp" size={20} color={isVoid ? VD.text : P.ink} />
      </PressScale>
    </View>
  );
  const modeBar = <ModeSwitch mode={mode} onChange={switchMode} tight={availW < 380} themed={isVoid} />;
  const mods: string[] = [];
  if (isGenesis) {
    if (level.countdownTimer) mods.push(`${level.countdownTimer}s countdown`);
    if (level.invisibleObstacles) mods.push('Hidden: touch to reveal');
    if (level.hyperSensitiveScale) mods.push(`Drop ${Math.round(level.hyperSensitiveScale * 100)}% size`);
    const cap = level.strictInkLength ?? level.inkLimitPercent;
    if (cap) mods.push(`Ink ${Math.round(cap <= 1 ? cap * 100 : cap)}%`);
  }
  const vmods: string[] = [];
  if (vr) {
    if (vr.shadow) vmods.push('Shadow');
    vmods.push(`Decay ${vr.decaySeconds}s`);
    if (vr.gravityMultiplier !== 1 || vr.gravityAmplitude > 0) vmods.push(`Gravity x${vr.gravityMultiplier}${vr.gravityAmplitude > 0 ? ' pulse' : ''}`);
    vmods.push(`Speed cap ${vr.maxVelocity}`);
  }
  if (!hardcore) {
    if (level.magneticField || level.magneticZones?.length) mods.push('Magnet field');
    if (level.thermalZone) mods.push('Heat 2s limit');
    if (level.rubeGoldbergChain) mods.push('Linked chain');
  }
  const modBadges = mods.length > 0 ? (
    <View style={styles.modRow} testID={isGenesis ? 'genesis-modifiers' : 'level-modifiers'} accessibilityLabel={`Challenge modifiers: ${mods.join(', ')}`}>
      {mods.map((m) => <Text key={m} style={styles.modChip}>{m}</Text>)}
    </View>
  ) : null;
  const hudCore = hc ? (
    <HardcoreHud started={live?.started ?? false} timeLeft={live?.timeLeft ?? hc.timeLimit} limit={hc.timeLimit} elapsed={live?.elapsed ?? 0} gold={hc.goldTime} par={level.par} moves={live?.actions ?? 0} maxMoves={maxMoves} gravity={live?.gravityRemaining ?? 0} nextFlip={level.gravityFlipInterval ? level.gravityFlipInterval - ((live?.cycleTime ?? 0) % level.gravityFlipInterval) : undefined} themed={isVoid} />
  ) : null;
  const hudBar = hc ? (isVoid ? <VoidHud deaths={deathsHere} badge={badgeHere} mods={vmods} timer={hudCore} /> : <View>{hudCore}{modBadges}</View>) : null;
  const ink = (
    <View style={[styles.inkRow, isVoid && styles.vBtn]} testID="region-ink">
      <Ionicons name="water" size={16} color={isVoid ? VD.purple : P.ink} />
      <View style={[styles.inkTrack, isVoid && { backgroundColor: VD.bgDeep, borderColor: VD.line }]}>
        <View style={[styles.inkFill, { width: `${Math.max(0, Math.min(1, inkPct)) * 100}%`, backgroundColor: inkPct < 0.2 ? (isVoid ? VD.red : P.coral) : isVoid ? VD.purple : P.mint }]} />
      </View>
      <Text style={[styles.inkText, isVoid && { color: VD.text }]}>{inkMax > 0 ? `${Math.round(inkLeft)} ink` : 'no ink'}</Text>
      {!!level.inkLimitPercent && (
        <Text style={styles.capText} testID="ink-cap" accessibilityLabel={`Ink capped at ${level.inkLimitPercent} percent`}>CAP {level.inkLimitPercent}%</Text>
      )}
      {!hc && (
        <Text style={styles.moveText} testID="move-count" accessibilityLabel={`${live?.actions ?? 0} moves used`}>
          {live?.actions ?? 0} moves
        </Text>
      )}
    </View>
  );
  const captionEl = (!!caption || !landscape) && (
    <View style={[styles.caption, isVoid && { backgroundColor: VD.panel, borderColor: VD.purple }, !caption && { opacity: 0 }, !landscape && { minHeight: compact ? 44 : 52 }]} testID="region-caption" accessibilityLiveRegion="polite">
      {hint && currentHint && (
        <View style={styles.hintHeading}>
          <Ionicons name={currentHint.kind === 'draw' ? 'brush' : 'cut'} size={17} color={P.marigold} />
          <Text style={styles.hintTitle} testID="hint-step">
            Step {hintView.step + 1} of {level.hint.length} · {currentHint.kind === 'draw' ? 'Draw' : 'Slice'}
          </Text>
        </View>
      )}
      <Text style={[styles.captionText, compact && { fontSize: 12.5 }]} numberOfLines={landscape ? undefined : 3}>{caption || ' '}</Text>
      {hint && level.hint.length > 1 && (
        <View style={styles.hintControls} testID="hint-controls">
          <MiniBtn dark={isVoid} name="Previous hint step" icon="chevron-back" disabled={hintView.step === 0} onPress={() => dispatchHint({ type: 'previous', count: level.hint.length })} id="hint-previous" />
          <PressScale onPress={() => dispatchHint({ type: 'overview' })} testID="hint-overview" label={hintView.overview ? 'Show only the current hint path' : 'Show all hint paths'} selected={hintView.overview} style={styles.hintOverview}>
            <Text style={styles.hintOverviewText}>{hintView.overview ? 'Current path' : 'All paths'}</Text>
          </PressScale>
          <MiniBtn dark={isVoid} name="Next hint step" icon="chevron-forward" disabled={hintView.step === level.hint.length - 1} onPress={() => dispatchHint({ type: 'next', count: level.hint.length })} id="hint-next" />
        </View>
      )}
    </View>
  );
  const tools = (
    <View style={[styles.toolbar, landscape && { justifyContent: 'center' }]} testID="region-tools">
      <View style={[styles.toolGroup, tightTools && { gap: 4 }]}>
        <ToolBtn dark={isVoid} size={tightTools ? 44 : unit} icon="brush" label="Draw" active={tool === 'draw'} disabled={!canDraw} onPress={() => setTool('draw')} id="tool-draw" />
        <ToolBtn dark={isVoid} size={tightTools ? 44 : unit} icon="cut" label="Slice" active={tool === 'slice'} disabled={!canSlice} onPress={() => setTool('slice')} id="tool-slice" />
      </View>
      <View style={[styles.toolGroup, tightTools && { gap: 4 }]}>
        <MiniBtn dark={isVoid} name="Undo" icon="arrow-undo" disabled={!live || live.strokes === 0 || (status !== 'ready' && status !== 'running')} onPress={undo} id="undo" />
        <MiniBtn dark={isVoid} name={Platform.OS === 'web' ? 'Retry level (R)' : 'Retry level'} icon="refresh" onPress={reset} id="reset" />
        <MiniBtn dark={isVoid} name={hint ? 'Hide hint' : 'Show hint'} icon="bulb" active={hint} disabled={level.hint.length === 0} onPress={() => dispatchHint({ type: 'toggle' })} id="hint" />
      </View>
      <PressScale onPress={release} disabled={status !== 'ready'} testID="release" label="Drop water" containerStyle={[styles.releaseSlot, tightTools && { flexGrow: 0, flexBasis: 44, minWidth: 44 }]} style={[styles.release, isVoid && { backgroundColor: VD.redDeep, borderColor: VD.red, shadowColor: VD.red }, { height: tightTools ? 44 : unit }, tightTools && { paddingHorizontal: 0 }]}>
        <Ionicons name="water" size={24} color={P.white} />
        {!tightTools && <Text style={styles.releaseText}>Drop</Text>}
      </PressScale>
    </View>
  );
  const frame = (
    <View style={[styles.stageArea, isVoid && { backgroundColor: VD.bgDeep, borderWidth: 2, borderColor: VD.red }]} testID="region-stage">
      <GameBoard key={tag} modeKey={mode} engine={gameEngine} level={level} attempt={attempt} tool={tool} showHint={hint} hintStep={hintView.step} hintOverview={hintView.overview} guides={progress.settings.guides} paused={sheet !== 'none'} playSound={playSound} engineRef={engineRef} onHud={onHud} />
    </View>
  );

  return (
    <View style={[styles.outer, isVoid && { backgroundColor: VD.bg }]}>
      {landscape ? (
        <View style={[styles.root, isVoid && { backgroundColor: VD.bg }, styles.rootRow, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 6, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]} testID="layout-landscape">
          <View style={styles.landGroup}>
             <View style={{ width: panelW, minHeight: 0, flexShrink: 0 }} testID="region-panel">
              <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={[styles.panelContent, compact && { gap: 4, paddingVertical: 0 }]} showsVerticalScrollIndicator testID="panel-scroll">
                {!compact && <Text style={styles.brandText} numberOfLines={1}>Slice & Bloom</Text>}
                {header}
                {modeBar}
                {!hc && modBadges}
                {!compact && <Stars count={progress.stars[idx] ?? 0} size={16} />}
                {hudBar}
                {ink}
                {captionEl}
              </ScrollView>
              {tools}
            </View>
            {frame}
          </View>
        </View>
      ) : (
        <View style={[styles.root, isVoid && { backgroundColor: VD.bg }, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 8, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]} testID="layout-portrait">
          <View style={styles.column}>
            {header}
            {modeBar}
            {!hc && modBadges}
            {ink}
            {hudBar}
            {frame}
            {captionEl}
            {tools}
          </View>
        </View>
      )}

      {sheet === 'levels' && <LevelPicker deaths={vProg.deaths} badges={vProg.badges} title={isVoid ? 'Hardcore: The Void Protocol' : isGenesis ? 'The Genesis Gauntlet' : hardcore ? 'Hardcore' : 'Garden beds'} noun={noun} levels={levels} unlocked={progress.unlocked} stars={progress.stars} scores={hardcore ? arcade.progress.scores : undefined} bestTimes={hardcore ? arcade.progress.bestTimes : undefined} current={idx} onPick={load} onClose={() => setSheet('none')} />}
      {sheet === 'settings' && (
        <SettingsSheet
          dark={isVoid}
          haptics={progress.settings.haptics}
          guides={progress.settings.guides}
          sound={progress.settings.sound}
          onSound={(v) => setSetting('sound', v)}
          onHaptics={(v) => setSetting('haptics', v)}
          onGuides={(v) => setSetting('guides', v)}
          resetLabel={isVoid ? 'Reset Void progress' : isGenesis ? 'Reset Genesis progress' : hardcore ? 'Reset Hardcore progress' : 'Reset progress'}
          onReset={() => {
            active.resetAll();
            load(0);
          }}
          onClose={() => setSheet('none')}
        />
      )}
      {overlay && sheet === 'none' && status === 'won' && (
        <WinCard dark={isVoid} badge={badgeHere} deaths={isVoid ? deathsHere : undefined} level={level} stars={live?.stars ?? 1} score={hardcore ? live?.score : undefined} highScore={hardcore ? arcade.progress.scores[String(idx)] : undefined} bestTime={hardcore ? arcade.progress.bestTimes[String(idx)] : undefined} masterclass={isGenesis} elapsed={live?.elapsed} hasNext={idx + 1 < levels.length} onNext={() => load(idx + 1)} onReplay={reset} onLevels={() => setSheet('levels')} />
      )}
      {overlay && sheet === 'none' && status === 'lost' && (hardcore || thermalFailure) && <HardcoreFail themed={isVoid} title={isVoid ? 'Voided' : hardcore ? 'Wilted' : 'Overheated'} reason={live?.fail ?? ''} onRetry={reset} />}
      {overlay && sheet === 'none' && status === 'lost' && !hardcore && !(level.thermalZone && live?.fail.includes('Thermal')) && (
        <LoseCard
          reason={live?.fail ?? ''}
          onRetry={reset}
          rewardedRetry={rewardedRetry}
          onHint={() => {
            reset();
            dispatchHint({ type: 'show' });
          }}
          onLevels={() => setSheet('levels')}
        />
      )}
    </View>
  );
}

function ToolBtn({ dark, icon, label, active, disabled, onPress, id, size }: { dark?: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; disabled?: boolean; onPress: () => void; id: string; size: number }) {
  return (
    <PressScale onPress={onPress} disabled={disabled} testID={id} label={`${label} tool`} selected={active} style={[styles.toolBtn, dark && styles.vBtn, { width: size, height: size }, active && (dark ? { backgroundColor: VD.purpleDeep, borderColor: VD.magenta } : styles.toolBtnOn)]}>
      <Ionicons name={icon} size={22} color={active || dark ? P.white : P.ink} />
      <Text style={[styles.toolLabel, dark && { color: VD.text }, active && { color: P.white }]}>{label}</Text>
    </PressScale>
  );
}
function MiniBtn({ dark, icon, onPress, disabled, active, id, name }: { dark?: boolean; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean; active?: boolean; id: string; name: string }) {
  return (
    <PressScale onPress={onPress} disabled={disabled} testID={id} label={name} selected={active} style={[styles.roundBtn, dark && styles.vBtn, active && { backgroundColor: dark ? VD.purpleDeep : P.marigold }]}>
      <Ionicons name={icon} size={20} color={dark ? VD.text : P.ink} />
    </PressScale>
  );
}

const lift = { shadowColor: P.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 } as const;
const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: P.paper },
  root: { flex: 1, backgroundColor: P.paper },
  rootRow: { alignItems: 'stretch', justifyContent: 'center' },
  column: { flex: 1, width: '100%', alignSelf: 'center', minHeight: 0 },
  landGroup: { flex: 1, flexDirection: 'row', alignSelf: 'stretch', width: '100%', gap: 14, minHeight: 0 },
  panelContent: { flexGrow: 1, justifyContent: 'center', gap: 10, paddingVertical: 6 },
  stageArea: { flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', backgroundColor: P.skyTop },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pillSlot: { flexShrink: 1, flexGrow: 1, minWidth: 0 },
  levelPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: P.marigold, borderWidth: 3, borderColor: P.ink, borderRadius: R.btn, minHeight: 48, paddingVertical: 4, paddingHorizontal: 10, ...lift },
  brandBox: { alignItems: 'center', gap: 2, flexShrink: 0, backgroundColor: P.drop, borderWidth: 3, borderColor: P.ink, borderRadius: R.btn, paddingHorizontal: 10, paddingVertical: 3, ...lift },
  brandText: { fontFamily: F.bold, fontSize: 15, color: P.ink, letterSpacing: 0.3 },
  pillSmall: { fontFamily: F.semi, fontSize: 10.5, color: P.ink, textTransform: 'uppercase', letterSpacing: 1 },
  pillName: { fontFamily: F.bold, fontSize: 17, color: P.ink },
  vBtn: { backgroundColor: VD.panel, borderColor: VD.line, shadowColor: VD.purple },
  roundBtn: { width: 44, height: 44, borderRadius: R.btn, backgroundColor: P.white, borderWidth: 3, borderColor: P.ink, alignItems: 'center', justifyContent: 'center', ...lift },
  inkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: P.white, borderRadius: R.btn, borderWidth: 3, borderColor: P.ink },
  inkTrack: { flex: 1, height: 16, borderRadius: 8, backgroundColor: P.paperDeep, borderWidth: 2.5, borderColor: P.ink, overflow: 'hidden' },
  inkFill: { height: '100%', borderRadius: 5 },
  inkText: { fontFamily: F.bold, fontSize: 13, color: P.ink, minWidth: 58, textAlign: 'right' },
  modRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  modChip: { fontFamily: F.bold, fontSize: 11, color: P.white, backgroundColor: P.dropDeep, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  capText: { fontFamily: F.bold, fontSize: 11, color: P.white, backgroundColor: P.coralDeep, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  moveText: { fontFamily: F.semi, fontSize: 11, color: P.inkSoft, paddingLeft: 7, borderLeftWidth: 2, borderLeftColor: P.inkSoft },
  caption: { backgroundColor: P.drop, borderRadius: R.btn, borderWidth: 3, borderColor: P.ink, paddingVertical: 6, paddingHorizontal: 12, marginTop: 10, justifyContent: 'center' },
  captionText: { fontFamily: F.semi, fontSize: 14, color: P.white, textAlign: 'center' },
  hintHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 },
  hintTitle: { fontFamily: F.bold, fontSize: 15, color: P.marigold },
  hintControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8, marginBottom: 3 },
  hintOverview: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  hintOverviewText: { fontFamily: F.semi, fontSize: 14, color: P.white, textDecorationLine: 'underline' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, columnGap: 8, rowGap: 8 },
  toolGroup: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  toolBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: R.btn, backgroundColor: P.white, borderWidth: 3, borderColor: P.ink, ...lift },
  toolBtnOn: { backgroundColor: P.drop },
  toolLabel: { fontFamily: F.bold, fontSize: 10, color: P.ink },
  releaseSlot: { flexGrow: 1, flexBasis: 96, minWidth: 96 },
  release: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: P.coral, borderWidth: 3, borderColor: P.ink, borderRadius: R.btn, paddingHorizontal: 14, ...lift, shadowOffset: { width: 0, height: 5 } },
  releaseText: { fontFamily: F.bold, fontSize: 19, color: P.white, textTransform: 'uppercase', letterSpacing: 1 },
});
