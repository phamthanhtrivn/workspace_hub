import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { until } from '../support.mjs';

export function registerSchedulingTests(h) {
  test('AUTH-01: forged identity, expired tokens and revoked sessions cannot reach meeting operations', async () => {
    await h.request('/history', {
      actor: null,
      headers: { 'x-user-id': h.actors.host.id },
      status: 401,
    });
    const expired = { token: h.sign({ ...h.actors.host.claims, exp: 1 }) };
    await h.request('/history', { actor: expired, status: 401 });
    const revoked = {
      token: h.sign({ ...h.actors.host.claims, sid: randomUUID() }),
    };
    await h.request('/history', { actor: revoked, status: 401 });
    const meeting = await h.instant();
    await h.request(`/${meeting.joinToken}/settings`, {
      actor: h.actors.outsider,
      method: 'PATCH',
      headers: { 'x-user-id': h.actors.host.id },
      body: { chatEnabled: false },
      status: 403,
    });
    assert.equal(
      (await h.db.meeting.findUniqueOrThrow({ where: { id: meeting.id } }))
        .chatEnabled,
      true,
    );
  });

  test('SCHEDULE-01: schedule validates dates, title and unsupported recurrence before writing', async () => {
    const before = await h.db.meeting.count();
    const now = Date.now();
    for (const body of [
      {
        title: ' ',
        scheduledStartAt: new Date(now + 100000).toISOString(),
        scheduledEndAt: new Date(now + 200000).toISOString(),
      },
      {
        title: 'Past',
        scheduledStartAt: new Date(now - 200000).toISOString(),
        scheduledEndAt: new Date(now - 100000).toISOString(),
      },
      {
        title: 'Reverse',
        scheduledStartAt: new Date(now + 200000).toISOString(),
        scheduledEndAt: new Date(now + 100000).toISOString(),
      },
      {
        title: 'Invalid',
        scheduledStartAt: 'not-a-date',
        scheduledEndAt: 'not-a-date',
      },
      {
        title: 'Recurring',
        scheduledStartAt: new Date(now + 100000).toISOString(),
        scheduledEndAt: new Date(now + 200000).toISOString(),
        recurrenceRule: 'FREQ=DAILY',
      },
    ])
      await h.request('/scheduled', { method: 'POST', body, status: 400 });
    assert.equal(await h.db.meeting.count(), before);
  });

  test('SCHEDULE-02: invitations are deduplicated and real Kafka receives one initial invitation per recipient', async () => {
    const meeting = await h.scheduled({
      inviteeIds: [
        h.actors.member.id,
        h.actors.member.id,
        h.actors.host.id,
        h.actors.other.id,
      ],
    });
    assert.equal(
      await h.db.meetingParticipant.count({ where: { meetingId: meeting.id } }),
      3,
    );
    await until(
      () =>
        h.notifications.filter(
          (event) => event.metadata?.meetingId === meeting.id,
        ).length >= 2,
      'meeting invitations consumed from isolated Kafka',
    );
    const invitations = h.notifications.filter(
      (event) => event.metadata?.meetingId === meeting.id,
    );
    assert.equal(invitations.length, 2);
    assert.deepEqual(
      new Set(invitations.map((event) => event.recipientId)),
      new Set([h.actors.member.id, h.actors.other.id]),
    );
    assert.ok(
      invitations.every((event) => event.metadata.status === 'PENDING'),
    );
  });

  test('SCHEDULE-03: invited accounts can accept/decline; outsiders cannot answer invitations', async () => {
    const meeting = await h.scheduled();
    await h.request(`/${meeting.joinToken}/invitations/accept`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 201,
    });
    await h.request(`/${meeting.joinToken}/invitations/decline`, {
      actor: h.actors.other,
      method: 'POST',
      body: {},
      status: 201,
    });
    await h.request(`/${meeting.joinToken}/invitations/accept`, {
      actor: h.actors.outsider,
      method: 'POST',
      body: {},
      status: 404,
    });
    const participants = await h.db.meetingParticipant.findMany({
      where: { meetingId: meeting.id },
    });
    assert.equal(
      participants.find((p) => p.userId === h.actors.member.id).status,
      'APPROVED',
    );
    assert.equal(
      participants.find((p) => p.userId === h.actors.other.id).status,
      'REJECTED',
    );
  });

  test('SCHEDULE-04: editing/cancelling is authorized and cancellation prevents start', async () => {
    const meeting = await h.scheduled();
    await h.request(`/${meeting.joinToken}/schedule`, {
      actor: h.actors.member,
      method: 'PATCH',
      body: { title: 'Forbidden' },
      status: 403,
    });
    await h.request(`/${meeting.joinToken}/schedule`, {
      method: 'PATCH',
      body: { title: 'Updated audit' },
      status: 200,
    });
    assert.equal(
      (await h.db.meeting.findUniqueOrThrow({ where: { id: meeting.id } }))
        .title,
      'Updated audit',
    );
    await h.request(`/${meeting.joinToken}/cancel`, {
      actor: h.actors.outsider,
      method: 'POST',
      body: {},
      status: 403,
    });
    await h.request(`/${meeting.joinToken}/cancel`, {
      method: 'POST',
      body: {},
      status: 201,
    });
    await h.request(`/${meeting.joinToken}/start`, {
      method: 'POST',
      body: {},
      status: 400,
    });
    assert.equal(
      (await h.db.meeting.findUniqueOrThrow({ where: { id: meeting.id } }))
        .status,
      'CANCELLED',
    );
  });

  test('SCHEDULE-05: simultaneous host starts produce one STARTED event', async () => {
    const meeting = await h.scheduled();
    const results = await Promise.all(
      [1, 2].map(() =>
        h.request(`/${meeting.joinToken}/start`, { method: 'POST', body: {} }),
      ),
    );
    assert.ok(
      results.every((result) => result.status === 201),
      JSON.stringify(results),
    );
    assert.equal(
      await h.db.meetingEvent.count({
        where: { meetingId: meeting.id, type: 'STARTED' },
      }),
      1,
    );
    assert.equal(
      (await h.db.meeting.findUniqueOrThrow({ where: { id: meeting.id } }))
        .status,
      'LIVE',
    );
  });

  test('SCHEDULE-06: upcoming lists include accepted invitations, are account scoped and exclude declined invitations', async () => {
    const meeting = await h.scheduled();
    await h.request(`/${meeting.joinToken}/invitations/accept`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 201,
    });
    await h.request(`/${meeting.joinToken}/invitations/decline`, {
      actor: h.actors.other,
      method: 'POST',
      body: {},
      status: 201,
    });
    const invited = await h.request('/upcoming?page=1&limit=50', {
      actor: h.actors.member,
      status: 200,
    });
    const outsider = await h.request('/upcoming?page=1&limit=50', {
      actor: h.actors.outsider,
      status: 200,
    });
    const declined = await h.request('/upcoming?page=1&limit=50', {
      actor: h.actors.other,
      status: 200,
    });
    assert.ok(invited.payload.items.some((item) => item.id === meeting.id));
    assert.ok(!outsider.payload.items.some((item) => item.id === meeting.id));
    assert.ok(!declined.payload.items.some((item) => item.id === meeting.id));
    assert.ok(invited.payload.items.length <= 50);
  });

  test('SCHEDULE-07: timezone offsets round-trip to the same scheduled instant', async () => {
    const start = new Date(Date.now() + 7200000),
      end = new Date(start.getTime() + 3600000);
    const offset = (date) =>
      new Date(date.getTime() + 7 * 3600000)
        .toISOString()
        .replace('Z', '+07:00');
    const meeting = await h.scheduled({
      scheduledStartAt: offset(start),
      scheduledEndAt: offset(end),
    });
    assert.equal(meeting.scheduledStartAt.getTime(), start.getTime());
    assert.equal(meeting.scheduledEndAt.getTime(), end.getTime());
  });

  test('SCHEDULE-08: invitation replay never downgrades a joined or removed participant', async () => {
    const meeting = await h.scheduled({ autoAdmit: true });
    await h.request(`/${meeting.joinToken}/invitations/accept`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 201,
    });
    await h.request(`/${meeting.joinToken}/invitations/accept`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 201,
    });
    await h.request(`/${meeting.joinToken}/start`, {
      method: 'POST',
      body: {},
      status: 201,
    });
    await h.join(meeting);
    await h.request(`/${meeting.joinToken}/invitations/decline`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 400,
    });
    assert.equal(
      (
        await h.db.meetingParticipant.findUniqueOrThrow({
          where: {
            meetingId_userId: {
              meetingId: meeting.id,
              userId: h.actors.member.id,
            },
          },
        })
      ).status,
      'JOINED',
    );
    await h.request(
      `/${meeting.joinToken}/participants/${h.actors.member.id}/remove`,
      { method: 'POST', body: {}, status: 201 },
    );
    await h.request(`/${meeting.joinToken}/invitations/accept`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 400,
    });
  });

  test('INSTANT-01: channel/direct meetings enforce context membership and publish one chat card', async () => {
    const space = await h.db.space.create({
      data: { name: 'Audit space', createdBy: h.actors.host.id },
    });
    const channel = await h.db.channel.create({
      data: {
        spaceId: space.id,
        name: 'Audit channel',
        createdBy: h.actors.host.id,
        members: { create: { userId: h.actors.host.id } },
      },
    });
    const conversation = await h.db.directConversation.create({
      data: {
        participants: {
          create: [
            { userId: h.actors.host.id },
            { userId: h.actors.member.id },
          ],
        },
      },
    });
    for (const context of [
      { channelId: channel.id },
      { conversationId: conversation.id },
    ]) {
      await h.request('/instant', {
        actor: h.actors.outsider,
        method: 'POST',
        body: context,
        status: 403,
      });
      const meeting = await h.instant(context);
      await h.request(`/${meeting.joinToken}/access`, {
        actor: h.actors.outsider,
        status: 403,
      });
      await h.request(`/${meeting.joinToken}/join`, {
        actor: h.actors.outsider,
        method: 'POST',
        body: {},
        status: 403,
      });
      const cards = context.channelId ? h.db.message : h.db.directMessage;
      assert.equal(
        await cards.count({
          where: { meetingId: meeting.id, type: 'MEETING' },
        }),
        1,
      );
    }
  });

  test('INSTANT-02: ambiguous channel plus direct context is rejected at the boundary', async () => {
    const space = await h.db.space.create({
      data: { name: 'Ambiguous context', createdBy: h.actors.host.id },
    });
    const channel = await h.db.channel.create({
      data: {
        spaceId: space.id,
        name: 'Ambiguous',
        createdBy: h.actors.host.id,
        members: { create: { userId: h.actors.host.id } },
      },
    });
    const conversation = await h.db.directConversation.create({
      data: {
        participants: {
          create: [
            { userId: h.actors.host.id },
            { userId: h.actors.member.id },
          ],
        },
      },
    });
    await h.request('/instant', {
      method: 'POST',
      body: { channelId: channel.id, conversationId: conversation.id },
      status: 400,
    });
  });

  test('INSTANT-03: media provider outage does not persist a partial meeting', async () => {
    const before = await h.db.meeting.count();
    h.providers.failures.set('/twirp/livekit.RoomService/CreateRoom', 503);
    const response = await h.request('/instant', { method: 'POST', body: {} });
    assert.ok(response.status >= 500);
    assert.equal(await h.db.meeting.count(), before);
  });

  test('INSTANT-04: a rolled-back database transaction also releases the created media room', async () => {
    const before = new Set(h.providers.rooms.keys());
    const original = h.room.prisma;
    // Fail after the real INSERT, so PostgreSQL performs a real transaction rollback.
    h.room.prisma = new Proxy(h.db, {
      get(target, property) {
        if (property === '$transaction')
          return (callback) =>
            target.$transaction(async (tx) => {
              await callback(tx);
              throw new Error('Injected database rollback');
            });
        return Reflect.get(target, property);
      },
    });
    let response;
    try {
      response = await h.request('/instant', {
        method: 'POST',
        body: { title: 'Rollback probe' },
      });
    } finally {
      h.room.prisma = original;
    }
    assert.equal(response.status, 500);
    assert.equal(
      await h.db.meeting.count({ where: { title: 'Rollback probe' } }),
      0,
    );
    assert.deepEqual(
      new Set(h.providers.rooms.keys()),
      before,
      'no orphan LiveKit room after rollback',
    );
  });
}
