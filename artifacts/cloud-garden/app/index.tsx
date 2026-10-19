import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { BackHandler, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard, Hud, Tool } from '@/components/GameBoard';
import { LevelPicker, LoseCard, PressScale, SettingsSheet, Stars, WinCard } from '@/components/GameUi';
import { RewardHub } from '@/components/RewardHub';
import { SmartHintPrompt } from '@/components/SmartHintPrompt';
import { useLayoutMode } from '@/components/layout';
import { HardcoreFail, HardcoreHud, Mode, ModeSwitch, VoidHud } from '@/components/HardcoreLayer';
import { useProgress } from '@/hooks/useProgress';
import { useCloudSync } from '@/components/CloudSyncProvider';
import { GardenEngine } from '@/lib/engine';
import { LEVELS } from '@/lib/levels';
import { HARDCORE_LEVELS } from '@/lib/hardcoreLevels';
import { GENESIS_LEVELS } from '@/lib/genesisLevels';
import { levelTools } from '@/lib/levelTools';
import { canSelectLevel } from '@/lib/levelGrid';
import { useInternetAccess } from '@/components/InternetAccess';
import { VOID_LEVELS } from '@/lib/voidLevels';
import { useSound } from '@/lib/audio';
import { setHapticsEnabled } from '@/lib/haptics';
import { F, GN, P, R, SG, VD } from '@/constants/theme';
import { hintReducer, INITIAL_HINT_VIEW } from '@/lib/hints';
import { useRewardedAd } from '@/lib/rewardedAds';
import { MainMenu } from '@/components/MainMenu';
import { adManager } from '@/lib/AdManager';
import { useAdNexus } from '@/hooks/useAdNexus';
import { useAppRewards } from '@/hooks/useAppRewards';
import { createDailyRewardOffer, dailyStatus, formatCountdown, type DailyRewardOffer, type HubRewardAction } from '@/lib/rewardHub';
import { SINGULARITY_LEVELS } from '@/lib/singularityLevels';
import type { RewardedAdReward } from 'react-native-google-mobile-ads';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';

type Sheet = 'none' | 'menu' | 'levels' | 'settings' | 'rewards';
type RewardAction = HubRewardAction | 'retryInk' | 'hint';

export default function GameScreen() {
  'use no memo';
  const router = useRouter();
  const internet = useInternetAccess();
  const cloud = useCloudSync();
  const pathname = usePathname();
  const routeRef = useRef(pathname);
  routeRef.current = pathname;
  const levelTransition = useRef(false);
  // Retry is an explicit useMemo dependency even though its factory only reads level.
  const classic = useProgress(LEVELS.length, 'cloud-garden:v1', 'campaign');
  const hard = useProgress(HARDCORE_LEVELS.length, 'cloud-garden:hardcore:v1', 'hardcore');
  const gen = useProgress(GENESIS_LEVELS.length, 'cloud-garden:genesis:v1', 'genesis');
  const vd = useProgress(VOID_LEVELS.length, 'cloud-garden:void:v1', 'void');
  const sing = useProgress(SINGULARITY_LEVELS.length, 'cloud-garden:singularity:v1', 'singularity');
  const appRewards = useAppRewards();
  const [mode, setMode] = useState<Mode>('classic');
  const hardcore = mode !== 'classic';
  const isGenesis = mode === 'genesis';
  const isVoid = mode === 'void';
  const isSingularity = mode === 'singularity';
  const isDarkScreen = isVoid || isSingularity;
  const screenBg = isVoid ? VD.bg : isSingularity ? SG.bg : isGenesis ? GN.bg : P.paper;
  const tone = isVoid ? 'void' : isSingularity ? 'singularity' : isGenesis ? 'genesis' : 'campaign';
  const arcade = isVoid ? vd : isGenesis ? gen : isSingularity ? sing : hard;
  const active = hardcore ? arcade : classic;
  const ready = classic.ready && hard.ready && gen.ready && vd.ready && sing.ready;
  const { setLast } = active;
  const hardComplete = arcade.complete;
  const classicComplete = classic.complete;
  const { setSetting } = classic;
  // Settings are shared and always live on the classic record.
  const progress = { ...active.progress, settings: classic.progress.settings };
  const levels = isVoid ? VOID_LEVELS : isGenesis ? GENESIS_LEVELS : isSingularity ? SINGULARITY_LEVELS : hardcore ? HARDCORE_LEVELS : LEVELS;

  const [idx, setIdx] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [tool, setTool] = useState<Tool>('draw');
  const [hintView, dispatchHint] = useReducer(hintReducer, INITIAL_HINT_VIEW);
  const hint = hintView.visible;
  const [sheet, setSheet] = useState<Sheet>('menu');
  const [hud, setHud] = useState<Hud | null>(null);
  const [overlay, setOverlay] = useState(false);
  const adNexus = useAdNexus();
  const adSession = useRef(`${Date.now()}:${Math.random().toString(36).slice(2)}`);
  const victoryTransition = useRef(false);
  const winRecord = useRef<Promise<void>>(Promise.resolve());
  const [bonusInkFraction, setBonusInkFraction] = useState(0);
  const [rewardAction, setRewardAction] = useState<RewardAction | null>(null);
  const [rewardAdRequest, setRewardAdRequest] = useState(0);
  const [rewardMessage, setRewardMessage] = useState<string>();
  const [rewardedHintUnlocked, setRewardedHintUnlocked] = useState(false);
  const [hintPrompt, setHintPrompt] = useState(false);
  const [puzzleDetails, setPuzzleDetails] = useState(false);
  const detailsRef = useRef(false);
  detailsRef.current = puzzleDetails;
  useEffect(() => {
    if (sheet !== 'none') setPuzzleDetails(false);
  }, [sheet]);
  const [hintWatchRequested, setHintWatchRequested] = useState(false);
  const rewardActionRef = useRef<RewardAction | null>(null);
  const rewardReceiptRef = useRef('');
  const dailyOfferRef = useRef<DailyRewardOffer | undefined>(undefined);
  const skipLock = useRef(false);
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
  // These presentation/boost properties change in place: expiry and equipping
  // must not recreate an active Matter world or reset its countdown.
  gameEngine.infiniteInk = appRewards.profile.infiniteInkUntil > appRewards.now;
  gameEngine.cosmeticSkin = appRewards.profile.equippedSkin;
  useEffect(() => () => gameEngine.dispose(), [gameEngine]);
  const tag = `${mode}:${level.id}:${attempt}`;
  const live = hud && hud.tag === tag ? hud : null;
  const status = live?.status ?? 'ready';
  const thermalFailure = !!level.thermalZone && status === 'lost' && !!live?.fail.startsWith('Thermal');
  const inkMax = gameEngine.inkMax;
  const inkLeft = live ? live.inkLeft : inkMax;
  const { canDraw, canSlice, initialTool } = levelTools(level, inkMax);
  useEffect(() => { skipLock.current = false; }, [idx, attempt, mode]);
  useEffect(() => {
    if (!ready || !appRewards.ready) return;
    const saves = { classic, hardcore: hard, genesis: gen, void: vd, singularity: sing };
    for (const [m, entitlement] of Object.entries(appRewards.profile.skipUnlocks)) {
      const save = saves[m as keyof typeof saves];
      if (save && entitlement > save.progress.unlocked) save.unlockThrough(entitlement);
    }
  }, [ready, appRewards.ready, appRewards.profile.skipUnlocks, classic.progress.unlocked,
    hard.progress.unlocked, gen.progress.unlocked, vd.progress.unlocked, sing.progress.unlocked,
    classic.unlockThrough, hard.unlockThrough, gen.unlockThrough, vd.unlockThrough, sing.unlockThrough]);

  useEffect(() => {
    if (ready && !loaded.current) {
      loaded.current = true;
      setIdx(Math.min(progress.last, progress.unlocked, levels.length - 1));
      setAttempt((a) => a + 1);
    }
  }, [ready, progress.last, progress.unlocked]);

  useEffect(() => setHapticsEnabled(progress.settings.haptics), [progress.settings.haptics]);

  useEffect(() => {
    setTool(initialTool);
  }, [idx, initialTool]);

  useEffect(() => {
    if (status === 'won' && live && savedKey.current !== tag) {
      savedKey.current = tag;
      if (hardcore && fastPassTrialRef.current) appRewards.recordFastPassClear();
      else if (hardcore) hardComplete(idx, live.stars, { score: live.score, time: live.elapsed });
      else classicComplete(idx, live.stars, { score: live.score, time: live.elapsed });
      winRecord.current = adManager.recordCompletion(`${adSession.current}:${tag}`);
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
    if (!internet.online || !cloud.playReady || !(hardcore || thermal) || status !== 'lost' || sheet !== 'none' || rewardAction === 'retryInk') return;
    const t = setTimeout(() => resetRef.current(), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hardcore, status, sheet, tag, level, live?.fail, rewardAction, internet.online, cloud.playReady]);

  const sheetRef = useRef(sheet);
  sheetRef.current = sheet;
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (e.key !== 'r' && e.key !== 'R') return;
      if (sheetRef.current !== 'none' || detailsRef.current) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      resetRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const onHud = useCallback((h: Hud) => setHud(h), []);

  const load = async (i: number) => {
    if (levelTransition.current) return;
    if (!ready || !canSelectLevel(i, levels.length, progress.unlocked,
      mode === 'genesis' ? appRewards.profile.genesisFastPasses : 0)) return;
    levelTransition.current = true;
    try {
      if (!cloud.playReady || !await internet.check() || !cloud.playReady || routeRef.current !== '/') return;
      if (adManager.getSnapshot().fullscreen || victoryTransition.current) return;
      const fastPassTrial = mode === 'genesis' && i > progress.unlocked;
      if (i > progress.unlocked && (!fastPassTrial || appRewards.profile.genesisFastPasses < 1)) return;
      if (!fastPassTrial) setLast(i);
      if (!await active.flushCloud()) return;
      if (fastPassTrial && !appRewards.useFastPass()) return;
      fastPassTrialRef.current = fastPassTrial;
      setIdx(i);
      setAttempt((a) => a + 1);
      setBonusInkFraction(0);
      setRewardedHintUnlocked(false);
      setHintPrompt(false);
      setHintWatchRequested(false);
      rewardActionRef.current = null;
      setRewardAction(null);
      setRewardMessage(undefined);
      dispatchHint({ type: 'reset' });
      setSheet('none');
      setOverlay(false);
    } finally { levelTransition.current = false; }
  };
  const reset = async () => {
    if (levelTransition.current) return;
    levelTransition.current = true;
    try {
       if (!cloud.playReady || !await internet.check() || !cloud.playReady || routeRef.current !== '/') return;
      if (adManager.getSnapshot().fullscreen || victoryTransition.current) return;
      setAttempt((a) => a + 1);
      setBonusInkFraction(0);
      setRewardedHintUnlocked(false);
      setHintPrompt(false);
      setHintWatchRequested(false);
      rewardActionRef.current = null;
      setRewardAction(null);
      setRewardMessage(undefined);
      dispatchHint({ type: 'reset' });
      setOverlay(false);
    } finally { levelTransition.current = false; }
  };
  const continueGame = async () => {
    if (cloud.playReady && await internet.check() && cloud.playReady
      && await active.flushCloud() && routeRef.current === '/') setSheet('none');
  };
  const retryWithBonusInk = useCallback(() => {
    setBonusInkFraction(0.5);
    setAttempt((a) => a + 1);
    setRewardedHintUnlocked(false);
    dispatchHint({ type: 'reset' });
    setOverlay(false);
    setRewardMessage('Extra ink added. This retry has 50% more line length.');
  }, []);
  // R is a free instant retry after failure; after a win it follows the same
  // natural-break cadence as tapping Replay, rather than bypassing the nexus.
  resetRef.current = () => { if (status === 'won') void leaveVictory(reset); else reset(); };
  const canOfferRewardedRetry = sheet === 'none' && canDraw && level.ink > 0
    && ((overlay && status === 'lost') || (inkLeft <= 0 && status !== 'won'));
  const canUsePendingReward = rewardAction === 'retryInk'
    ? canOfferRewardedRetry
    : rewardAction === 'hint'
      ? sheet === 'none' && !overlay && hintPrompt && status !== 'won' && status !== 'lost'
      : !!rewardAction && sheet === 'rewards';

  const onRewardAfterClose = useCallback((reward: RewardedAdReward) => {
    const action = rewardActionRef.current;
    rewardActionRef.current = null;
    setRewardAction(null);
    if (!action) return;
    switch (action) {
      case 'retryInk':
        appRewards.recordInkRetry();
        retryWithBonusInk();
        break;
      case 'hint':
        setHintPrompt(false);
        setHintWatchRequested(false);
        appRewards.recordHint();
        setRewardedHintUnlocked(true);
        dispatchHint({ type: 'show' });
        setRewardMessage('Ghost-line solution unlocked for this attempt.');
        break;
      default: {
        const receipt = rewardReceiptRef.current;
        rewardReceiptRef.current = '';
        const offer = dailyOfferRef.current;
        dailyOfferRef.current = undefined;
        const label = appRewards.grantHubAd(action, receipt, offer);
        setRewardMessage(label ?? 'This reward was already claimed or its cooldown is still active.');
        if (label) playSound('win');
        break;
      }
    }
    // The SDK reward payload is verified above by the ad hook; reward units are
    // game inventory, not the publisher's configured amount.
    void reward;
  }, [appRewards.grantHubAd, appRewards.recordHint, appRewards.recordInkRetry, retryWithBonusInk, playSound]);
  const rewardedAd = useRewardedAd(internet.online && cloud.playReady && !!rewardAction && canUsePendingReward, rewardAdRequest, onRewardAfterClose);
  // Watch Ad is explicit opt-in. A cold cache continues automatically once
  // loading succeeds; no second tap or synthetic browser reward is needed.
  useEffect(() => {
    if (!hintWatchRequested || !hintPrompt || rewardAction !== 'hint') return;
    if (rewardedAd.status === 'ready' && !adNexus.fullscreen) {
      setHintWatchRequested(false);
      rewardedAd.onPress();
    } else if (rewardedAd.status === 'showing' || rewardedAd.status === 'unavailable') {
      setHintWatchRequested(false);
    }
  }, [hintWatchRequested, hintPrompt, rewardAction, rewardedAd.status, rewardedAd.onPress, adNexus.fullscreen]);
  const closeHintPrompt = () => {
    if (adManager.getSnapshot().fullscreen) return;
    setHintPrompt(false);
    setHintWatchRequested(false);
    rewardActionRef.current = null;
    setRewardAction(null);
  };
  // The ghost path is guidance, never an automatic stroke or physics mutation.
  // It fades after 15 seconds; the earned unlock can re-display it this attempt.
  useEffect(() => {
    if (!internet.online || !cloud.playReady || !hint || puzzleDetails || sheet !== 'none') return;
    const timer = setTimeout(() => dispatchHint({ type: 'toggle' }), 15000);
    return () => clearTimeout(timer);
  }, [hint, tag, puzzleDetails, sheet, internet.online, cloud.playReady]);
  const requestRewardedAction = (action: RewardAction) => {
    if (!internet.isOnline() || !cloud.playReady) return;
    const watch = () => {
      dailyOfferRef.current = action === 'dailyBrush' ? createDailyRewardOffer(appRewards.profile, Date.now()) : undefined;
      if (action === 'dailyBrush' && !dailyOfferRef.current) return;
      adManager.showRewarded(onRewardAfterClose);
    };
    if (!appRewards.ready || appRewards.storageError || !rewardedAd.supported) return;
    if (rewardActionRef.current && rewardActionRef.current !== action
      && ['loading', 'ready', 'showing'].includes(rewardedAd.status)) return;
    if (action === 'dailyBrush' && !dailyStatus(appRewards.profile, Date.now()).canClaim) return;
    if (action.startsWith('vault') && appRewards.profile.vaultNextAt > Date.now()) return;
    if (rewardAction !== action) {
      rewardReceiptRef.current = `ad:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      rewardActionRef.current = action;
      setRewardAction(action);
      setRewardMessage(undefined);
      setRewardAdRequest((n) => n + 1);
      // An already-cached ad can show immediately after this explicit opt-in.
      if (adManager.getSnapshot().rewarded === 'ready')
        watch();
      return;
    }
    if (rewardedAd.status === 'ready') watch();
    else if (rewardedAd.status === 'unavailable') {
      rewardReceiptRef.current = `ad:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      setRewardAdRequest((n) => n + 1);
    }
  };
  const rewardedRetry = {
    supported: appRewards.ready && rewardedAd.supported && canDraw && level.ink > 0,
    status: rewardAction === 'retryInk' ? rewardedAd.status : adNexus.rewarded === 'ready' ? 'ready' as const : 'idle' as const,
    message: rewardAction === 'retryInk' ? rewardedAd.message : undefined,
    onPress: () => requestRewardedAction('retryInk'),
  };

  const switchMode = (m: Mode, nextSheet: Sheet = 'none') => {
    if (adManager.getSnapshot().fullscreen || victoryTransition.current) return;
    setPuzzleDetails(false);
    if (m === mode) {
      setSheet(nextSheet);
      return;
    }
    const p = m === 'void' ? vd.progress : m === 'genesis' ? gen.progress : m === 'singularity' ? sing.progress : m === 'hardcore' ? hard.progress : classic.progress;
    const n = m === 'void' ? VOID_LEVELS.length : m === 'genesis' ? GENESIS_LEVELS.length : m === 'singularity' ? SINGULARITY_LEVELS.length : m === 'hardcore' ? HARDCORE_LEVELS.length : LEVELS.length;
    fastPassTrialRef.current = false;
    setMode(m);
    setIdx(Math.min(p.last, p.unlocked, n - 1));
    setAttempt((a) => a + 1);
    setBonusInkFraction(0);
    setRewardedHintUnlocked(false);
    setHintPrompt(false);
    setHintWatchRequested(false);
    rewardActionRef.current = null;
    setRewardAction(null);
    dispatchHint({ type: 'reset' });
    setSheet(nextSheet);
    setOverlay(false);
    setHud(null);
  };
  const closeRewardHub = () => {
    if (rewardedAd.status === 'showing') return;
    rewardActionRef.current = null;
    rewardReceiptRef.current = '';
    setRewardAction(null);
    setSheet('none');
  };
  const useGoldenBrush = () => {
    if (!appRewards.ready || appRewards.storageError || gameEngine.infiniteInk || level.ink <= 0 || !appRewards.useGoldenBrush()) return;
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
  const useInkRefill = () => {
    if (!appRewards.ready || appRewards.storageError || gameEngine.infiniteInk || level.ink <= 0 || !appRewards.useRefill()) return;
    reset();
    setSheet('none');
    setRewardMessage('Ink refilled. A fresh attempt has the full normal ink budget.');
    playSound('release');
  };
  const useLevelSkip = (genesisOnly: boolean) => {
    if (!appRewards.ready || appRewards.storageError || skipLock.current) return;
    if (genesisOnly && !isGenesis) { switchMode('genesis', 'rewards'); return; }
    if (fastPassTrialRef.current || idx + 1 >= levels.length) return;
    if (!appRewards.useSkip(genesisOnly, mode, idx, levels.length)) return;
    skipLock.current = true;
    active.skip(idx);
    setIdx(idx + 1);
    fastPassTrialRef.current = false;
    reset();
    setSheet('none');
    setRewardMessage('Next stage opened. Skipping does not award stars, scores or a clear.');
    playSound('release');
  };
  const wagerWheel = () => {
    if (!appRewards.ready || appRewards.storageError || ['loading', 'ready', 'showing'].includes(rewardedAd.status)) return;
    const result = appRewards.spinWheel();
    setRewardMessage(result ?? 'You need 20 free ink credits to wager.');
    if (result) playSound('release');
  };
  const leaveVictory = async (next: () => void) => {
    if (victoryTransition.current || adManager.getSnapshot().fullscreen) return;
    victoryTransition.current = true;
    try {
      await winRecord.current;
      await adManager.interstitialAtVictoryBreak(`${adSession.current}:${tag}`);
      victoryTransition.current = false;
      next();
    } finally { victoryTransition.current = false; }
  };
  const release = () => { if (internet.isOnline() && cloud.playReady) engineRef.current?.release(); };
  const undo = () => { if (internet.isOnline() && cloud.playReady) engineRef.current?.undo(); };

  // Read current navigation state without re-registering Android Back on every
  // physics HUD update. Native Modal handles its own onRequestClose as usual.
  const navigationBack = useRef<() => boolean>(() => false);
  navigationBack.current = () => {
    if (adManager.getSnapshot().fullscreen || victoryTransition.current) return true;
    if (puzzleDetails) setPuzzleDetails(false);
    else if (hintPrompt) closeHintPrompt();
    else if (sheet === 'levels' || sheet === 'none') setSheet('menu');
    else if (sheet === 'settings') setSheet('none');
    else if (sheet === 'rewards') closeRewardHub();
    else return false; // Android may exit only from Home.
    return true;
  };
  useEffect(() => {
    if (Platform.OS === 'web') {
      const listener = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && navigationBack.current()) event.preventDefault();
      };
      window.addEventListener('keydown', listener);
      return () => window.removeEventListener('keydown', listener);
    }
    const listener = BackHandler.addEventListener('hardwareBackPress', () => navigationBack.current());
    return () => listener.remove();
  }, []);

  const inkPct = inkMax > 0 ? inkLeft / inkMax : 0;
  const rules = 'First touch starts the timer. Undo: no refunds.';
  const hintAdNote = rewardAction === 'hint'
    ? rewardedAd.status === 'loading' ? 'Loading a video for the ghost-line solution…'
      : rewardedAd.status === 'ready' ? 'Your expert ghost path is ready to unlock.'
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
    : 'Watch a quick video for +50% Extra Ink & Revive!';
  const currentHint = level.hint[hintView.step];
  const noun = isVoid ? 'Void' : isGenesis ? 'Challenge' : isSingularity ? 'Paradox' : hardcore ? 'Hardcore' : 'Bed';
  const modeName = isVoid ? 'The Void Protocol' : isGenesis ? 'The Genesis Gauntlet' : isSingularity ? 'Singularity Paradox' : hardcore ? 'Hardcore levels' : 'Garden beds';
  const vr = level.voidProtocol;
  const vProg = vd.progress;
  const deathsHere = vProg.deaths[String(idx)] ?? 0;
  const badgeHere = vProg.badges[String(idx)];
  const maxMoves = hc?.maxStrokes ?? 0;
  const { landscape, compact, panelW, availW, insets } = useLayoutMode();
  const safeAreaEdges: Edge[] = Platform.OS === 'web' ? [] : ['top', 'right', 'bottom', 'left'];
  // Native SafeAreaView applies device insets once. Web uses actual browser
  // insets only; never reserve fictitious phone/status bars around the puzzle.
  const contentInsets = Platform.OS === 'web' ? insets : { top: 0, bottom: 0, left: 0, right: 0 };
  const tightTools = !landscape && availW < 380;
  // The ready board is interactive too: banners belong only to menu/result cards.
  const mainBannerSpace = 0;
  const unit = compact ? 48 : 56;
  const showBrand = !landscape && availW >= 430;
  const showStarsInHeader = !landscape && availW >= 400;
  const compactModeSwitch = landscape ? panelW < 640 : availW < 650;

  const progressStores = [classic, hard, gen, vd, sing];
  const saveError = progressStores.find(store => store.storageError)?.storageError;
  if (!ready || saveError) return (
    <SafeAreaView style={[styles.root, { backgroundColor: P.skyTop, justifyContent: 'center', padding: 24 }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 16 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 24, color: P.ink }}>
          {saveError ? 'Keep your garden safe' : 'Loading your garden…'}
        </Text>
        {saveError && <>
          <Text accessibilityRole="alert" style={{ fontFamily: F.semi, fontSize: 16, color: P.ink }}>{saveError}</Text>
          <PressScale testID="retry-progress-storage" label="Retry loading or saving game progress"
            onPress={() => progressStores.forEach(store => store.retrySave())}
            disabled={progressStores.some(store => store.saving)} style={styles.release}>
            <Text style={styles.releaseText}>Retry</Text>
          </PressScale>
        </>}
      </ScrollView>
    </SafeAreaView>
  );

  const header = (
    <View style={styles.topBar} testID="region-header">
      <PressScale onPress={() => setSheet('levels')} testID="open-levels" label={`${modeName}. ${noun} ${level.id} of ${levels.length}, ${level.name}`} containerStyle={styles.pillSlot} style={[styles.levelPill, isVoid && styles.vBtn, isVoid && { backgroundColor: VD.panelHi }, isGenesis && styles.gnBtn, isSingularity && styles.singBtn]}>
        <Ionicons name="grid" size={18} color={isDarkScreen ? isVoid ? VD.text : SG.cyan : P.ink} />
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <Text style={[styles.pillSmall, isVoid && { color: VD.red }, isGenesis && { color: GN.gold }, isSingularity && { color: SG.cyan }]} numberOfLines={1}>{noun} {level.id} of {levels.length}</Text>
          <Text style={[styles.pillName, isVoid && { color: VD.text }, isGenesis && { color: GN.text }, isSingularity && { color: SG.text }]} numberOfLines={1}>{level.name}</Text>
        </View>
      </PressScale>
      {showStarsInHeader && (
        <View style={[styles.brandBox, isVoid && styles.vBtn, isGenesis && styles.gnBtn, isSingularity && styles.singBtn]}>
          {showBrand && <Text style={[styles.brandText, { color: P.white }]} numberOfLines={1}>Slice & Bloom</Text>}
          <Stars count={progress.stars[idx] ?? 0} size={14} />
        </View>
      )}
      <PressScale onPress={() => setSheet('settings')} testID="open-settings" label="Settings" style={[styles.roundBtn, isVoid && styles.vBtn, isGenesis && styles.gnBtn, isSingularity && styles.singBtn]}>
        <Ionicons name="settings-sharp" size={20} color={isDarkScreen ? isVoid ? VD.text : SG.cyan : isGenesis ? GN.gold : P.ink} />
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
        style={[styles.roundBtn, isVoid && styles.vBtn, isGenesis && styles.gnBtn, isSingularity && styles.singBtn]}
      >
        <Ionicons name="gift" size={20} color={isDarkScreen ? isVoid ? VD.text : SG.gold : isGenesis ? GN.gold : P.ink} />
      </PressScale>
      <PressScale onPress={() => setSheet('menu')} testID="open-main-menu" label="Main menu" style={[styles.roundBtn, isVoid && styles.vBtn, isGenesis && styles.gnBtn, isSingularity && styles.singBtn]}>
        <Ionicons name="home" size={18} color={isDarkScreen ? SG.gold : P.ink} />
      </PressScale>
    </View>
  );
  const modeBar = <ModeSwitch mode={mode} onChange={switchMode} tight={compactModeSwitch} themed={isDarkScreen} />;
  const mods: string[] = [];
  if (isGenesis) {
    if (level.countdownTimer) mods.push(`${level.countdownTimer}s countdown`);
    if (level.invisibleObstacles) mods.push('Hidden: touch to reveal');
    if (level.hyperSensitiveScale) mods.push(`Drop ${Math.round(level.hyperSensitiveScale * 100)}% size`);
    if (level.laserReflection) mods.push(`Reflect ${level.reflectionPuzzle?.mirrors.length} lasers`);
    if (level.multiStagePulley) mods.push(`${level.pulleyPuzzle?.stages.length}-stage pulley`);
    if (level.splitDropletRequired) mods.push('Both buds');
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
      {mods.map((m) => <Text key={m} style={[styles.modChip, isGenesis && styles.gnChip, isSingularity && styles.singChip]}>{m}</Text>)}
    </View>
  ) : null;
  const hudCore = hc ? (
    <HardcoreHud started={live?.started ?? false} timeLeft={live?.timeLeft ?? hc.timeLimit} limit={hc.timeLimit} elapsed={live?.elapsed ?? 0} gold={hc.goldTime} par={level.par} moves={live?.actions ?? 0} maxMoves={maxMoves} gravity={live?.gravityRemaining ?? 0} nextFlip={level.gravityFlipInterval ? level.gravityFlipInterval - ((live?.cycleTime ?? 0) % level.gravityFlipInterval) : undefined} themed={isVoid} singularity={isSingularity} genesis={isGenesis} />
  ) : null;
  const hudBar = hc ? (isVoid ? <VoidHud deaths={deathsHere} badge={badgeHere} mods={vmods} timer={hudCore} /> : <View>{hudCore}{modBadges}</View>) : null;
  const ink = (
    <View style={[styles.inkRow, isVoid && styles.vBtn, isGenesis && styles.gnBtn, isSingularity && styles.singBtn]} testID="region-ink">
      <Ionicons name="water" size={16} color={isVoid ? VD.purple : isGenesis ? GN.amber : isSingularity ? SG.cyan : P.ink} />
      <View style={[styles.inkTrack, isVoid && { backgroundColor: VD.bgDeep, borderColor: VD.line }, isGenesis && { backgroundColor: GN.bgDeep, borderColor: GN.line }, isSingularity && { backgroundColor: SG.bgDeep, borderColor: SG.line }]}>
        <View style={[styles.inkFill, { width: `${Math.max(0, Math.min(1, inkPct)) * 100}%`, backgroundColor: inkPct < 0.2 ? (isVoid ? VD.red : isGenesis ? GN.orange : isSingularity ? SG.gold : P.coral) : isVoid ? VD.purple : isGenesis ? GN.amber : isSingularity ? SG.cyan : P.mint }]} />
      </View>
      <Text testID="ink-budget" style={[styles.inkText, isVoid && { color: VD.text }, isGenesis && { color: GN.text }, isSingularity && { color: SG.text }]}>{gameEngine.infiniteInk ? `∞ · ${formatCountdown(appRewards.profile.infiniteInkUntil - appRewards.now).slice(3)}` : inkMax > 0 ? `${Math.round(inkLeft)} ink` : 'no ink'}</Text>
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
      disabled={!appRewards.ready || !!appRewards.storageError || rewardedAd.status === 'loading' || rewardedAd.status === 'showing'}
      testID="out-of-ink-reward"
      label="Watch a rewarded video for fifty percent extra ink and instant retry"
      style={[styles.inkOffer, isVoid && { backgroundColor: VD.panel, borderColor: VD.red }, isGenesis && { backgroundColor: GN.panel, borderColor: GN.amber }, isSingularity && { backgroundColor: SG.panel, borderColor: SG.cyan }]}
    >
      <Ionicons name="play-circle" size={18} color={isVoid ? VD.red : isGenesis ? GN.gold : isSingularity ? SG.cyan : P.dropDeep} />
      <Text style={[styles.inkOfferText, isVoid && { color: VD.text }, isGenesis && { color: GN.text }, isSingularity && { color: SG.text }]} numberOfLines={2}>{outOfInkLabel}</Text>
    </PressScale>
  ) : null;
  const captionEl = (!!caption || !landscape) && (
    <View style={[styles.caption, isVoid && { backgroundColor: VD.panel, borderColor: VD.purple }, isGenesis && { backgroundColor: GN.panel, borderColor: GN.amber }, isSingularity && { backgroundColor: SG.panel, borderColor: SG.cyan }, !caption && { opacity: 0 }, !landscape && { minHeight: compact ? 44 : 52 }]} testID="region-caption" accessibilityLiveRegion="polite">
      {hint && currentHint && (
        <View style={styles.hintHeading}>
          <Ionicons name={currentHint.kind === 'draw' ? 'brush' : 'cut'} size={17} color={isGenesis ? GN.gold : isSingularity ? SG.gold : P.marigold} />
          <Text style={[styles.hintTitle, isGenesis && { color: GN.text }, isSingularity && { color: SG.text }, isVoid && { color: VD.text }]} testID="hint-step">
            Step {hintView.step + 1} of {level.hint.length} · {currentHint.kind === 'draw' ? 'Draw' : 'Slice'}
          </Text>
        </View>
      )}
      <Text style={[styles.captionText, isGenesis && { color: GN.text }, isSingularity && { color: SG.text }, isVoid && { color: VD.text }, compact && { fontSize: 12.5 }]} numberOfLines={landscape ? undefined : 3}>{caption || ' '}</Text>
      {hint && level.hint.length > 1 && (
        <View style={styles.hintControls} testID="hint-controls">
          <MiniBtn dark={isVoid} tone={tone} name="Previous hint step" icon="chevron-back" disabled={hintView.step === 0} onPress={() => dispatchHint({ type: 'previous', count: level.hint.length })} id="hint-previous" />
          <PressScale onPress={() => dispatchHint({ type: 'overview' })} testID="hint-overview" label={hintView.overview ? 'Show only the current hint path' : 'Show all hint paths'} selected={hintView.overview} style={styles.hintOverview}>
            <Text style={styles.hintOverviewText}>{hintView.overview ? 'Current path' : 'All paths'}</Text>
          </PressScale>
          <MiniBtn dark={isVoid} tone={tone} name="Next hint step" icon="chevron-forward" disabled={hintView.step === level.hint.length - 1} onPress={() => dispatchHint({ type: 'next', count: level.hint.length })} id="hint-next" />
        </View>
      )}
    </View>
  );
  const tools = (
    <View style={[styles.toolbar, landscape && { justifyContent: 'center' }]} testID="region-tools">
      <View style={[styles.toolGroup, tightTools && { gap: 4 }]}>
        <ToolBtn dark={isVoid} tone={tone} size={tightTools ? 44 : unit} icon="brush" label="Draw" active={tool === 'draw'} disabled={!canDraw} onPress={() => setTool('draw')} id="tool-draw" />
        <ToolBtn dark={isVoid} tone={tone} size={tightTools ? 44 : unit} icon="cut" label="Slice" active={tool === 'slice'} disabled={!canSlice} onPress={() => setTool('slice')} id="tool-slice" />
      </View>
      <View style={[styles.toolGroup, tightTools && { gap: 4 }]}>
        <MiniBtn dark={isVoid} tone={tone} name="Undo" icon="arrow-undo" disabled={!live || live.strokes === 0 || (status !== 'ready' && status !== 'running')} onPress={undo} id="undo" />
      </View>
      <PressScale onPress={release} disabled={status !== 'ready'} testID="release" label="Drop water" containerStyle={[styles.releaseSlot, tightTools && { flexGrow: 0, flexBasis: 44, minWidth: 44 }]} style={[styles.release, isVoid && { backgroundColor: VD.redDeep, borderColor: VD.red, shadowColor: VD.red }, isGenesis && { backgroundColor: GN.amber, borderColor: GN.glow, shadowColor: GN.orange }, isSingularity && { backgroundColor: SG.cyanDeep, borderColor: SG.cyan, shadowColor: SG.cyan }, { height: tightTools ? 44 : unit }, tightTools && { paddingHorizontal: 0 }]}>
        <Ionicons name="water" size={24} color={P.white} />
        {!tightTools && <Text style={styles.releaseText}>Drop</Text>}
      </PressScale>
    </View>
  );
  const frame = (
    <View style={[styles.stageArea, isVoid && { backgroundColor: VD.bgDeep, borderWidth: 2, borderColor: VD.red }, isGenesis && { backgroundColor: GN.bgDeep, borderWidth: 2, borderColor: GN.amber }, isSingularity && { backgroundColor: SG.bgDeep, borderWidth: 2, borderColor: SG.cyan }]} testID="region-stage">
      <View style={styles.stageHud}>
        {!landscape && (
          <PressScale label={`Choose level. ${noun} ${level.id}: ${level.name}`} testID="gameplay-level" onPress={() => setSheet('levels')} containerStyle={styles.stageLevelSlot} style={styles.stageLevel}>
            <Ionicons name="grid" size={16} color={isDarkScreen ? P.white : P.ink} />
            <Text numberOfLines={1} style={[styles.stageLevelText, isDarkScreen && { color: P.white }]}>{level.id} · {level.name}</Text>
          </PressScale>
        )}
        <MiniBtn dark={isVoid} tone={tone} name="Puzzle details and settings" icon="information-circle-outline" onPress={() => setPuzzleDetails(true)} id="puzzle-details" />
        <MiniBtn dark={isVoid} tone={tone} name={Platform.OS === 'web' ? 'Retry level (R)' : 'Retry level'} icon="refresh" onPress={reset} id="reset" />
        <PressScale label={hint ? 'Hide hint' : 'Hint'} testID="hint" disabled={!level.hint.length || status === 'won' || status === 'lost'} onPress={() => {
          if (rewardedHintUnlocked) dispatchHint({ type: 'toggle' });
          else setHintPrompt(true);
        }} style={styles.smartHint}>
          <Ionicons name="bulb" size={20} color={P.ink} />
          <Text style={styles.smartHintText}>Hint</Text>
        </PressScale>
      </View>
      {!landscape && <View style={styles.stageCounters}>{ink}{hudCore}</View>}
      <GameBoard key={tag} modeKey={mode} engine={gameEngine} level={level} attempt={attempt} tool={tool} showHint={hint} hintStep={hintView.step} hintOverview={hintView.overview} guides={progress.settings.guides} paused={!internet.online || !cloud.playReady || pathname !== '/' || puzzleDetails || hintPrompt || sheet !== 'none' || !!adNexus.fullscreen || (rewardAction === 'retryInk' && canUsePendingReward && (rewardedAd.status === 'loading' || rewardedAd.status === 'ready'))} playSound={playSound} engineRef={engineRef} onHud={onHud} />
    </View>
  );

  return (
    <View style={[styles.outer, { backgroundColor: screenBg }]}>
      <SafeAreaView edges={safeAreaEdges} style={[styles.safeRoot, { backgroundColor: screenBg }]} testID="safe-area-game">
      {landscape ? (
        <View style={[styles.root, { backgroundColor: screenBg }, styles.rootRow, { paddingTop: contentInsets.top + 6, paddingBottom: contentInsets.bottom + 6 + mainBannerSpace, paddingLeft: contentInsets.left + 12, paddingRight: contentInsets.right + 12 }]} testID="layout-landscape">
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
        <View style={[styles.root, { backgroundColor: screenBg }, { paddingTop: contentInsets.top, paddingBottom: contentInsets.bottom + mainBannerSpace, paddingLeft: contentInsets.left, paddingRight: contentInsets.right }]} testID="layout-portrait">
          <View style={styles.column}>
            {frame}
            {outOfInkOffer}
            {tools}
          </View>
        </View>
      )}
      </SafeAreaView>

      {sheet === 'menu' && <MainMenu mode={mode} currentLevel={idx + 1} onContinue={continueGame}
        onSelectMode={m => switchMode(m, 'levels')} onRewards={() => setSheet('rewards')} />}

       {sheet === 'levels' && <LevelPicker deaths={vProg.deaths} badges={vProg.badges} title={isVoid ? 'Hardcore: The Void Protocol' : isGenesis ? 'The Genesis Gauntlet' : isSingularity ? 'Singularity Paradox' : hardcore ? 'Hardcore' : 'Garden beds'} noun={noun} levels={levels} unlocked={progress.unlocked} fastPasses={isGenesis ? appRewards.profile.genesisFastPasses : 0} stars={progress.stars} scores={active.progress.scores} bestTimes={active.progress.bestTimes} current={idx} onPick={load} onClose={continueGame} onHome={() => setSheet('menu')} />}
      {sheet === 'settings' && (
        <SettingsSheet
          dark={isVoid}
          tone={tone}
          haptics={progress.settings.haptics}
          guides={progress.settings.guides}
          sound={progress.settings.sound}
          onSound={(v) => setSetting('sound', v)}
          onHaptics={(v) => setSetting('haptics', v)}
          onGuides={(v) => setSetting('guides', v)}
          onPrivacy={() => router.push('/privacy')}
          resetLabel={isVoid ? 'Reset Void progress' : isGenesis ? 'Reset Genesis progress' : isSingularity ? 'Reset Singularity progress' : hardcore ? 'Reset Hardcore progress' : 'Reset progress'}
          onReset={() => {
            appRewards.clearModeSkips(mode);
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
          profile={appRewards.profile}
          now={appRewards.now}
          storageError={appRewards.storageError}
          canUseBrush={level.ink > 0 && !gameEngine.infiniteInk}
          canSkip={idx + 1 < levels.length && !fastPassTrialRef.current}
          inGenesis={isGenesis}
          adStatus={rewardedAd.status}
          pendingReward={rewardAction}
          adReady={adNexus.rewarded === 'ready'}
          message={rewardMessage ?? rewardedAd.message}
          onWatch={requestRewardedAction}
          onUseBrush={useGoldenBrush}
          onUseRefill={useInkRefill}
          onUseFastPass={useGenesisFastPass}
          onWheelWager={wagerWheel}
          onSkip={useLevelSkip}
          onEquipSkin={appRewards.equipSkin}
          onRetrySave={appRewards.retrySave}
          onClose={closeRewardHub}
        />
      )}
      {overlay && sheet === 'none' && status === 'won' && (
        <WinCard dark={isVoid} tone={tone} badge={badgeHere} deaths={isVoid ? deathsHere : undefined} level={level} stars={live?.stars ?? 1} score={hardcore ? live?.score : undefined} highScore={hardcore ? arcade.progress.scores[String(idx)] : undefined} bestTime={hardcore ? arcade.progress.bestTimes[String(idx)] : undefined} masterclass={isGenesis} trial={fastPassTrialRef.current} elapsed={live?.elapsed} hasNext={idx + 1 < levels.length && (!fastPassTrialRef.current || appRewards.profile.genesisFastPasses > 0)} onNext={() => { void leaveVictory(() => load(idx + 1)); }} onReplay={() => { void leaveVictory(reset); }} onLevels={() => { void leaveVictory(() => setSheet('levels')); }} />
      )}
      {overlay && sheet === 'none' && status === 'lost' && (hardcore || thermalFailure) && <HardcoreFail themed={isVoid} singularity={isSingularity} title={isVoid ? 'Voided' : isSingularity ? 'Collapsed' : hardcore ? 'Wilted' : 'Overheated'} reason={live?.fail ?? ''} onRetry={reset} rewardedRetry={rewardedRetry} />}
      {overlay && sheet === 'none' && status === 'lost' && !hardcore && !(level.thermalZone && live?.fail.includes('Thermal')) && (
        <LoseCard
          reason={live?.fail ?? ''}
          tone={tone}
          onRetry={reset}
          rewardedRetry={rewardedRetry}
          onHint={() => {
            reset();
            setHintPrompt(true);
          }}
          onLevels={() => setSheet('levels')}
        />
      )}
      <Modal visible={puzzleDetails} transparent animationType="slide" onRequestClose={() => setPuzzleDetails(false)}>
        <SafeAreaView style={[styles.detailsSafe, { backgroundColor: screenBg }]}>
          <ScrollView contentContainerStyle={styles.detailsContent}>
            <PressScale label="Close puzzle details and resume" testID="close-puzzle-details" onPress={() => setPuzzleDetails(false)} style={styles.detailsClose}>
              <Ionicons name="close" size={22} color={P.ink} />
              <Text style={styles.smartHintText}>Back to puzzle</Text>
            </PressScale>
            {header}
            {modeBar}
            {modBadges}
            {isVoid && hudBar}
            {captionEl}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <SmartHintPrompt visible={hintPrompt} busy={rewardAction === 'hint' && (hintWatchRequested || rewardedAd.status === 'loading' || rewardedAd.status === 'showing')} supported={rewardedAd.supported && appRewards.ready && !appRewards.storageError} message={rewardAction === 'hint' ? rewardedAd.message : appRewards.storageError ?? undefined} onClose={closeHintPrompt} onWatch={() => {
        setHintWatchRequested(true);
        requestRewardedAction('hint');
      }} />
    </View>
  );
}

function ToolBtn({ dark, tone, icon, label, active, disabled, onPress, id, size }: { dark?: boolean; tone?: string; icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; disabled?: boolean; onPress: () => void; id: string; size: number }) {
  const sing = tone === 'singularity';
  const genesis = tone === 'genesis';
  const themeStyle = sing ? styles.singBtn : genesis ? styles.gnBtn : undefined;
  const activeStyle = sing ? { backgroundColor: SG.panelHi, borderColor: SG.cyan } : genesis ? { backgroundColor: GN.panelHi, borderColor: GN.gold } : dark ? { backgroundColor: VD.purpleDeep, borderColor: VD.magenta } : styles.toolBtnOn;
  const iconColor = active ? P.white : sing ? SG.cyan : genesis ? GN.gold : dark ? VD.text : P.ink;
  const labelColor = sing ? SG.text : genesis ? GN.text : dark ? VD.text : P.ink;
  return (
    <PressScale onPress={onPress} disabled={disabled} testID={id} label={`${label} tool`} selected={active} style={[styles.toolBtn, dark && styles.vBtn, themeStyle, { width: size, height: size }, active && activeStyle]}>
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text style={[styles.toolLabel, { color: labelColor }, active && { color: P.white }]}>{label}</Text>
    </PressScale>
  );
}
function MiniBtn({ dark, tone, icon, onPress, disabled, active, id, name }: { dark?: boolean; tone?: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean; active?: boolean; id: string; name: string }) {
  const sing = tone === 'singularity';
  const genesis = tone === 'genesis';
  const themeStyle = sing ? styles.singBtn : genesis ? styles.gnBtn : undefined;
  return (
    <PressScale onPress={onPress} disabled={disabled} testID={id} label={name} selected={active} style={[styles.roundBtn, dark && styles.vBtn, themeStyle, active && { backgroundColor: sing ? SG.panelHi : genesis ? GN.panelHi : dark ? VD.purpleDeep : P.marigold }]}>
      <Ionicons name={icon} size={20} color={sing ? SG.cyan : genesis ? GN.gold : dark ? VD.text : P.ink} />
    </PressScale>
  );
}

const lift = { shadowColor: P.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 } as const;
const styles = StyleSheet.create({
  stageHud: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, padding: 4 },
  stageLevelSlot: { flex: 1, minWidth: 0 },
  stageLevel: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4 },
  stageLevelText: { flexShrink: 1, fontFamily: F.bold, fontSize: 13, color: P.ink },
  stageCounters: { paddingHorizontal: 4 },
  detailsSafe: { flex: 1 },
  detailsContent: { padding: 12, gap: 10 },
  detailsClose: { minHeight: 48, flexDirection: 'row', gap: 8, alignItems: 'center', alignSelf: 'flex-end', backgroundColor: P.marigold, borderRadius: R.btn, paddingHorizontal: 12 },
  smartHint: { minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: P.marigold, borderRadius: R.btn, shadowColor: P.marigold, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  smartHintText: { fontFamily: F.bold, color: P.ink, fontSize: 14 },
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
  gnBtn: { backgroundColor: GN.panel, borderColor: GN.amber, shadowColor: GN.orange },
  singBtn: { backgroundColor: SG.panel, borderColor: SG.cyan, shadowColor: SG.violet },
  gnChip: { color: GN.text, backgroundColor: GN.panelHi, borderColor: GN.amber },
  singChip: { color: SG.text, backgroundColor: SG.cyanDeep, borderColor: SG.cyan },
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
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 6, paddingBottom: 4, columnGap: 8, rowGap: 8 },
  toolGroup: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  toolBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: R.btn, backgroundColor: P.white, borderWidth: 3, borderColor: P.ink, ...lift },
  toolBtnOn: { backgroundColor: P.drop },
  toolLabel: { fontFamily: F.bold, fontSize: 10, color: P.ink },
  releaseSlot: { flexGrow: 1, flexBasis: 96, minWidth: 96 },
  release: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: P.coral, borderWidth: 3, borderColor: P.ink, borderRadius: R.btn, paddingHorizontal: 14, ...lift, shadowOffset: { width: 0, height: 5 } },
  releaseText: { fontFamily: F.bold, fontSize: 19, color: P.white, textTransform: 'uppercase', letterSpacing: 1 },
});
