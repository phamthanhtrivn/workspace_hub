import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSessionRecovery,
  type SessionSnapshot,
} from "./session-recovery-core";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function fixture() {
  let session: SessionSnapshot = { accessToken: "expired", userId: "a" };
  let refreshes = 0;
  let terminations = 0;
  const response = deferred<{ accessToken: string; userId: string }>();
  const recovery = createSessionRecovery({
    getSession: () => session,
    refresh: () => {
      refreshes++;
      return response.promise;
    },
    commit: (credentials) => {
      session = credentials;
    },
    isAuthenticationFailure: (error) => error === "unauthorized",
    terminate: async (snapshot) => {
      if (snapshot === session) {
        terminations++;
        session = { userId: null, accessToken: null };
      }
    },
  });
  return {
    recovery,
    response,
    setSession: (next: SessionSnapshot) => {
      session = next;
    },
    get session() {
      return session;
    },
    get refreshes() {
      return refreshes;
    },
    get terminations() {
      return terminations;
    },
  };
}

test("three sockets and HTTP share one refresh and one credential commit", async () => {
  const f = fixture();
  const waiting = Array.from({ length: 4 }, () =>
    f.recovery.refreshForToken("expired"),
  );
  assert.equal(f.refreshes, 1);
  f.response.resolve({ accessToken: "new", userId: "a" });
  assert.deepEqual(await Promise.all(waiting), ["new", "new", "new", "new"]);
  assert.equal(await f.recovery.refreshForToken("expired"), "new");
  assert.equal(f.refreshes, 1);
});

for (const next of [
  { accessToken: null, userId: null },
  { accessToken: "b-token", userId: "b" },
  { accessToken: "new-login", userId: "a" },
]) {
  test(`late refresh cannot restore credentials after ${next.userId === null ? "logout" : next.accessToken}`, async () => {
    const f = fixture();
    const waiting = f.recovery.refreshForToken("expired");
    f.setSession(next);
    f.response.resolve({ accessToken: "stale", userId: "a" });
    await waiting;
    assert.equal(f.session, next);
  });
}

test("transient refresh errors preserve the session; authentication rejection terminates once", async () => {
  for (const error of ["unavailable", "unauthorized"]) {
    const f = fixture();
    const waiting = Promise.allSettled([
      f.recovery.refreshForToken("expired"),
      f.recovery.refreshForToken("expired"),
    ]);
    f.response.reject(error);
    await waiting;
    assert.equal(f.terminations, error === "unauthorized" ? 1 : 0);
    assert.equal(
      f.session.accessToken,
      error === "unauthorized" ? null : "expired",
    );
  }
});

test("a failed refresh from a previous account cannot terminate the new login", async () => {
  const f = fixture();
  const waiting = f.recovery.refreshForToken("expired");
  f.setSession({ accessToken: "b-token", userId: "b" });
  f.response.reject("unauthorized");
  await assert.rejects(waiting);
  assert.equal(f.terminations, 0);
  assert.equal(f.session.accessToken, "b-token");
});
