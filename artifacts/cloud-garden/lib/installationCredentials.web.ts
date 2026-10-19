import type { InstallationCredentials } from "./installationCredentialsTypes";

const KEY = "slice-bloom:private-cloud:v1";

export async function getInstallationCredentials(): Promise<InstallationCredentials | null> {
  if (typeof window === "undefined") throw new Error("Private cloud save is unavailable in this browser.");
  const raw = window.localStorage.getItem(KEY);
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw new Error("Private cloud credentials could not be read.");
  const candidate = value as Partial<InstallationCredentials>;
  if (typeof candidate.installationId !== "string" || typeof candidate.token !== "string") {
    throw new Error("Private cloud credentials are damaged; contact support before clearing browser data.");
  }
  return candidate as InstallationCredentials;
}

export async function setInstallationCredentials(value: InstallationCredentials | null): Promise<void> {
  if (typeof window === "undefined") throw new Error("Private cloud save is unavailable in this browser.");
  if (value === null) window.localStorage.removeItem(KEY);
  else window.localStorage.setItem(KEY, JSON.stringify(value));
}
