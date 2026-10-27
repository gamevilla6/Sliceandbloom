export type InternetStatus = 'checking' | 'online' | 'offline';
export type InternetProbeTarget = { url: string; expectedStatus: number };

const INTERNET_PROBE = 'https://clients3.google.com/generate_204';

/** Check internet independently from the optional game-save API. */
export function createInternetProbeTarget(): InternetProbeTarget {
  return { url: INTERNET_PROBE, expectedStatus: 204 };
}

/** Fail-closed connectivity state, independent of React/native APIs for tests. */
export class InternetAccess {
  private snapshot: { status: InternetStatus } = { status: 'checking' };
  private listeners = new Set<() => void>();
  private generation = 0;
  private pending: Promise<boolean> | null = null;

  constructor(private probe: () => Promise<boolean>, private timeoutMs = 7000) {}
  getSnapshot = () => this.snapshot;
  isOnline = () => this.snapshot.status === 'online';
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private setStatus(status: InternetStatus) {
    if (status === this.snapshot.status) return;
    this.snapshot = { status };
    this.listeners.forEach(listener => listener());
  }
  disconnect = () => {
    this.generation++;
    this.pending = null;
    this.setStatus('offline');
  };
  suspend = () => {
    this.generation++;
    this.pending = null;
    this.setStatus('checking');
  };
  /** Explicit level starts block while checking; background checks do not flicker. */
  check = (blocking = false, force = false): Promise<boolean> => {
    if (blocking || !this.isOnline()) this.setStatus('checking');
    if (this.pending && !force) return this.pending;
    const generation = ++this.generation;
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<boolean>(resolve => {
      timer = setTimeout(() => resolve(false), this.timeoutMs);
    });
    const request = Promise.race([Promise.resolve().then(this.probe), timeout])
      .catch(() => false)
      .then(online => {
        if (generation !== this.generation) return false;
        this.setStatus(online ? 'online' : 'offline');
        return online;
      })
      .finally(() => {
        clearTimeout(timer);
        if (generation === this.generation) this.pending = null;
      });
    this.pending = request;
    return request;
  };
}
