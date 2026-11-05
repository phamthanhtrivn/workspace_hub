export function isPrivateStorageReference(source: string): boolean {
  if (!source.startsWith("/api/") || source.startsWith("//")) return false;
  const url = new URL(source, "https://storage-reference.invalid");
  if (url.origin !== "https://storage-reference.invalid" || url.hash) return false;
  if (/^\/api\/users\/avatars\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp)$/i.test(url.pathname)) return !url.search;
  if (/^\/api\/calendar\/pomodoro\/audios\/[a-z0-9_-]+\/access-url$/i.test(url.pathname)) return !url.search;
  return url.pathname === "/api/medias/access-url" && [...url.searchParams.keys()].length === 1 && url.searchParams.has("key");
}

export function isLegacyStorageUrl(source: string): boolean {
  try {
    const url = new URL(source);
    return url.hostname.endsWith(".cloudfront.net") ||
      (/\.s3[.-].*amazonaws\.com$/.test(url.hostname) && !url.searchParams.has("X-Amz-Signature"));
  } catch { return false; }
}
