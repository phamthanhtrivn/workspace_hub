import { z } from "zod";

const shareAttemptSchema = z.object({
  introRequestId: z.string().uuid(),
  documentRequestId: z.string().uuid(),
  introSent: z.boolean(),
});

export type DocumentChatShareAttempt = z.infer<typeof shareAttemptSchema>;

const pendingAttempts = new Map<string, DocumentChatShareAttempt>();

// Only opaque IDs and progress are stored. Document content/intro text is never persisted.
// Storage is scoped to the account and a digest of the immutable share payload.
export async function getDocumentChatShareAttempt(
  userId: string,
  payload: readonly unknown[],
): Promise<{
  attempt: DocumentChatShareAttempt;
  save: () => void;
  complete: () => void;
}> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const key = `document-chat-share:${userId}:${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")}`;
  let storage: Storage | undefined;
  try {
    storage = window.sessionStorage;
  } catch {
    /* Private browsing may disable storage. */
  }
  let attempt = pendingAttempts.get(key);
  try {
    const saved = shareAttemptSchema.safeParse(
      JSON.parse(storage?.getItem(key) ?? "null"),
    );
    if (!attempt && saved.success) attempt = saved.data;
  } catch {
    /* Ignore unavailable or corrupt storage. */
  }
  attempt ??= {
    introRequestId: crypto.randomUUID(),
    documentRequestId: crypto.randomUUID(),
    introSent: false,
  };
  const current = attempt;
  pendingAttempts.set(key, current);

  return {
    attempt: current,
    save: () => {
      try {
        storage?.setItem(key, JSON.stringify(current));
      } catch {
        /* Keep in-memory retry state. */
      }
    },
    complete: () => {
      pendingAttempts.delete(key);
      try {
        storage?.removeItem(key);
      } catch {
        /* No content is stored. */
      }
    },
  };
}
