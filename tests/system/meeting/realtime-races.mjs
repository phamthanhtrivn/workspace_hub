import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afterParticipantCheck, joinSocket } from './helpers.mjs';
import { until } from '../support.mjs';

export function registerRealtimeRaceTests(h) {
  test('SOCKET-01: joined member receives chat; outsider cannot subscribe; kick removes the room', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    const member = await joinSocket(h, meeting),
      outsider = await h.socket(h.actors.outsider);
    const denied = await outsider
      .timeout(3000)
      .emitWithAck('meeting:join', { meetingId: meeting.id });
    assert.equal(denied.joined, false);
    const received = [],
      removed = [];
    member.on('meeting:message_sent', (message) => received.push(message));
    member.on('meeting:participant_removed', (payload) =>
      removed.push(payload),
    );
    const message = await h.request(`/${meeting.joinToken}/messages`, {
      method: 'POST',
      body: { content: 'Socket audit' },
      status: 201,
    });
    await until(
      () => received.some((payload) => payload.id === message.payload.id),
      'real Socket.IO chat delivery',
      5000,
    );
    await h.request(
      `/${meeting.joinToken}/participants/${h.actors.member.id}/remove`,
      { method: 'POST', body: {}, status: 201 },
    );
    await until(
      () => removed.some((payload) => payload.userId === h.actors.member.id),
      'removed member receives their own kick notification',
      5000,
    );
    await until(
      () =>
        !h.io.sockets.sockets
          .get(member.id)
          ?.rooms.has(h.rooms.meeting(meeting.id)),
      'socket eviction after kick',
      5000,
    );
    member.close();
    outsider.close();
  });

  test('SOCKET-02: revoked meeting membership cannot receive private events through a stale socket room', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    const member = await joinSocket(h, meeting),
      host = await joinSocket(h, meeting, h.actors.host);
    const received = [];
    member.on('meeting:message_sent', (message) => received.push(message));
    // Simulate a missed eviction on another node: database revocation is authoritative.
    await h.db.meetingParticipant.updateMany({
      where: { meetingId: meeting.id, userId: h.actors.member.id },
      data: { status: 'REMOVED', requiresReadmission: true },
    });
    const marker = new Promise((resolve) =>
      host.once('meeting:message_sent', resolve),
    );
    const message = await h.request(`/${meeting.joinToken}/messages`, {
      method: 'POST',
      body: { content: 'Private after revocation' },
      status: 201,
    });
    await Promise.race([
      marker,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Host did not receive marker')),
          3000,
        ).unref(),
      ),
    ]);
    // Flush all active-session authorization/emission work before a negative assertion.
    await new Promise((resolve) => setTimeout(resolve, 150));
    member.close();
    host.close();
    assert.ok(
      !received.some((payload) => payload.id === message.payload.id),
      'stale room must not bypass current meeting membership',
    );
  });

  test('RACE-01: ending while a screen-share claim is in flight cannot restore sharing on an ended room', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    const response = await afterParticipantCheck(
      h,
      h.actors.member,
      () =>
        h.request(`/${meeting.joinToken}/screen-share/start`, {
          actor: h.actors.member,
          method: 'POST',
          body: {},
        }),
      () =>
        h.request(`/${meeting.joinToken}/end`, {
          method: 'POST',
          body: {},
          status: 201,
        }),
    );
    const ended = await h.db.meeting.findUniqueOrThrow({
      where: { id: meeting.id },
    });
    assert.equal(ended.status, 'ENDED');
    assert.equal(
      ended.activeScreenShareUserId,
      null,
      `late screen-share HTTP ${response.status} must preserve terminal state`,
    );
  });

  test('RACE-02: ending while send-message authorization is in flight cannot insert a late chat message', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    const response = await afterParticipantCheck(
      h,
      h.actors.member,
      () =>
        h.request(`/${meeting.joinToken}/messages`, {
          actor: h.actors.member,
          method: 'POST',
          body: { content: 'Racing room end' },
        }),
      () =>
        h.request(`/${meeting.joinToken}/end`, {
          method: 'POST',
          body: {},
          status: 201,
        }),
    );
    assert.equal(
      await h.db.meetingMessage.count({ where: { meetingId: meeting.id } }),
      0,
      `late send HTTP ${response.status} must not commit`,
    );
  });

  test('REACTION-01: only joined participants send supported room reactions through the socket', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    const client = await joinSocket(h, meeting);
    const events = [];
    client.on('meeting:room_reaction', (event) => events.push(event));
    await h.request(`/${meeting.joinToken}/reactions`, {
      actor: h.actors.outsider,
      method: 'POST',
      body: { emoji: '👍' },
      status: 403,
    });
    await h.request(`/${meeting.joinToken}/reactions`, {
      actor: h.actors.member,
      method: 'POST',
      body: { emoji: 'unsupported' },
      status: 400,
    });
    const result = await h.request(`/${meeting.joinToken}/reactions`, {
      actor: h.actors.member,
      method: 'POST',
      body: { emoji: '👍' },
      status: 201,
    });
    await until(
      () => events.some((event) => event.id === result.payload.id),
      'room reaction socket delivery',
      5000,
    );
    client.close();
  });

  test('SOCKET-03: room-end reaches joined clients after SQL marks them LEFT', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    const client = await joinSocket(h, meeting);
    const events = [];
    client.on('meeting:ended', (event) => events.push(event));
    await h.request(`/${meeting.joinToken}/end`, {
      method: 'POST',
      body: {},
      status: 201,
    });
    await until(
      () => events.some((event) => event.meetingId === meeting.id),
      'end delivery after participant status changes',
      5000,
    );
    client.close();
  });
}
