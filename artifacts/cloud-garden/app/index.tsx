import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard, Hud, Tool } from '@/components/GameBoard';
import { LevelPicker, LoseCard, PressScale, RewardHub, SettingsSheet, Stars, WinCard, type HubRewardAction } from '@/components/GameUi';
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
import { useRewardedAd } from '@/lib/rewardedAds';
import { BannerAdComponent, BANNER_AD_RESERVED_HEIGHT } from '@/components/BannerAdComponent';
import { useAppRewards } from '@/hooks/useAppRewards';
import { localRewardDay } from '@/lib/appRewards';
import type { RewardedAdReward } from 'react-native-google-mobile-ads';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

type Sheet = 'none' | 'levels' | 'settings' | 'rewards';
type RewardAction = HubRewardAction | 'retryInk' | 'hint';

export default function GameScreen() {
  'use no memo';
  // Retry is an explicit useMemo dependency even though its factory only reads level.
  const classic = useProgress(LEVELS.length);
  const hard = useProgress(HARDCORE_LEVELS.length, 'cloud-garden:hardcore:v1');
  const gen = useProgress(GENESIS_LEVELS.length, 'cloud-garden:genesis:v1');
  const vd = useProgress(VOID_LEVELS.length, 'cloud-garden:void:v1');
  const appRewards = useAppRewards();
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
  const [mainBannerHeight, setMainBannerHeight] = useState<number | null>(null);
  const [bonusInkFraction, setBonusInkFraction] = useState(0);
  const [rewardAction, setRewardAction] = useState<RewardAction | null>(null);
  const [rewardAdRequest, setRewardAdRequest] = useState(0);
  const [rewardMessage, setRewardMessage] = useState<string>();
  const [rewardedHintUnlocked, setRewardedHintUnlocked] = useState(false);
  const rewardActionRef = useRef<RewardAction | null>(null);
  const fastPassTrialRef = useRef(false);
  const engineRef = useRef<GardenEngine | null>(null);
  const loaded = useRef(false);
  const savedKey = useRef('');
  const deathKey = useRef('');

  const playSound = useSound(progress.settings.sound);
  const level = levels[idx];
  const hc = level.hardcore;
  // The world belongs to the screen, not the responsive board's mount point.
  const gameEngine = useMemo(() => new GardenEngine(level, bonusInkFraction), [level, attempt, bonusInkFraction]);
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
      if (hardcore && fastPassTrialRef.current) appRewards.recordFastPassClear();
      else if (hardcore) hardComplete(idx, live.stars, { score: live.score, time: live.elapsed });
      else classicComplete(idx, live.stars);
    }
  }, [status, live, tag, idx, hardcore, hardComplete, classicComplete, appRewards.recordFastPassClear]);

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
    if (!(hardcore || thermal) || status !== 'lost' || sheet !== 'none' || rewardAction === 'retryInk') return;
    const t = setTimeout(() => resetRef.current(), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hardcore, status, sheet, tag, level, live?.fail, rewardAction]);

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
    const fastPassTrial = mode === 'genesis' && i > progress.unlocked;
    if (i > progress.unlocked && (!fastPassTrial || appRewards.profile.genesisFastPasses < 1)) return;
    if (fastPassTrial && !appRewards.useFastPass()) return;
    fastPassTrialRef.current = fastPassTrial;
    setIdx(i);
    setLast(i);
    setAttempt((a) => a + 1);
    setBonusInkFraction(0);
    setRewardedHintUnlocked(false);
    rewardActionRef.current = null;
    setRewardAction(null);
    setRewardMessage(undefined);
    dispatchHint({ type: 'reset' });
    setSheet('none');
    setOverlay(false);
  };
  const reset = () => {
    setAttempt((a) => a + 1);
    setBonusInkFraction(0);
    setRewardedHintUnlocked(false);
    rewardActionRef.current = null;
    setRewardAction(null);
    setRewardMessage(undefined);
    dispatchHint({ type: 'reset' });
    setOverlay(false);
  };
  const retryWithBonusInk = useCallback(() => {
    setBonusInkFraction(0.5);
    setAttempt((a) => a + 1);
    setRewardedHintUnlocked(false);
    dispatchHint({ type: 'reset' });
    setOverlay(false);
    setRewardMessage('Extra ink added. This retry has 50% more line length.');
  }, []);
  resetRef.current = reset;
  const canOfferRewardedRetry = overlay && sheet === 'none' && status === 'lost';
  const canUsePendingReward = rewardAction === 'retryInk'
    ? canOfferRewardedRetry
    : rewardAction === 'hint'
      ? sheet === 'none' && !overlay && (hardcore || isGenesis) && status !== 'won' && status !== 'lost'
      : (rewardAction === 'dailyBrush' || rewardAction === 'fastPass') && sheet === 'rewards';

  const onRewardAfterClose = useCallback((reward: RewardedAdReward) => {
    const action = rewardActionRef.current;
    rewardActionRef.current = null;
    setRewardAction(null);
    if (!action) return;
    switch (action) {
      case 'dailyBrush':
        setRewardMessage(appRewards.claimDailyBrush()
          ? 'Golden Ink Brush earned and saved to your kit.'
          : 'Today’s Golden Ink Brush was already claimed.');
        break;
      case 'fastPass':
        appRewards.earnFastPass();
        setRewardMessage('Genesis Fast-Pass earned and saved. Choose a locked challenge when ready.');
        break;
      case 'retryInk':
        appRewards.recordInkRetry();
        retryWithBonusInk();
        break;
      case 'hint':
        appRewards.recordHint();
        setRewardedHintUnlocked(true);
        dispatchHint({ type: 'show' });
        setRewardMessage('Ghost-line solution unlocked for this attempt.');
        break;
    }
    // The SDK reward payload is verified above by the ad hook; reward units are
    // game inventory, not the publisher's configured amount.
    void reward;
  }, [appRewards.claimDailyBrush, appRewards.earnFastPass, appRewards.recordHint, appRewards.recordInkRetry, retryWithBonusInk]);
  const rewardedAd = useRewardedAd(!!rewardAction && canUsePendingReward, rewardAdRequest, onRewardAfterClose);
  const requestRewardedAction = (action: RewardAction) => {
    if (!appRewards.ready || !rewardedAd.supported) return;
    if (rewardAction !== action) {
      rewardActionRef.current = action;
      setRewardAction(action);
      setRewardMessage(undefined);
      setRewardAdRequest((n) => n + 1);
      return;
    }
    if (rewardedAd.status === 'ready') rewardedAd.onPress();
    else if (rewardedAd.status === 'unavailable') setRewardAdRequest((n) => n + 1);
  };
  const rewardedRetry = {
    supported: appRewards.ready && rewardedAd.supported,
    status: rewardAction === 'retryInk' ? rewardedAd.status : 'idle' as const,
    message: rewardAction === 'retryInk' ? rewardedAd.message : undefined,
    onPress: () => requestRewardedAction('retryInk'),
  };

  const switchMode = (m: Mode, nextSheet: Sheet = 'none') => {
    if (m === mode) {
      setSheet(nextSheet);
      return;
    }
    const p = m === 'void' ? vd.progress : m === 'genesis' ? gen.progress : m === 'hardcore' ? hard.progress : classic.progress;
    const n = m === 'void' ? VOID_LEVELS.length : m === 'genesis' ? GENESIS_LEVELS.length : m === 'hardcore' ? HARDCORE_LEVELS.length : LEVELS.length;
    fastPassTrialRef.current = false;
    setMode(m);
    setIdx(Math.min(p.last, p.unlocked, n - 1));
    setAttempt((a) => a + 1);
    setBonusInkFraction(0);
    setRewardedHintUnlocked(false);
    rewardActionRef.current = null;
    setRewardAction(null);
    dispatchHint({ type: 'reset' });
    setSheet(nextSheet);
    setOverlay(false);
    setHud(null);
  };
  const closeRewardHub = () => {
    if (rewardAction === 'dailyBrush' || rewardAction === 'fastPass') {
      rewardActionRef.current = null;
      setRewardAction(null);
    }
    setSheet('none');
  };
  const useGoldenBrush = () => {
    if (!appRewards.ready || inkMax <= 0 || !appRewards.useGoldenBrush()) return;
    setBonusInkFraction(0.5);
    setAttempt((a) => a + 1);
    setRewardedHintUnlocked(false);
    dispatchHint({ type: 'reset' });
    setOverlay(false);
    setSheet('none');
    setRewardMessage('Golden Ink Brush used. This attempt has 50% more line length.');
  };
  const useGenesisFastPass = () => {
    if (appRewards.profile.genesisFastPasses < 1) return;
    switchMode('genesis', 'levels');
  };
  const release = () => engineRef.current?.release();
  const undo = () => engineRef.current?.undo();

  const inkPct = inkMax > 0 ? inkLeft / inkMax : 0;
  const rules = 'First touch starts the timer. Undo: no refunds.';
  const hintAdNote = rewardAction === 'hint'
    ? rewardedAd.status === 'loading' ? 'Loading a video for the ghost-line solution…'
      : rewardedAd.status === 'ready' ? 'Tap Hint again to watch and reveal the ghost line.'
        : rewardedAd.status === 'showing' ? 'Video playing…'
          : rewardedAd.message ?? 'Rewarded hint unavailable. Try again.'
    : '';
  const caption = hint ? level.hintText : hintAdNote || rewardMessage || (status === 'ready' ? (hc ? `${level.lesson.replace(/^HARDCORE · /, '')} ${rules}` : level.lesson) : '');
  const showOutOfInkOffer = rewardedAd.supported && appRewards.ready && canDraw && inkMax > 0
    && inkLeft <= 0 && status !== 'won' && status !== 'lost' && sheet === 'none';
  const outOfInkLabel = rewardAction === 'retryInk'
    ? rewardedAd.status === 'loading' ? 'Loading ink-refill video…'
      : rewardedAd.status === 'ready' ? 'Watch video · +50% ink'
        : rewardedAd.status === 'showing' ? 'Video playing…'
          : rewardedAd.status === 'unavailable' ? 'Try ink-refill video again'
            : 'Watch a video for +50% ink'
    : 'Watch a video for +50% ink';
  const currentHint = level.hint[hintView.step];
  const noun = isVoid ? 'Void' : isGenesis ? 'Challenge' : hardcore ? 'Hardcore' : 'Bed';
  const modeName = isVoid ? 'The Void Protocol' : isGenesis ? 'The Genesis Gauntlet' : hardcore ? 'Hardcore levels' : 'Garden beds';
  const vr = level.voidProtocol;
  const vProg = vd.progress;
  const deathsHere = vProg.deaths[String(idx)] ?? 0;
  const badgeHere = vProg.badges[String(idx)];
  const maxMoves = hc?.maxStrokes ?? 0;
  const { landscape, compact, panelW, availW, insets } = useLayoutMode();
  const safeAreaEdges: Edge[] = Platform.OS === 'web' ? [] : ['top', 'right', 'bottom', 'left'];
  // Native SafeAreaView applies device insets; web keeps the preview's simulated
  // safe-area padding because browsers do not expose phone cutouts to the view.
  const contentInsets = Platform.OS === 'web' ? insets : { top: 0, bottom: 0, left: 0, right: 0 };
  const tightTools = !landscape && availW < 380;
  const showMainBanner = Platform.OS !== 'web' && sheet === 'none' && !overlay && status === 'ready';
  const mainBannerSpace = showMainBanner ? mainBannerHeight ?? BANNER_AD_RESERVED_HEIGHT : 0;
  const unit = compact ? 48 : 56;
  const showBrand = !landscape && availW >= 430;
  const showStarsInHeader = !landscape && availW >= 400;
  const compactModeSwitch = landscape ? panelW < 520 : availW < 520;

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
      {showStarsInHeader && (
        <View style={[styles.brandBox, isVoid && styles.vBtn]}>
          {showBrand && <Text style={[styles.brandText, { color: P.white }]} numberOfLines={1}>Slice & Bloom</Text>}
          <Stars count={progress.stars[idx] ?? 0} size={14} />
        </View>
      )}
      <PressScale onPress={() => setSheet('settings')} testID="open-settings" label="Settings" style={[styles.roundBtn, isVoid && styles.vBtn]}>
        <Ionicons name="settings-sharp" size={20} color={isVoid ? VD.text : P.ink} />
      </PressScale>
      <PressScale
        onPress={() => {
          rewardActionRef.current = null;
          setRewardAction(null);
          setRewardMessage(undefined);
          setSheet('rewards');
        }}
        testID="open-reward-hub"
        label="App Reward Hub"
        style={[styles.roundBtn, isVoid && styles.vBtn]}
      >
        <Ionicons name="gift" size={20} color={isVoid ? VD.text : P.ink} />
      </PressScale>
    </View>
  );
  const modeBar = <ModeSwitch mode={mode} onChange={switchMode} tight={compactModeSwitch} themed={isVoid} />;
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
  const outOfInkOffer = showOutOfInkOffer ? (
    <PressScale
      onPress={() => requestRewardedAction('retryInk')}
      disabled={!appRewards.ready || rewardedAd.status === 'loading' || rewardedAd.status === 'showing'}
      testID="out-of-ink-reward"
      label="Watch a rewarded video for fifty percent extra ink and instant retry"
      style={[styles.inkOffer, isVoid && { backgroundColor: VD.panel, borderColor: VD.red }]}
    >
      <Ionicons name="play-circle" size={18} color={isVoid ? VD.red : P.dropDeep} />
      <Text style={[styles.inkOfferText, isVoid && { color: VD.text }]} numberOfLines={2}>{outOfInkLabel}</Text>
    </PressScale>
  ) : null;
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
        <MiniBtn
          dark={isVoid}
          name={hint ? 'Hide hint' : (hardcore || isGenesis) && !rewardedHintUnlocked ? 'Watch video for ghost-line hint' : 'Show hint'}
          icon="bulb"
          active={hint}
          disabled={level.hint.length === 0 || (rewardAction === 'hint' && (rewardedAd.status === 'loading' || rewardedAd.status === 'showing'))}
          onPress={() => {
            if (hardcore || isGenesis) {
              if (rewardedHintUnlocked) dispatchHint({ type: 'toggle' });
              else requestRewardedAction('hint');
            } else {
              dispatchHint({ type: 'toggle' });
            }
          }}
          id="hint"
        />
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
      <SafeAreaView edges={safeAreaEdges} style={styles.safeRoot} testID="safe-area-game">
      {landscape ? (
        <View style={[styles.root, isVoid && { backgroundColor: VD.bg }, styles.rootRow, { paddingTop: contentInsets.top + 6, paddingBottom: contentInsets.bottom + 6 + mainBannerSpace, paddingLeft: contentInsets.left + 12, paddingRight: contentInsets.right + 12 }]} testID="layout-landscape">
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
                {outOfInkOffer}
                {captionEl}
              </ScrollView>
              {tools}
            </View>
            {frame}
          </View>
        </View>
      ) : (
        <View style={[styles.root, isVoid && { backgroundColor: VD.bg }, { paddingTop: contentInsets.top + 6, paddingBottom: contentInsets.bottom + 8 + mainBannerSpace, paddingLeft: contentInsets.left + 12, paddingRight: contentInsets.right + 12 }]} testID="layout-portrait">
          <View style={styles.column}>
            {header}
            {modeBar}
            {!hc && modBadges}
            {ink}
            {outOfInkOffer}
            {hudBar}
            {frame}
            {captionEl}
            {tools}
          </View>
        </View>
      )}
      </SafeAreaView>

      {showMainBanner && (
        <View style={[styles.bannerDock, { bottom: insets.bottom + 4 }]} pointerEvents="box-none">
          <BannerAdComponent onHeightChange={setMainBannerHeight} />
        </View>
      )}

      {sheet === 'levels' && <LevelPicker deaths={vProg.deaths} badges={vProg.badges} title={isVoid ? 'Hardcore: The Void Protocol' : isGenesis ? 'The Genesis Gauntlet' : hardcore ? 'Hardcore' : 'Garden beds'} noun={noun} levels={levels} unlocked={progress.unlocked} fastPasses={isGenesis ? appRewards.profile.genesisFastPasses : 0} stars={progress.stars} scores={hardcore ? arcade.progress.scores : undefined} bestTimes={hardcore ? arcade.progress.bestTimes : undefined} current={idx} onPick={load} onClose={() => setSheet('none')} />}
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
      {sheet === 'rewards' && (
        <RewardHub
          ready={appRewards.ready}
          supported={rewardedAd.supported}
          dailyClaimed={appRewards.profile.dailyClaimDate === localRewardDay()}
          brushCount={appRewards.profile.goldenBrushes}
          fastPassCount={appRewards.profile.genesisFastPasses}
          canUseBrush={inkMax > 0}
          inGenesis={isGenesis}
          adStatus={rewardedAd.status}
          pendingReward={rewardAction}
          message={rewardMessage ?? rewardedAd.message}
          onWatch={requestRewardedAction}
          onUseBrush={useGoldenBrush}
          onUseFastPass={useGenesisFastPass}
          onClose={closeRewardHub}
        />
      )}
      {overlay && sheet === 'none' && status === 'won' && (
        <WinCard dark={isVoid} badge={badgeHere} deaths={isVoid ? deathsHere : undefined} level={level} stars={live?.stars ?? 1} score={hardcore ? live?.score : undefined} highScore={hardcore ? arcade.progress.scores[String(idx)] : undefined} bestTime={hardcore ? arcade.progress.bestTimes[String(idx)] : undefined} masterclass={isGenesis} trial={fastPassTrialRef.current} elapsed={live?.elapsed} hasNext={idx + 1 < levels.length && (!fastPassTrialRef.current || appRewards.profile.genesisFastPasses > 0)} onNext={() => load(idx + 1)} onReplay={reset} onLevels={() => setSheet('levels')} />
      )}
      {overlay && sheet === 'none' && status === 'lost' && (hardcore || thermalFailure) && <HardcoreFail themed={isVoid} title={isVoid ? 'Voided' : hardcore ? 'Wilted' : 'Overheated'} reason={live?.fail ?? ''} onRetry={reset} rewardedRetry={rewardedRetry} />}
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
  safeRoot: { flex: 1, backgroundColor: P.paper },
  bannerDock: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 60 },
  inkOffer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 42, marginTop: 7, paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.btn, borderWidth: 2.5, borderColor: P.dropDeep, backgroundColor: P.paperDeep },
  inkOfferText: { flexShrink: 1, fontFamily: F.bold, fontSize: 13, color: P.dropDeep, textAlign: 'center' },
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
