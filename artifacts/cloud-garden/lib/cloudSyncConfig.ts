/** Resolve the private-save API before falling back to the current browser host. */
export function resolveCloudApiBaseUrl(
  configuredValue: string | undefined,
  publishedValue: string | undefined,
  webOrigin: string | undefined,
  isDev: boolean,
): string {
  const configured = configuredValue?.trim();
  const published = publishedValue?.trim();
  const browserFallback = webOrigin ? new URL("/api", webOrigin).toString() : undefined;
  const raw = configured || published || browserFallback;
  if (!raw) throw new Error("Private cloud sync is not configured.");

  const url = new URL(raw);
  if (!isDev && url.protocol !== "https:") {
    throw new Error("Cloud saves require a secure connection.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Private cloud URL is invalid.");
  }
  return url.toString().replace(/\/+$/, "");
}
