import type { InstallationCredentials } from "./installationCredentialsTypes";
export type { InstallationCredentials } from "./installationCredentialsTypes";

// Expo selects the .native or .web adapter before this fallback at runtime.
// Keep an explicit failure for non-platform resolution; never store a token
// unencrypted as a fallback.
export async function getInstallationCredentials(): Promise<InstallationCredentials | null> {
  throw new Error("Secure private-save storage is unavailable on this platform.");
}

export async function setInstallationCredentials(_value: InstallationCredentials | null): Promise<void> {
  throw new Error("Secure private-save storage is unavailable on this platform.");
}
