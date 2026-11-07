export interface SessionSnapshot {
  accessToken: string | null;
  userId: string | null;
}

interface SessionRecoveryDependencies<
  Credentials extends { accessToken: string; userId: string },
> {
  getSession: () => SessionSnapshot;
  refresh: () => Promise<Credentials>;
  commit: (credentials: Credentials) => void;
  isAuthenticationFailure: (error: unknown) => boolean;
  terminate: (snapshot: SessionSnapshot) => Promise<void>;
}

/** HTTP and sockets share one refresh, including the credential commit. */
export function createSessionRecovery<
  Credentials extends { accessToken: string; userId: string },
>(dependencies: SessionRecoveryDependencies<Credentials>) {
  let pending:
    { snapshot: SessionSnapshot; promise: Promise<string | null> } | undefined;

  const refreshForToken = (failedToken: string): Promise<string | null> => {
    const snapshot = dependencies.getSession();
    if (!snapshot.accessToken || !snapshot.userId) return Promise.resolve(null);
    if (snapshot.accessToken !== failedToken)
      return Promise.resolve(snapshot.accessToken);
    if (pending?.snapshot === snapshot) return pending.promise;

    const promise = (async () => {
      try {
        const credentials = await dependencies.refresh();
        const current = dependencies.getSession();
        // Object identity also detects logout/login as the same user.
        if (current !== snapshot) {
          return current.userId === snapshot.userId
            ? current.accessToken
            : null;
        }
        if (credentials.userId !== snapshot.userId) return null;
        dependencies.commit(credentials);
        return credentials.accessToken;
      } catch (error) {
        if (
          dependencies.getSession() === snapshot &&
          dependencies.isAuthenticationFailure(error)
        ) {
          await dependencies.terminate(snapshot);
        }
        throw error;
      }
    })();
    pending = { snapshot, promise };
    void promise
      .finally(() => {
        if (pending?.promise === promise) pending = undefined;
      })
      .catch(() => {
        /* The caller handles the original rejection. */
      });
    return promise;
  };

  return { refreshForToken };
}
