export function getSafeInternalPath(value: string | string[] | undefined, fallback = "/leagues") {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
}
