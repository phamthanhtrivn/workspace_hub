const SESSION_LOCK = "workspacehub-auth-session";
let queue: Promise<void> = Promise.resolve();

/** Serialize cookie mutations across tabs so a refresh never replays a just-rotated cookie. */
export function withSessionLock<T>(request: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    if (typeof navigator !== "undefined" && navigator.locks) {
      return await navigator.locks.request(SESSION_LOCK, request);
    }
    return await request();
  };
  const operation = queue.then(run, run);
  queue = operation.then(() => undefined, () => undefined);
  return operation;
}
