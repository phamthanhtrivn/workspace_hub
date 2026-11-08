import assert from "node:assert/strict";
import { test } from "node:test";
import { createComposerSendController } from "./composer-send";

test("a slow send keeps the draft until confirmation and blocks duplicate clicks synchronously", async () => {
  const sender = createComposerSendController("channel");
  const response = Promise.withResolvers<boolean>();
  let requests = 0;
  let cleared = 0;
  const states: boolean[] = [];
  const unsubscribe = sender.subscribe(() => states.push(sender.getSnapshot()));
  const first = sender.run(() => { requests++; return response.promise; }, () => { cleared++; });
  assert.equal(sender.getSnapshot(), true);
  assert.equal(cleared, 0);
  assert.equal(await sender.run(async () => { requests++; return true; }, () => { cleared++; }), false);
  assert.equal(requests, 1);
  response.resolve(true);
  assert.equal(await first, true);
  assert.equal(cleared, 1);
  assert.deepEqual(states, [true, false]);
  unsubscribe();
});

test("a rejected or unsuccessful send retains the draft and allows an explicit retry", async () => {
  const sender = createComposerSendController();
  let cleared = 0;
  assert.equal(await sender.run(async () => false, () => { cleared++; }), false);
  await assert.rejects(sender.run(async () => { throw new Error("offline"); }, () => { cleared++; }), /offline/);
  assert.equal(cleared, 0);
  assert.equal(sender.getSnapshot(), false);
  assert.equal(await sender.run(async () => true, () => { cleared++; }), true);
  assert.equal(cleared, 1);
});

test("changing conversation or unmounting prevents late results from clearing another draft", async () => {
  const oldSender = createComposerSendController("old-thread");
  const response = Promise.withResolvers<boolean>();
  let cleared = 0;
  const pending = oldSender.run(() => response.promise, () => { cleared++; });
  oldSender.dispose();
  const newSender = createComposerSendController("new-thread");
  assert.equal(newSender.getSnapshot(), false);
  response.resolve(true);
  await pending;
  assert.equal(cleared, 0);
  assert.equal(await oldSender.run(async () => true, () => { cleared++; }), false);
});
