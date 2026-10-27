import Constants from "expo-constants";
import {
  CLOUD_PROGRESS_MODES,
  parseCloudProgress,
  type CloudMode,
  type CloudProgress,
  type CloudProgressBundle,
} from "./cloudProgress";
import { getInstallationCredentials, setInstallationCredentials, type InstallationCredentials } from "./installationCredentials";
import { resolveCloudApiBaseUrl } from "./cloudSyncConfig";

const REQUEST_TIMEOUT_MS = 8000;
export type CloudSyncMode = "campaign" | "hardcore" | "genesis" | "void" | "singularity";

export class CloudSyncClient {
  private credentials?: InstallationCredentials;
  private credentialLoad?: Promise<InstallationCredentials>;
  private writes = new Map<CloudMode, Promise<unknown>>();
  private baseUrl: string;
  private readonly fetcher: typeof fetch;
  constructor(baseUrl: string | undefined, fetcher?: typeof fetch) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    // Preserve the browser's Window receiver; unbound window.fetch throws
    // "Illegal invocation" in web previews.
    this.fetcher = fetcher ?? globalThis.fetch.bind(globalThis);
  }
  private async getCredentials() {
    if (this.credentials) return this.credentials;
    if (!this.credentialLoad) this.credentialLoad = (async () => {
      const stored = await getInstallationCredentials();
      if (stored) return stored;
      const created = await this.request<InstallationCredentials>("/game/install", { method: "POST" }, false);
      validateCredentials(created);
      await setInstallationCredentials(created);
      return created;
    })().finally(() => { this.credentialLoad = undefined; });
    this.credentials = await this.credentialLoad;
    return this.credentials;
  }
  private async request<T>(path: string, init: RequestInit = {}, authorized = true): Promise<T> {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS);
    try {
      if (!this.baseUrl) throw new Error("Cloud sync is unavailable.");
      const credentials = authorized ? await this.getCredentials() : undefined;
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        ...init,
        signal: abort.signal,
        headers: {
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(credentials ? { Authorization: `Bearer ${credentials.token}` } : {}),
          ...init.headers,
        },
      });
      if (!response.ok) throw new Error(response.status === 401
        ? "Private cloud save could not be verified. Retry or contact support."
        : `Cloud save request failed (${response.status}).`);
      if (response.status === 204) return undefined as T;
      try { return await response.json() as T; }
      catch { throw new Error("Cloud save returned an invalid response."); }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Private cloud")
        || error instanceof Error && error.message.startsWith("Cloud save")) throw error;
      throw new Error(abort.signal.aborted
        ? "Cloud sync timed out. Check your connection and retry."
        : "Cloud sync is unavailable. Check your connection and retry.");
    } finally {
      clearTimeout(timeout);
    }
  }
  async load(): Promise<CloudProgressBundle> {
    const response = await this.request<{ progress?: unknown }>("/game/sync");
    const raw = response.progress;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Private cloud save is malformed.");
    const result: CloudProgressBundle = {};
    for (const [mode, value] of Object.entries(raw)) {
      if (!(mode in CLOUD_PROGRESS_MODES)) throw new Error("Private cloud save contains an unknown mode.");
      result[mode as CloudMode] = parseCloudProgress(mode as CloudMode, value);
    }
    return result;
  }
  async getInstallationId() {
    return (await this.getCredentials()).installationId;
  }
  syncMode(mode: CloudMode, progress: CloudProgress): Promise<CloudProgress> {
    const previous = this.writes.get(mode) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      const result = await this.request<{ progress?: unknown }>(`/game/sync/${mode}`, {
        method: "PUT",
        body: JSON.stringify({ progress }),
      });
      return parseCloudProgress(mode, result.progress);
    });
    this.writes.set(mode, next);
    return next;
  }
  async deleteProfile(): Promise<void> {
    await this.request<void>("/game/install", { method: "DELETE" });
    this.credentials = undefined;
    this.credentialLoad = undefined;
    await setInstallationCredentials(null);
  }
}

function validateCredentials(value: unknown): asserts value is InstallationCredentials {
  if (!value || typeof value !== "object") throw new Error("Private cloud credentials are invalid.");
  const credentials = value as Partial<InstallationCredentials>;
  if (typeof credentials.installationId !== "string"
    || !/^[0-9a-f-]{36}$/i.test(credentials.installationId)
    || typeof credentials.token !== "string"
    || !/^[A-Za-z0-9_-]{43}$/.test(credentials.token)) {
    throw new Error("Private cloud credentials are invalid.");
  }
}

function apiBaseUrl() {
  const webOrigin = typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : undefined;
  return resolveCloudApiBaseUrl(
    process.env.EXPO_PUBLIC_API_BASE_URL,
    Constants.expoConfig?.extra?.apiBaseUrl,
    webOrigin,
    __DEV__,
  );
}

let client: CloudSyncClient | undefined;
export function getCloudSyncClient() {
  if (!client) {
    let baseUrl: string | undefined;
    try {
      baseUrl = apiBaseUrl();
    } catch {
      // A missing optional sync configuration must not prevent local gameplay.
    }
    client = new CloudSyncClient(baseUrl);
  }
  return client;
}
