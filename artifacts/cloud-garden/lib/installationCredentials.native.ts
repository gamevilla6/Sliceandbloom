import * as SecureStore from "expo-secure-store";
import type { InstallationCredentials } from "./installationCredentialsTypes";

const KEY = "slice-bloom.private-cloud.v1";

export async function getInstallationCredentials(): Promise<InstallationCredentials | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw new Error("Private cloud credentials could not be read securely.");
  const candidate = value as Partial<InstallationCredentials>;
  if (typeof candidate.installationId !== "string" || typeof candidate.token !== "string") {
    throw new Error("Private cloud credentials are damaged; contact support before reinstalling.");
  }
  return candidate as InstallationCredentials;
}

export async function setInstallationCredentials(value: InstallationCredentials | null): Promise<void> {
  if (value === null) await SecureStore.deleteItemAsync(KEY);
  else await SecureStore.setItemAsync(KEY, JSON.stringify(value), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}
