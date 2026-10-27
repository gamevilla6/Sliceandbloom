import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CloudMode, CloudProgress, CloudProgressBundle } from "@/lib/cloudProgress";
import { getCloudSyncClient } from "@/lib/cloudSyncClient";
import type { CloudSyncClient } from "@/lib/cloudSyncClient";
import { useInternetAccess } from "@/components/InternetAccess";

type CloudStatus = "checking" | "offline" | "connecting" | "hydrating" | "ready" | "error";
type CloudSnapshot = {
  status: CloudStatus;
  error?: string;
  installationId?: string;
  progress: CloudProgressBundle;
  epoch: number;
  readyModes: Set<CloudMode>;
};
type CloudContextValue = CloudSnapshot & {
  playReady: boolean;
  retry: () => Promise<void>;
  syncMode: (mode: CloudMode, progress: CloudProgress) => Promise<CloudProgress>;
  markModeReady: (mode: CloudMode, epoch: number) => void;
};

const ALL_MODES: CloudMode[] = ["campaign", "hardcore", "genesis", "void", "singularity"];
const EMPTY: CloudSnapshot = { status: "checking", progress: {}, epoch: 0, readyModes: new Set() };
const CloudContext = createContext<CloudContextValue | null>(null);
const statusMessage = "Could not prepare your private cloud save. Check your connection and retry.";

function safeError(error: unknown) {
  if (error instanceof Error && /^(Private cloud|Cloud save authorization|Cloud save request failed \(\d+\)|Cloud sync timed out|Cloud sync is unavailable|Secure private-save storage is unavailable)/.test(error.message)) {
    return error.message;
  }
  return statusMessage;
}

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const internet = useInternetAccess();
  const client = useMemo<CloudSyncClient>(() => getCloudSyncClient(), []);
  const [snapshot, setSnapshot] = useState(EMPTY);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const generation = useRef(0);
  const activeRequest = useRef<Promise<void> | null>(null);
  const pendingWrites = useRef(new Map<CloudMode, { serialized: string; promise: Promise<CloudProgress> }>());

  const startSync = useCallback((): Promise<void> => {
    if (!internet.online) return Promise.resolve();
    if (activeRequest.current) return activeRequest.current;
    const epoch = ++generation.current;
    setSnapshot({ status: "connecting", progress: {}, epoch, readyModes: new Set() });
    const request = (async () => {
      let installationId: string | undefined;
      try {
        installationId = await client.getInstallationId();
        const remoteProgress = await client.load();
        if (epoch !== generation.current || !internet.isOnline()) return;
        setSnapshot({ status: "hydrating", installationId, progress: remoteProgress, epoch, readyModes: new Set() });
      } catch (error) {
        if (epoch === generation.current && internet.isOnline()) {
          const message = safeError(error);
          setSnapshot({ status: "error", installationId, error: message, progress: {}, epoch, readyModes: new Set() });
        }
      }
    })().finally(() => {
      if (activeRequest.current === request) activeRequest.current = null;
    });
    activeRequest.current = request;
    return request;
  }, [client, internet.online, internet.isOnline]);

  useEffect(() => {
    if (internet.online) void startSync();
    else {
      generation.current++;
      activeRequest.current = null;
      setSnapshot({ ...snapshotRef.current, status: internet.status === "checking" ? "checking" : "offline" });
    }
  }, [internet.online, internet.status, startSync]);

  const retry = useCallback(async () => {
    await startSync();
  }, [startSync]);

  const syncMode = useCallback(async (mode: CloudMode, progress: CloudProgress) => {
    const epoch = generation.current;
    if (!internet.isOnline() || !["hydrating", "ready"].includes(snapshotRef.current.status)) {
      throw new Error(statusMessage);
    }
    const serialized = JSON.stringify(progress);
    const pending = pendingWrites.current.get(mode);
    if (pending?.serialized === serialized) return pending.promise;
    const cached = snapshotRef.current.progress[mode];
    if (!pending && cached && JSON.stringify(cached) === serialized) return cached;
    const promise = (async () => {
      try {
        const saved = await client.syncMode(mode, progress);
        if (epoch !== generation.current || !internet.isOnline()) throw new Error(statusMessage);
        setSnapshot((current) => ({
          ...current,
          progress: { ...current.progress, [mode]: saved },
        }));
        return saved;
      } catch (error) {
        if (epoch === generation.current && internet.isOnline()) {
          setSnapshot((current) => ({ ...current, status: "error", error: statusMessage, readyModes: new Set() }));
        }
        throw error;
      }
    })();
    pendingWrites.current.set(mode, { serialized, promise });
    try { return await promise; }
    finally {
      if (pendingWrites.current.get(mode)?.promise === promise) pendingWrites.current.delete(mode);
    }
  }, [client, internet.isOnline]);

  const markModeReady = useCallback((mode: CloudMode, epoch: number) => {
    if (epoch !== generation.current || !internet.isOnline()) return;
    setSnapshot((current) => {
      if (current.epoch !== epoch || !["hydrating", "ready"].includes(current.status)) return current;
      const readyModes = new Set(current.readyModes);
      readyModes.add(mode);
      return {
        ...current,
        readyModes,
        status: ALL_MODES.every((key) => readyModes.has(key)) ? "ready" : "hydrating",
      };
    });
  }, [internet.isOnline]);

  const value = useMemo<CloudContextValue>(() => ({
    ...snapshot,
    // Gameplay needs verified internet, not a successful optional cloud save.
    playReady: internet.online,
    retry, syncMode, markModeReady,
  }), [snapshot, internet.online, retry, syncMode, markModeReady]);
  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

export function useCloudSync() {
  const value = useContext(CloudContext);
  if (!value) throw new Error("CloudSyncProvider is required.");
  return value;
}
