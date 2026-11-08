import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { holdProvider } from './helpers.mjs';

export function registerIntegrationTests(h) {
  test('CALENDAR-01: internal key is required; revision replay and older updates cannot overwrite the schedule', async () => {
    const body = {
      eventId: randomUUID(),
      hostId: h.actors.host.id,
      revision: '2',
      enabled: true,
      title: 'Calendar audit',
      scheduledStartAt: new Date(Date.now() + 7200000).toISOString(),
      scheduledEndAt: new Date(Date.now() + 10800000).toISOString(),
      inviteeIds: [h.actors.member.id, h.actors.member.id],
    };
    await h.request('/internal/calendar-sync', {
      actor: null,
      method: 'POST',
      body,
      status: 401,
    });
    const sync = (changes = {}) =>
      h.request('/internal/calendar-sync', {
        actor: null,
        method: 'POST',
        headers: {
          'x-internal-service-key': h.keys.CALENDAR_TO_COMMUNICATION_KEY,
        },
        body: { ...body, ...changes },
        status: 201,
      });
    await sync();
    await sync();
    await sync({ revision: '1', title: 'Stale title' });
    let meeting = await h.db.meeting.findUniqueOrThrow({
      where: { calendarEventId: body.eventId },
    });
    assert.equal(meeting.title, body.title);
    assert.equal(meeting.calendarSyncRevision, 2n);
    assert.equal(
      await h.db.meetingParticipant.count({ where: { meetingId: meeting.id } }),
      2,
    );
    await sync({ revision: '3', enabled: false });
    assert.equal(
      (await h.db.meeting.findUniqueOrThrow({ where: { id: meeting.id } }))
        .status,
      'CANCELLED',
    );
    await sync({ revision: '4' });
    meeting = await h.db.meeting.findUniqueOrThrow({
      where: { id: meeting.id },
    });
    assert.equal(meeting.status, 'SCHEDULED');
    const wrongOwner = await h.request('/internal/calendar-sync', {
      actor: null,
      method: 'POST',
      headers: {
        'x-internal-service-key': h.keys.CALENDAR_TO_COMMUNICATION_KEY,
      },
      body: { ...body, hostId: h.actors.outsider.id, revision: '5' },
    });
    assert.equal(wrongOwner.status, 403);
    assert.equal(
      (await h.db.meeting.findUniqueOrThrow({ where: { id: meeting.id } }))
        .calendarSyncRevision,
      4n,
    );
  });

  test('CAPTIONS-01: joined-and-connected gate, provider capacity/outage, release and disabled configuration', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    await h.request(`/${meeting.joinToken}/captions`, {
      actor: h.actors.outsider,
      status: 403,
    });
    h.providers.rooms
      .get(meeting.roomName)
      .participants.delete(h.actors.member.id);
    await h.request(`/${meeting.joinToken}/captions`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 403,
    });
    h.providers.connected(meeting.roomName, h.actors.member.id);
    const start = await h.request(`/${meeting.joinToken}/captions`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 200,
    });
    assert.equal(start.payload.language, 'vi');
    h.providers.failures.set('/sessions', 429);
    await h.request(`/${meeting.joinToken}/captions`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 429,
    });
    h.providers.failures.set('/sessions', 503);
    await h.request(`/${meeting.joinToken}/captions`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 503,
    });
    h.providers.failures.clear();
    await h.request(`/${meeting.joinToken}/captions`, {
      actor: h.actors.member,
      method: 'DELETE',
      status: 200,
    });
    const token = process.env.CAPTION_SERVICE_TOKEN;
    delete process.env.CAPTION_SERVICE_TOKEN;
    try {
      assert.equal(
        (
          await h.request(`/${meeting.joinToken}/captions`, {
            actor: h.actors.member,
            status: 200,
          })
        ).payload.available,
        false,
      );
      await h.request(`/${meeting.joinToken}/captions`, {
        actor: h.actors.member,
        method: 'POST',
        body: {},
        status: 503,
      });
    } finally {
      process.env.CAPTION_SERVICE_TOKEN = token;
    }
    await h.request(`/${meeting.joinToken}/end`, {
      method: 'POST',
      body: {},
      status: 201,
    });
    assert.equal(
      (
        await h.request(`/${meeting.joinToken}/captions`, {
          actor: h.actors.member,
          method: 'DELETE',
          status: 200,
        })
      ).payload.released,
      true,
    );
  });

  test('WEBHOOK-01: signed raw-body verification rejects tampering and duplicate room-finished ends only once', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    const body = {
      event: 'room_finished',
      id: randomUUID(),
      room: { name: meeting.roomName, sid: 'RM_audit' },
    };
    const auth = h.sign(
      {
        iss: 'meeting-audit',
        exp: Math.floor(Date.now() / 1000) + 60,
        sha256: createHash('sha256')
          .update(JSON.stringify(body))
          .digest('base64'),
      },
      h.keys.LIVEKIT_API_SECRET,
    );
    const tampered = await h.request('/livekit/webhook', {
      actor: null,
      method: 'POST',
      body: { ...body, id: randomUUID() },
      headers: { authorization: auth },
    });
    assert.ok(tampered.status >= 400 && tampered.status < 500);
    for (let i = 0; i < 2; i++)
      await h.request('/livekit/webhook', {
        actor: null,
        method: 'POST',
        body,
        headers: { authorization: auth },
        status: 200,
      });
    assert.equal(
      (await h.db.meeting.findUniqueOrThrow({ where: { id: meeting.id } }))
        .status,
      'ENDED',
    );
    assert.equal(
      await h.db.meetingEvent.count({
        where: { meetingId: meeting.id, type: 'ENDED' },
      }),
      1,
    );
  });

  test('SUMMARY-01: only recording owner starts processing; shared viewers can read and access is rechecked after waiting', async () => {
    const meeting = await h.instant(),
      recording = await h.readyRecording(meeting);
    await h.request(
      `/recordings/${recording.id}/permissions/${h.actors.member.id}`,
      {
        method: 'PUT',
        body: { canView: true, canDownload: false },
        status: 200,
      },
    );
    await h.request(`/recordings/${recording.id}/summary`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 403,
    });
    await h.request(`/recordings/${recording.id}/summary`, {
      method: 'POST',
      body: {},
      status: 201,
    });
    const existing = await h.request(`/recordings/${recording.id}/summary`, {
      actor: h.actors.member,
      status: 200,
    });
    assert.equal(existing.payload.status, 'COMPLETED');
    assert.equal(existing.payload.canCreate, false);
    const pending = await holdProvider(
      h,
      `/internal/meeting-summaries/${recording.id}/status`,
      () =>
        h.request(`/recordings/${recording.id}/summary`, {
          actor: h.actors.member,
        }),
      () =>
        h.request(
          `/recordings/${recording.id}/permissions/${h.actors.member.id}`,
          { method: 'DELETE', status: 200 },
        ),
    );
    assert.equal(pending.status, 404);
  });

  test('SUMMARY-02: provider outage and feature disabled return explicit unavailable states', async () => {
    const meeting = await h.instant(),
      recording = await h.readyRecording(meeting);
    h.providers.failures.set(
      `/internal/meeting-summaries/${recording.id}`,
      503,
    );
    await h.request(`/recordings/${recording.id}/summary`, {
      method: 'POST',
      body: {},
      status: 503,
    });
    process.env.MEETING_SUMMARY_ENABLED = 'false';
    try {
      const disabled = await h.request(`/recordings/${recording.id}/summary`, {
        status: 200,
      });
      assert.equal(disabled.payload.enabled, false);
      await h.request(`/recordings/${recording.id}/summary`, {
        method: 'POST',
        body: {},
        status: 503,
      });
    } finally {
      process.env.MEETING_SUMMARY_ENABLED = 'true';
    }
  });
}
