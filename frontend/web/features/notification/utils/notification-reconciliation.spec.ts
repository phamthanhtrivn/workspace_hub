import { test } from "node:test";
import assert from "node:assert/strict";
import { startNotificationReconciliation } from "./notification-reconciliation";

test("notifications reconcile without a socket event, when returning to the tab, and on the fallback interval", async () => {
  const events = new EventTarget();
  let tick: (() => void) | undefined;
  let refreshed = 0;
  let cancelled = false;
  const stop = startNotificationReconciliation({
    events,
    isVisible: () => true,
    refresh: () => {
      refreshed++;

      return Promise.resolve();
    },
    schedule: (callback) => {
      tick = callback;

      return () => {
        cancelled = true;
      };
    },
  });
  await Promise.resolve();
  assert.equal(refreshed, 1);
  events.dispatchEvent(new Event("focus"));
  await Promise.resolve();
  assert.equal(refreshed, 2);
  tick?.();
  await Promise.resolve();
  assert.equal(refreshed, 3);
  stop();
  assert.equal(cancelled, true);
  events.dispatchEvent(new Event("online"));
  tick?.();
  await Promise.resolve();
  assert.equal(refreshed, 3);
});
test("background tabs skip polling, and failed refreshes allow the next attempt", async () => {
  const events = new EventTarget();
  let tick: (() => void) | undefined;
  let visible = false;
  let attempts = 0;
  const stop = startNotificationReconciliation({
    events,
    isVisible: () => visible,
    refresh: () => {
      attempts++;

      return attempts === 1
        ? Promise.reject(new Error("Offline"))
        : Promise.resolve();
    },
    schedule: (callback) => {
      tick = callback;

      return () => {};
    },
  });
  tick?.();
  assert.equal(attempts, 0);
  visible = true;
  events.dispatchEvent(new Event("online"));
  await Promise.resolve();
  await Promise.resolve();
  tick?.();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(attempts, 2);
  stop();
});
