import assert from 'node:assert/strict';
import { until } from '../support.mjs';

export async function joinSocket(h, meeting, actor = h.actors.member) {
  const client = await h.socket(actor);
  const reply = await client
    .timeout(3000)
    .emitWithAck('meeting:join', { meetingId: meeting.id });
  assert.equal(reply.joined, true);
  return client;
}

export async function holdProvider(h, path, operation, during) {
  let release;
  h.providers.holds.set(
    path,
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  const count = h.providers.calls.filter((call) => call.path === path).length;
  const pending = operation();
  try {
    await until(
      () =>
        h.providers.calls.filter((call) => call.path === path).length > count,
      'request reached held provider',
      5000,
    );
    await during();
  } finally {
    release();
    h.providers.holds.delete(path);
  }
  return pending;
}

export async function afterParticipantCheck(h, actor, operation, during) {
  let release, entered;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const reached = new Promise((resolve) => {
    entered = resolve;
  });
  const original = h.policy.assertJoinedMeetingParticipant;
  h.policy.assertJoinedMeetingParticipant = async function (params, ...args) {
    const result = await original.call(this, params, ...args);
    if (params.userId === actor.id) {
      entered();
      await gate;
    }
    return result;
  };
  const pending = operation();
  try {
    await Promise.race([
      reached,
      new Promise((_, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Participant check not reached')),
          5000,
        );
        timeout.unref();
      }),
    ]);
    await during();
  } finally {
    release();
    h.policy.assertJoinedMeetingParticipant = original;
  }
  return pending;
}
