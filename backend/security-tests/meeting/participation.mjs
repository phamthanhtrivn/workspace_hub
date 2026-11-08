import { test } from 'node:test';
import assert from 'node:assert/strict';

export function registerParticipationTests(h) {
  test('ADMISSION-01: password, waiting room and explicit host approval gate entry', async () => {
    const meeting = await h.instant({
      autoAdmit: false,
      password: 'audit-secret',
    });
    await h.request(`/${meeting.joinToken}/join`, {
      actor: h.actors.member,
      method: 'POST',
      body: { password: 'wrong' },
      status: 403,
    });
    await h.request(`/${meeting.joinToken}/join-requests`, {
      actor: h.actors.member,
      method: 'POST',
      body: { password: 'audit-secret' },
      status: 201,
    });
    const requests = await h.request(`/${meeting.joinToken}/join-requests`, {
      status: 200,
    });
    assert.ok(
      requests.payload.items.some((p) => p.userId === h.actors.member.id),
    );
    await h.request(
      `/${meeting.joinToken}/join-requests/${h.actors.member.id}/approve`,
      { actor: h.actors.outsider, method: 'POST', body: {}, status: 403 },
    );
    await h.request(
      `/${meeting.joinToken}/join-requests/${h.actors.member.id}/approve`,
      { method: 'POST', body: {}, status: 201 },
    );
    await h.join(meeting, 'member', { password: 'audit-secret' });
    assert.equal(
      await h.db.meetingParticipant.count({
        where: {
          meetingId: meeting.id,
          userId: h.actors.member.id,
          status: 'JOINED',
        },
      }),
      1,
    );
  });

  test('ADMISSION-02: bulk approval/decline resolves only pending requests', async () => {
    const meeting = await h.instant({ autoAdmit: false });
    for (const name of ['member', 'other'])
      await h.request(`/${meeting.joinToken}/join-requests`, {
        actor: h.actors[name],
        method: 'POST',
        body: {},
        status: 201,
      });
    const approved = await h.request(
      `/${meeting.joinToken}/join-requests/approve-all`,
      { method: 'POST', body: {}, status: 201 },
    );
    assert.equal(approved.payload.count, 2);
    const again = await h.request(
      `/${meeting.joinToken}/join-requests/decline-all`,
      { method: 'POST', body: {}, status: 201 },
    );
    assert.equal(again.payload.count, 0);
    await h.request(`/${meeting.joinToken}/join-requests`, {
      actor: h.actors.outsider,
      method: 'POST',
      body: {},
      status: 201,
    });
    const declined = await h.request(
      `/${meeting.joinToken}/join-requests/decline-all`,
      { method: 'POST', body: {}, status: 201 },
    );
    assert.equal(declined.payload.count, 1);
  });

  test('ROLE-01: participant cannot promote; host transfer leaves exactly one joined host', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    await h.join(meeting, 'other');
    await h.request(
      `/${meeting.joinToken}/participants/${h.actors.member.id}/role`,
      {
        actor: h.actors.member,
        method: 'PATCH',
        body: { role: 'HOST' },
        status: 403,
      },
    );
    await h.request(
      `/${meeting.joinToken}/participants/${h.actors.other.id}/role`,
      { method: 'PATCH', body: { role: 'COHOST' }, status: 200 },
    );
    await h.request(
      `/${meeting.joinToken}/participants/${h.actors.member.id}/role`,
      { method: 'PATCH', body: { role: 'HOST' }, status: 200 },
    );
    const state = await h.db.meeting.findUniqueOrThrow({
      where: { id: meeting.id },
      include: { participants: true },
    });
    assert.equal(state.hostId, h.actors.member.id);
    assert.equal(state.participants.filter((p) => p.role === 'HOST').length, 1);
    await h.request(
      `/${meeting.joinToken}/participants/${h.actors.other.id}/role`,
      { method: 'PATCH', body: { role: 'PARTICIPANT' }, status: 403 },
    );
    await h.request(`/${meeting.joinToken}/end`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 201,
    });
  });

  test('ROLE-02: kicked member loses APIs, recording grants and requires readmission', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    const recording = await h.readyRecording(meeting);
    await h.request(
      `/recordings/${recording.id}/permissions/${h.actors.member.id}`,
      {
        method: 'PUT',
        body: { canView: true, canDownload: true },
        status: 200,
      },
    );
    await h.request(
      `/${meeting.joinToken}/participants/${h.actors.member.id}/remove`,
      { method: 'POST', body: {}, status: 201 },
    );
    await h.request(`/${meeting.joinToken}/messages`, {
      actor: h.actors.member,
      status: 403,
    });
    await h.request(`/${meeting.joinToken}/join`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 403,
    });
    await h.request(`/recordings/${recording.id}`, {
      actor: h.actors.member,
      status: 404,
    });
    await h.request(`/${meeting.joinToken}/join-requests`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 201,
    });
    await h.request(
      `/${meeting.joinToken}/join-requests/${h.actors.member.id}/approve`,
      { method: 'POST', body: {}, status: 201 },
    );
    await h.join(meeting);
    assert.equal(
      await h.db.meetingRecordingPermission.count({
        where: { recordingId: recording.id, userId: h.actors.member.id },
      }),
      0,
    );
  });

  test('ROLE-03: a host who left cannot keep changing settings without rejoining', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    await h.request(`/${meeting.joinToken}/leave`, {
      method: 'POST',
      body: {},
      status: 201,
    });
    await h.request(`/${meeting.joinToken}/settings`, {
      method: 'PATCH',
      body: { chatEnabled: false },
      status: 403,
    });
  });

  test('PREFERENCES-01: hands, personal mute/pin and chat notifications stay account scoped', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    await h.join(meeting, 'other');
    await h.request(`/${meeting.joinToken}/hand`, {
      actor: h.actors.member,
      method: 'PATCH',
      body: { raised: true },
      status: 200,
    });
    const member = await h.db.meetingParticipant.findUniqueOrThrow({
      where: {
        meetingId_userId: { meetingId: meeting.id, userId: h.actors.member.id },
      },
    });
    assert.ok(member.handRaisedAt);
    await h.request(
      `/${meeting.joinToken}/participants/${h.actors.member.id}/hand`,
      {
        actor: h.actors.other,
        method: 'PATCH',
        body: { raised: false },
        status: 403,
      },
    );
    await h.request(
      `/${meeting.joinToken}/participants/${h.actors.member.id}/hand`,
      { method: 'PATCH', body: { raised: false }, status: 200 },
    );
    await h.request(
      `/${meeting.joinToken}/participants/${h.actors.other.id}/view-preference`,
      {
        actor: h.actors.member,
        method: 'PATCH',
        body: { audioMuted: true, pinned: true },
        status: 200,
      },
    );
    const own = await h.request(
      `/${meeting.joinToken}/participant-view-preferences`,
      { actor: h.actors.member, status: 200 },
    );
    const different = await h.request(
      `/${meeting.joinToken}/participant-view-preferences`,
      { actor: h.actors.host, status: 200 },
    );
    assert.equal(own.payload.items.length, 1);
    assert.equal(different.payload.items.length, 0);
    await h.request(`/${meeting.joinToken}/chat-notifications`, {
      actor: h.actors.member,
      method: 'PATCH',
      body: { chatMuted: true },
      status: 200,
    });
    assert.equal(
      (
        await h.db.meetingParticipant.findUniqueOrThrow({
          where: { id: member.id },
        })
      ).chatMuted,
      true,
    );
  });

  test('SCREEN-01: concurrent claims have one winner; host can interrupt and leave clears sharing', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    await h.join(meeting, 'other');
    const results = await Promise.all(
      ['member', 'other'].map((name) =>
        h.request(`/${meeting.joinToken}/screen-share/start`, {
          actor: h.actors[name],
          method: 'POST',
          body: {},
        }),
      ),
    );
    assert.equal(results.filter((result) => result.status === 201).length, 1);
    assert.ok(
      results.every((result) => [201, 409].includes(result.status)),
      JSON.stringify(results),
    );
    await h.request(`/${meeting.joinToken}/screen-share/start`, {
      method: 'POST',
      body: { interrupt: true },
      status: 201,
    });
    assert.equal(
      (await h.db.meeting.findUniqueOrThrow({ where: { id: meeting.id } }))
        .activeScreenShareUserId,
      h.actors.host.id,
    );
    await h.request(`/${meeting.joinToken}/screen-share/stop`, {
      method: 'POST',
      body: {},
      status: 201,
    });
    await h.request(`/${meeting.joinToken}/screen-share/start`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 201,
    });
    await h.request(`/${meeting.joinToken}/leave`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 201,
    });
    assert.equal(
      (await h.db.meeting.findUniqueOrThrow({ where: { id: meeting.id } }))
        .activeScreenShareUserId,
      null,
    );
  });

  test('LIFECYCLE-01: ending a room clears joined members and blocks chat, captions and screen share', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    await h.request(`/${meeting.joinToken}/end`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 403,
    });
    await h.request(`/${meeting.joinToken}/end`, {
      method: 'POST',
      body: {},
      status: 201,
    });
    const ended = await h.db.meeting.findUniqueOrThrow({
      where: { id: meeting.id },
      include: { participants: true },
    });
    assert.equal(ended.status, 'ENDED');
    assert.ok(ended.endedAt);
    assert.ok(ended.participants.every((p) => p.status !== 'JOINED'));
    for (const [path, method, body] of [
      ['messages', 'POST', { content: 'Late' }],
      ['captions', 'POST', {}],
      ['screen-share/start', 'POST', {}],
    ]) {
      const response = await h.request(`/${meeting.joinToken}/${path}`, {
        actor: h.actors.member,
        method,
        body,
      });
      assert.ok(
        response.status >= 400 && response.status < 500,
        JSON.stringify(response),
      );
    }
  });
}
