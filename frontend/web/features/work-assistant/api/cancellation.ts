import { cancelRequest } from "./work-assistant.api";

type Cancellation = { id: string; sessionId: string; pending: Promise<void> };
const cancellations = new Map<string, Cancellation>();

export function cancelStream(
  userId: string,
  id: string,
  sessionId: string,
): Promise<void> {
  const previous = cancellations.get(userId);
  const pending = (async () => {
    if (previous) {
      try {
        await previous.pending;
      } catch {
        if (previous.id !== id)
          await cancelRequest(previous.id, previous.sessionId);
      }
    }
    await cancelRequest(id, sessionId);
  })();
  const cancellation = { id, sessionId, pending };
  cancellations.set(userId, cancellation);
  void pending.then(
    () => {
      if (cancellations.get(userId) === cancellation)
        cancellations.delete(userId);
    },
    () => {},
  );

  return pending;
}

export async function confirmCancellation(userId: string) {
  const cancellation = cancellations.get(userId);
  if (!cancellation) return;
  try {
    await cancellation.pending;
  } catch {
    await cancelStream(userId, cancellation.id, cancellation.sessionId);
  }
}
