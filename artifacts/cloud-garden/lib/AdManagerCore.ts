/** SDK-independent ad lifecycle. No engine/frame-loop dependency. */
export type AdKind = 'rewarded' | 'interstitial';
export type AdStatus = 'idle' | 'loading' | 'ready' | 'showing' | 'unavailable';
export type EarnedReward = { amount: number; type: string };
export interface AdPort {
  load(): void;
  show(): Promise<unknown>;
  on(event: 'loaded' | 'closed' | 'error' | 'earned', callback: (reward?: EarnedReward) => void): () => void;
  destroy(): void;
}
export interface AdAdapter {
  initialize(): Promise<unknown>;
  create(kind: AdKind): AdPort;
}
export interface AdStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> }
export const AD_CADENCE_KEY = 'cloud-garden:ad-nexus:v1';
export const AD_CACHE_MS = 45 * 60 * 1000; // under Google's one-hour cache lifetime
type Slot = { ad?: AdPort; cleanup: (() => void)[]; timer?: ReturnType<typeof setTimeout>;
  retry?: ReturnType<typeof setTimeout>; loadedAt: number; failures: number; generation: number };
export type AdSnapshot = Readonly<{
  supported: boolean; rewarded: AdStatus; interstitial: AdStatus;
  fullscreen: AdKind | null; completionCount: number; storageError?: string;
  rewardedMessage?: string; interstitialMessage?: string;
}>;
const emptySlot = (): Slot => ({ cleanup: [], loadedAt: 0, failures: 0, generation: 0 });

export class AdManagerCore {
  private slots: Record<AdKind, Slot> = { rewarded: emptySlot(), interstitial: emptySlot() };
  private snapshot: AdSnapshot;
  private listeners = new Set<() => void>();
  private started?: Promise<void>;
  private writes: Promise<unknown> = Promise.resolve();
  private seen: string[] = [];
  private dueAttempt: string | null = null;
  private active = true;
  private disposed = false;
  private earned: EarnedReward | null = null;
  private grant?: (reward: EarnedReward) => void;
  private finishBreak?: (shown: boolean) => void;

  constructor(private adapter: AdAdapter | null, private storage: AdStorage, private now = Date.now) {
    this.snapshot = { supported: !!adapter, rewarded: adapter ? 'idle' : 'unavailable',
      interstitial: adapter ? 'idle' : 'unavailable', fullscreen: null, completionCount: 0 };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private patch(p: Partial<AdSnapshot>) {
    if (this.disposed) return;
    this.snapshot = { ...this.snapshot, ...p };
    this.listeners.forEach(fn => fn());
  }
  /** Restores only cadence, then preloads asynchronously; never waits for an ad. */
  start = () => {
    if (!this.started) this.started = (async () => {
      let restoreTimeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const raw = await Promise.race([this.storage.getItem(AD_CADENCE_KEY),
          new Promise<never>((_, reject) => { restoreTimeout = setTimeout(() => reject(new Error('Cadence restore timed out')), 1000); })]);
        if (raw) {
          const saved = JSON.parse(raw);
          if (!Number.isSafeInteger(saved.count) || saved.count < 0) throw new Error('Invalid ad cadence');
          this.seen = Array.isArray(saved.seen) ? saved.seen.filter((v: unknown) => typeof v === 'string').slice(-128) : [];
          this.patch({ completionCount: saved.count });
        }
      } catch {
        this.patch({ storageError: 'Ad cadence could not be restored; forced ads are skipped until it can be saved.' });
      } finally { clearTimeout(restoreTimeout); }
      if (!this.disposed) { this.preload('rewarded'); this.preload('interstitial'); }
    })();
    return this.started;
  };
  setAppActive = (active: boolean) => {
    this.active = active;
    if (active) { this.preload('rewarded'); this.preload('interstitial'); }
  };
  private clear(kind: AdKind) {
    const slot = this.slots[kind];
    slot.generation++;
    clearTimeout(slot.timer); clearTimeout(slot.retry);
    slot.cleanup.splice(0).forEach(fn => fn());
    slot.ad?.destroy(); slot.ad = undefined;
  }
  preload = (kind: AdKind, manualRetry = false) => {
    if (!this.adapter || !this.active || this.disposed) return;
    const slot = this.slots[kind], state = this.snapshot[kind];
    if (state === 'loading' || state === 'showing') return;
    if (state === 'ready' && this.now() - slot.loadedAt < AD_CACHE_MS) return;
    if (!manualRetry && slot.failures >= 3) return; // bounded background requests
    this.clear(kind);
    const generation = slot.generation;
    const current = () => !this.disposed && generation === slot.generation;
    this.patch({ [kind]: 'loading', [`${kind}Message`]: undefined });
    // Includes consent/initialization. The timeout frees the UI, not the native
    // consent dialog; a late initialization never creates an orphaned ad.
    slot.timer = setTimeout(() => { if (current()) this.failed(kind, 'Ad loading timed out. Continue playing or retry later.'); }, 15000);
    void this.adapter.initialize().then(() => {
      if (!current()) return;
      const ad = this.adapter!.create(kind); slot.ad = ad;
      slot.cleanup.push(
        ad.on('loaded', () => {
          if (!current() || this.snapshot[kind] !== 'loading') return;
          clearTimeout(slot.timer);
          slot.loadedAt = this.now(); slot.failures = 0;
          this.patch({ [kind]: 'ready', [`${kind}Message`]: undefined });
          slot.timer = setTimeout(() => {
            if (current() && this.snapshot[kind] === 'ready') {
              this.patch({ [kind]: 'idle' });
              this.preload(kind);
            }
          }, AD_CACHE_MS);
        }),
        ad.on('earned', reward => {
          if (current() && kind === 'rewarded' && this.snapshot.fullscreen === kind && !this.earned
            && reward && Number.isFinite(reward.amount)) this.earned = reward;
        }),
        ad.on('closed', () => {
          if (!current() || this.snapshot.fullscreen !== kind) return;
          const reward = this.earned, grant = this.grant, finish = this.finishBreak;
          this.earned = null; this.grant = undefined; this.finishBreak = undefined;
          this.clear(kind);
          this.patch({ [kind]: 'idle', fullscreen: null,
            [`${kind}Message`]: kind === 'rewarded' && !reward ? 'Video closed before a reward was earned. Normal retry is always available.' : undefined });
          try { if (kind === 'rewarded' && reward) grant?.(reward); } finally {
            finish?.(true);
            this.preload(kind);
          }
        }),
        ad.on('error', () => { if (current()) this.failed(kind, 'No ad is available right now. Continue playing or retry later.'); }),
      );
      ad.load();
    }).catch(() => { if (current()) this.failed(kind, 'Ads could not start. Normal gameplay remains available.'); });
  };
  private failed(kind: AdKind, message: string) {
    const wasShowing = this.snapshot.fullscreen === kind;
    const finish = wasShowing ? this.finishBreak : undefined;
    if (wasShowing) { this.finishBreak = undefined; this.grant = undefined; this.earned = null; }
    this.clear(kind);
    const slot = this.slots[kind]; slot.failures++;
    this.patch({ [kind]: 'unavailable', [`${kind}Message`]: message, ...(wasShowing ? { fullscreen: null } : {}) });
    finish?.(false);
    if (slot.failures < 3 && this.active && !this.disposed)
      slot.retry = setTimeout(() => this.preload(kind), 15000 * slot.failures);
  }
  private ready(kind: AdKind) {
    if (!this.active || this.snapshot.fullscreen || this.snapshot[kind] !== 'ready') return false;
    if (this.now() - this.slots[kind].loadedAt >= AD_CACHE_MS) {
      this.preload(kind); return false;
    }
    return true;
  }
  private show(kind: AdKind) {
    const generation = this.slots[kind].generation;
    clearTimeout(this.slots[kind].timer);
    this.patch({ [kind]: 'showing', fullscreen: kind });
    try {
      void this.slots[kind].ad!.show().catch(() => {
        if (generation === this.slots[kind].generation) this.failed(kind, 'Ad could not be shown. Continue playing normally.');
      });
    } catch {
      this.failed(kind, 'Ad could not be shown. Continue playing normally.');
    }
  }
  showRewarded = (grant: (reward: EarnedReward) => void) => {
    if (!this.ready('rewarded')) { this.preload('rewarded', true); return false; }
    this.earned = null; this.grant = grant;
    this.show('rewarded');
    return true;
  };
  /** Count real wins once across every mode; skips/failures never call this. */
  recordCompletion = async (attempt: string) => {
    await this.start();
    if (this.disposed || !attempt || this.seen.includes(attempt)) return;
    this.seen = [...this.seen, attempt].slice(-128);
    const count = this.snapshot.completionCount + 1;
    this.dueAttempt = count % 3 === 0 ? attempt : null;
    this.patch({ completionCount: count });
    const saved = JSON.stringify({ count, seen: this.seen });
    this.writes = this.writes.catch(() => {}).then(() => this.storage.setItem(AD_CADENCE_KEY, saved))
      .then(() => this.patch({ storageError: undefined }))
      .catch(() => this.patch({ storageError: 'Ad cadence could not be saved; forced ads are skipped.' }));
    this.preload('interstitial');
  };
  /**
   * Called ONLY on leaving the victory card. A missed/no-fill opportunity is
   * consumed, never deferred to a fourth win, gameplay, menu open or app launch.
   */
  interstitialAtVictoryBreak = async (attempt: string): Promise<boolean> => {
    await this.start();
    if (this.dueAttempt !== attempt) return false;
    this.dueAttempt = null;
    if (this.snapshot.storageError || !this.ready('interstitial')) { this.preload('interstitial', true); return false; }
    return new Promise(resolve => {
      this.finishBreak = resolve;
      this.show('interstitial');
    });
  };
  dispose() {
    this.disposed = true;
    this.clear('rewarded'); this.clear('interstitial');
    this.finishBreak?.(false); this.finishBreak = undefined;
    this.grant = undefined; this.earned = null; this.listeners.clear();
  }
}
