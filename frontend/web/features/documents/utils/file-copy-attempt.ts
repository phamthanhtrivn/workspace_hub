const memory = new Map<string, string>();
export async function fileCopyAttempt(
  actorId: string,
  context: string,
  refs: { id: string; versionId?: string }[],
) {
  const signature = JSON.stringify([
    actorId,
    context,
    refs
      .map((ref) => [ref.id, ref.versionId])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  ]);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(signature),
  );
  const key = `file-copy:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  let operationId = memory.get(key);
  try {
    operationId ??= sessionStorage.getItem(key) || undefined;
  } catch {
    /* Memory fallback for restricted storage. */
  }
  operationId ??= crypto.randomUUID();
  memory.set(key, operationId);
  try {
    sessionStorage.setItem(key, operationId);
  } catch {
    /* Only the opaque operation ID is persisted. */
  }

  return {
    operationId,
    complete: () => {
      memory.delete(key);
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* Memory-only session. */
      }
    },
  };
}
