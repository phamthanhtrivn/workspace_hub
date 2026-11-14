import { test } from 'node:test';
import assert from 'node:assert/strict';

export function registerChatHistoryTests(h) {
  test('CHAT-01: send/edit/recall enforce ownership and reject blank messages', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    await h.request(`/${meeting.joinToken}/messages`, {
      method: 'POST',
      body: { content: '   ' },
      status: 400,
    });
    const sent = await h.request(`/${meeting.joinToken}/messages`, {
      method: 'POST',
      body: { content: '  Hello  ' },
      status: 201,
    });
    assert.equal(sent.payload.content, 'Hello');
    await h.request(`/${meeting.joinToken}/messages/${sent.payload.id}`, {
      actor: h.actors.member,
      method: 'PATCH',
      body: { content: 'Stolen edit' },
      status: 403,
    });
    const edit = await h.request(
      `/${meeting.joinToken}/messages/${sent.payload.id}`,
      { method: 'PATCH', body: { content: 'Edited' }, status: 200 },
    );
    assert.equal(edit.payload.edited, true);
    await h.request(
      `/${meeting.joinToken}/messages/${sent.payload.id}/recall`,
      { method: 'PATCH', body: {}, status: 200 },
    );
    const stored = await h.db.meetingMessage.findUniqueOrThrow({
      where: { id: sent.payload.id },
    });
    assert.equal(stored.recalled, true);
    assert.equal(stored.content, null);
    await h.request(`/${meeting.joinToken}/messages/${sent.payload.id}`, {
      method: 'PATCH',
      body: { content: 'Restore' },
      status: 400,
    });
  });

  test('CHAT-02: chat disable blocks members while moderators can still send', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    await h.request(`/${meeting.joinToken}/settings`, {
      method: 'PATCH',
      body: { chatEnabled: false },
      status: 200,
    });
    await h.request(`/${meeting.joinToken}/messages`, {
      actor: h.actors.member,
      method: 'POST',
      body: { content: 'Blocked' },
      status: 403,
    });
    await h.request(`/${meeting.joinToken}/messages`, {
      method: 'POST',
      body: { content: 'Moderator notice' },
      status: 201,
    });
  });

  test('CHAT-03: confirmed file metadata persists; foreign attachment references are denied', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    const media = {
      name: 'audit.txt',
      s3Key: `meeting-test/${meeting.id}/audit.txt`,
      mimeType: 'text/plain',
      sizeBytes: 4,
    };
    h.providers.objects.set(media.s3Key, Buffer.from('test'));
    const sent = await h.request(`/${meeting.joinToken}/messages`, {
      actor: h.actors.member,
      method: 'POST',
      body: { medias: [media] },
      status: 201,
    });
    assert.equal(sent.payload.medias.length, 1);
    assert.ok(
      sent.payload.medias[0].fileUrl.includes(encodeURIComponent(media.s3Key)),
    );
    await h.request(`/${meeting.joinToken}/messages`, {
      actor: h.actors.member,
      method: 'POST',
      body: { medias: [{ ...media, s3Key: 'foreign/private.txt' }] },
      status: 403,
    });
    assert.equal(
      await h.db.meetingMessage.count({ where: { meetingId: meeting.id } }),
      1,
    );
  });

  test('CHAT-04: unread/read and reaction toggles are scoped to this room', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    const sent = await h.request(`/${meeting.joinToken}/messages`, {
      method: 'POST',
      body: { content: 'Unread' },
      status: 201,
    });
    const unread = await h.request(
      `/${meeting.joinToken}/messages/unread-count`,
      { actor: h.actors.member, status: 200 },
    );
    assert.equal(unread.payload.count, 1);
    for (const action of ['add', 'remove']) {
      const reaction = await h.request(
        `/${meeting.joinToken}/messages/${sent.payload.id}/reactions`,
        {
          actor: h.actors.member,
          method: 'POST',
          body: { emoji: '👍' },
          status: 201,
        },
      );
      assert.equal(reaction.payload.action, action);
    }
    await h.request(`/${meeting.joinToken}/messages/read`, {
      actor: h.actors.member,
      method: 'POST',
      body: { messageId: sent.payload.id },
      status: 201,
    });
    assert.equal(
      (
        await h.request(`/${meeting.joinToken}/messages/unread-count`, {
          actor: h.actors.member,
        })
      ).payload.count,
      0,
    );
    const another = await h.instant();
    await h.join(another);
    await h.request(`/${another.joinToken}/messages/read`, {
      actor: h.actors.member,
      method: 'POST',
      body: { messageId: sent.payload.id },
      status: 404,
    });
  });

  test('CHAT-05: cursor paging returns every message once without skipping the boundary', async () => {
    const meeting = await h.instant();
    const ids = [];
    for (let i = 0; i < 5; i++)
      ids.push(
        (
          await h.request(`/${meeting.joinToken}/messages`, {
            method: 'POST',
            body: { content: `Page ${i}` },
            status: 201,
          })
        ).payload.id,
      );
    const seen = [];
    let cursor;
    for (let page = 0; page < 5; page++) {
      const response = await h.request(
        `/${meeting.joinToken}/messages?limit=2${cursor ? '&cursor=' + cursor : ''}`,
        { status: 200 },
      );
      seen.push(...response.payload.messages.map((message) => message.id));
      cursor = response.payload.nextCursor;
      if (!cursor) break;
    }
    assert.equal(new Set(seen).size, 5, JSON.stringify({ ids, seen }));
    assert.equal(seen.length, 5);
  });

  test('CHAT-06: newer and around paging preserve both boundaries even when timestamps tie', async () => {
    const meeting = await h.instant();
    for (let i = 0; i < 7; i++)
      await h.request(`/${meeting.joinToken}/messages`, {
        method: 'POST',
        body: { content: `Boundary ${i}` },
        status: 201,
      });
    await h.db.meetingMessage.updateMany({
      where: { meetingId: meeting.id },
      data: { createdAt: new Date() },
    });
    const ordered = await h.db.meetingMessage.findMany({
      where: { meetingId: meeting.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    let cursor;
    const seen = [];
    do {
      const response = await h.request(
        `/${meeting.joinToken}/messages?limit=2&direction=newer${cursor ? '&cursor=' + cursor : ''}`,
        { status: 200 },
      );
      seen.push(...response.payload.messages.map((message) => message.id));
      cursor = response.payload.prevCursor;
    } while (cursor && seen.length < 10);
    assert.deepEqual(
      seen,
      ordered.map((message) => message.id),
    );
    const around = await h.request(
      `/${meeting.joinToken}/messages?limit=2&direction=around&cursor=${ordered[3].id}`,
      { status: 200 },
    );
    assert.deepEqual(
      around.payload.messages.map((message) => message.id),
      ordered.slice(2, 5).map((message) => message.id),
    );
    const older = await h.request(
      `/${meeting.joinToken}/messages?limit=2&cursor=${around.payload.nextCursor}`,
      { status: 200 },
    );
    const newer = await h.request(
      `/${meeting.joinToken}/messages?limit=2&direction=newer&cursor=${around.payload.prevCursor}`,
      { status: 200 },
    );
    assert.deepEqual(
      older.payload.messages.map((message) => message.id),
      ordered.slice(0, 2).map((message) => message.id),
    );
    assert.deepEqual(
      newer.payload.messages.map((message) => message.id),
      ordered.slice(5).map((message) => message.id),
    );
  });

  test('HISTORY-01: hiding/restoring is personal, terminal-only and survives a new login token', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    await h.request(`/history/${meeting.id}/visibility`, {
      actor: h.actors.member,
      method: 'PATCH',
      body: { hidden: true },
      status: 400,
    });
    await h.request(`/${meeting.joinToken}/end`, {
      method: 'POST',
      body: {},
      status: 201,
    });
    await h.request(`/history/${meeting.id}/visibility`, {
      actor: h.actors.outsider,
      method: 'PATCH',
      body: { hidden: true },
      status: 403,
    });
    await h.request(`/history/${meeting.id}/visibility`, {
      actor: h.actors.member,
      method: 'PATCH',
      body: { hidden: true },
      status: 200,
    });
    const login = {
      token: h.sign({ ...h.actors.member.claims, jti: 'new-login' }),
    };
    const hidden = await h.request('/history?visibility=hidden&limit=50', {
      actor: login,
      status: 200,
    });
    const host = await h.request('/history?limit=50', { status: 200 });
    assert.ok(hidden.payload.items.some((row) => row.id === meeting.id));
    assert.ok(host.payload.items.some((row) => row.id === meeting.id));
    await h.request(`/history/${meeting.id}/visibility`, {
      actor: login,
      method: 'PATCH',
      body: { hidden: false },
      status: 200,
    });
    assert.equal(await h.db.meeting.count({ where: { id: meeting.id } }), 1);
    await h.request('/history/summary', { actor: login, status: 200 });
  });

  test('HISTORY-02: bulk selection is atomic; confirmation and undo respect ownership', async () => {
    const meetings = [];
    for (let i = 0; i < 2; i++) {
      const meeting = await h.instant();
      meetings.push(meeting);
      await h.join(meeting);
      await h.request(`/${meeting.joinToken}/end`, {
        method: 'POST',
        body: {},
        status: 201,
      });
    }
    await h.request('/history/visibility/bulk', {
      actor: h.actors.member,
      method: 'PATCH',
      body: { scope: 'all', hidden: true },
      status: 400,
    });
    await h.request('/history/visibility/bulk', {
      actor: h.actors.member,
      method: 'PATCH',
      body: {
        scope: 'selected',
        hidden: true,
        meetingIds: meetings.map((m) => m.id),
        expectedCount: 99,
      },
      status: 409,
    });
    assert.equal(
      await h.db.meetingHistoryPreference.count({
        where: {
          userId: h.actors.member.id,
          meetingId: { in: meetings.map((m) => m.id) },
          hiddenAt: { not: null },
        },
      }),
      0,
    );
    const bulk = await h.request('/history/visibility/bulk', {
      actor: h.actors.member,
      method: 'PATCH',
      body: {
        scope: 'selected',
        hidden: true,
        meetingIds: meetings.map((m) => m.id),
        expectedCount: 2,
      },
      status: 200,
    });
    assert.equal(bulk.payload.affectedCount, 2);
    const foreignUndo = await h.request('/history/visibility/undo', {
      actor: h.actors.outsider,
      method: 'POST',
      body: { batchId: bulk.payload.batchId },
      status: 201,
    });
    assert.equal(foreignUndo.payload.affectedCount, 0);
    const undo = await h.request('/history/visibility/undo', {
      actor: h.actors.member,
      method: 'POST',
      body: { batchId: bulk.payload.batchId },
      status: 201,
    });
    assert.equal(undo.payload.affectedCount, 2);
  });
}
