import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { serviceRequire } from '../support.mjs';
import { until } from '../support.mjs';
import { holdProvider } from './helpers.mjs';

export function registerRecordingTests(h) {
  test('RECORDING-01: permission requests deduplicate, expire and only the current host can decide', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    await h.join(meeting, 'other');
    await h.request(`/${meeting.joinToken}/recordings`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      headers: { 'idempotency-key': randomUUID() },
      status: 403,
    });
    const request = () =>
      h.request(`/${meeting.joinToken}/recordings/permission-requests`, {
        actor: h.actors.member,
        method: 'POST',
        body: {},
        status: 200,
      });
    const [first, replay] = await Promise.all([request(), request()]);
    assert.equal(first.payload.id, replay.payload.id);
    const path = `/${meeting.joinToken}/recordings/permission-requests/${first.payload.id}`;
    await h.request(path, {
      actor: h.actors.other,
      method: 'PATCH',
      body: { approve: true },
      status: 403,
    });
    await h.request(path, {
      method: 'PATCH',
      body: { approve: true },
      status: 200,
    });
    await h.request(path, {
      method: 'PATCH',
      body: { approve: true },
      status: 200,
    });
    assert.equal(
      (
        await h.request(`/${meeting.joinToken}/recordings/status`, {
          actor: h.actors.member,
        })
      ).payload.capabilities.canStart,
      true,
    );
    await h.request(
      `/${meeting.joinToken}/participants/${h.actors.member.id}/recording-permission`,
      { method: 'PATCH', body: { canRecord: false }, status: 200 },
    );
    await h.db.meetingParticipant.updateMany({
      where: { meetingId: meeting.id, userId: h.actors.other.id },
      data: {
        recordingRequestId: randomUUID(),
        recordingRequestedAt: new Date(Date.now() - 180000),
        recordingRequestState: 'PENDING',
      },
    });
    const expired = await h.db.meetingParticipant.findUniqueOrThrow({
      where: {
        meetingId_userId: { meetingId: meeting.id, userId: h.actors.other.id },
      },
    });
    await h.request(
      `/${meeting.joinToken}/recordings/permission-requests/${expired.recordingRequestId}`,
      { method: 'PATCH', body: { approve: true }, status: 409 },
    );
  });

  test('RECORDING-02: concurrent starts with the same idempotency key both replay the same recording', async () => {
    const meeting = await h.instant(),
      key = randomUUID();
    const path = '/twirp/livekit.Egress/ListEgress';
    let release;
    h.providers.holds.set(
      path,
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const before = h.providers.calls.filter(
      (call) => call.path === path,
    ).length;
    const start = () =>
      h.request(`/${meeting.joinToken}/recordings`, {
        method: 'POST',
        body: { layout: 'speaker' },
        headers: { 'idempotency-key': key },
      });
    const pending = Promise.all([start(), start()]);
    try {
      await until(
        () =>
          h.providers.calls.filter((call) => call.path === path).length >=
          before + 2,
        'both starts passed replay lookup',
        5000,
      );
    } finally {
      release();
      h.providers.holds.delete(path);
    }
    const [first, replay] = await pending;
    assert.deepEqual([first.status, replay.status], [202, 202]);
    assert.equal(first.payload.id, replay.payload.id);
    assert.equal(
      await h.db.meetingRecordingJob.count({
        where: { recordingId: first.payload.id, kind: 'START' },
      }),
      1,
    );
  });

  test('RECORDING-03: real worker consumes START and signed egress completion verifies storage; replay is stable', async () => {
    const meeting = await h.instant();
    h.mediaAvailable = false;
    const start = await h.request(`/${meeting.joinToken}/recordings`, {
      method: 'POST',
      body: {},
      headers: { 'idempotency-key': randomUUID() },
      status: 202,
    });
    // Keep reconciliation out of this controlled queue drain; it has separate webhook coverage.
    h.worker.nextReconcileAt = Date.now() + 60000;
    h.worker.nextAutoAt = Date.now() + 60000;
    await h.worker.tick();
    const recording = await h.db.meetingRecording.findUniqueOrThrow({
      where: { id: start.payload.id },
    });
    assert.equal(
      recording.status,
      'RECORDING',
      JSON.stringify({
        calls: h.providers.calls.slice(-4),
        jobs: await h.db.meetingRecordingJob.findMany({
          where: { recordingId: recording.id },
        }),
      }),
    );
    assert.ok(recording.livekitEgressId);
    assert.equal(
      (
        await h.db.meetingRecordingJob.findFirstOrThrow({
          where: { recordingId: recording.id, kind: 'START' },
        })
      ).state,
      'DONE',
    );
    h.providers.objects.set(recording.s3Key, Buffer.from('audit-video'));
    const now = BigInt(Date.now()) * 1000000n;
    const body = {
      event: 'egress_ended',
      id: randomUUID(),
      egressInfo: {
        egressId: recording.livekitEgressId,
        roomName: meeting.roomName,
        status: 'EGRESS_COMPLETE',
        startedAt: String(now - 10000000000n),
        endedAt: String(now),
        updatedAt: String(now),
        fileResults: [
          { filename: recording.s3Key, size: '11', duration: '10000000000' },
        ],
      },
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
    for (let i = 0; i < 2; i++)
      await h.request('/livekit/webhook', {
        actor: null,
        method: 'POST',
        headers: { authorization: auth },
        body,
        status: 200,
      });
    const completed = await h.db.meetingRecording.findUniqueOrThrow({
      where: { id: recording.id },
    });
    assert.equal(completed.status, 'COMPLETED');
    assert.equal(completed.sizeBytes, 11n);
    assert.equal(completed.durationSeconds, 10);
    const version = completed.version;
    const { EgressInfo } = serviceRequire('communication-service')(
      'livekit-server-sdk',
    );
    await h.worker.applyEgress(
      EgressInfo.fromJson({
        ...body.egressInfo,
        status: 'EGRESS_ACTIVE',
        updatedAt: '1',
      }),
    );
    assert.equal(
      (
        await h.db.meetingRecording.findUniqueOrThrow({
          where: { id: recording.id },
        })
      ).version,
      version,
    );
  });

  test('RECORDING-04: pause/resume enqueue transitions; missing media capability is explicit', async () => {
    const meeting = await h.instant();
    const recording = await h.readyRecording(meeting, {
      status: 'RECORDING',
      segmentKey: 'segments/audit.mp4',
      completedAt: null,
      stoppedAt: null,
    });
    const pause = await h.request(
      `/${meeting.joinToken}/recordings/${recording.id}/pause`,
      {
        method: 'POST',
        body: {},
        headers: { 'idempotency-key': randomUUID() },
        status: 202,
      },
    );
    assert.equal(pause.payload.status, 'PAUSING');
    await h.db.meetingRecording.update({
      where: { id: recording.id },
      data: { status: 'PAUSED' },
    });
    const resume = await h.request(
      `/${meeting.joinToken}/recordings/${recording.id}/resume`,
      {
        method: 'POST',
        body: {},
        headers: { 'idempotency-key': randomUUID() },
        status: 202,
      },
    );
    assert.equal(resume.payload.status, 'STARTING');
    h.mediaAvailable = false;
    await h.request(`/${meeting.joinToken}/recordings/${recording.id}/pause`, {
      method: 'POST',
      body: {},
      headers: { 'idempotency-key': randomUUID() },
      status: 503,
    });
  });

  test('RECORDING-05: view/download permissions, owner-only mutations and durable shared access', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    const recording = await h.readyRecording(meeting);
    await h.request(`/recordings/${recording.id}`, {
      actor: h.actors.member,
      status: 404,
    });
    await h.request(
      `/recordings/${recording.id}/permissions/${h.actors.member.id}`,
      {
        method: 'PUT',
        body: { canView: true, canDownload: false },
        status: 200,
      },
    );
    const login = {
      token: h.sign({ ...h.actors.member.claims, jti: randomUUID() }),
    };
    await h.request(`/recordings/${recording.id}/playback-url`, {
      actor: login,
      method: 'POST',
      body: {},
      status: 200,
    });
    await h.request(`/recordings/${recording.id}/download-url`, {
      actor: login,
      method: 'POST',
      body: {},
      status: 403,
    });
    await h.request(`/recordings/${recording.id}`, {
      actor: login,
      method: 'PATCH',
      body: { title: 'Foreign rename' },
      status: 403,
    });
    await h.request(`/recordings/${recording.id}`, {
      method: 'PATCH',
      body: { title: 'Renamed' },
      status: 200,
    });
    const listing = await h.request('/recordings?scope=shared', {
      actor: login,
      status: 200,
    });
    assert.ok(listing.payload.items.some((row) => row.id === recording.id));
    await h.request(
      `/recordings/${recording.id}/permissions/${h.actors.member.id}`,
      {
        method: 'PUT',
        body: { canView: true, canDownload: true },
        status: 200,
      },
    );
    await h.request(`/recordings/${recording.id}/download-url`, {
      actor: login,
      method: 'POST',
      body: {},
      status: 200,
    });
    await h.request(
      `/recordings/${recording.id}/permissions/${h.actors.member.id}`,
      { method: 'DELETE', status: 200 },
    );
    await h.request(`/recordings/${recording.id}/playback-url`, {
      actor: login,
      method: 'POST',
      body: {},
      status: 404,
    });
  });

  test('RECORDING-06: permission revoked during URL signing cannot return a fresh playback URL', async () => {
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
    const result = await holdProvider(
      h,
      '/storage/sign',
      () =>
        h.request(`/recordings/${recording.id}/playback-url`, {
          actor: h.actors.member,
          method: 'POST',
          body: {},
        }),
      () =>
        h.request(
          `/recordings/${recording.id}/permissions/${h.actors.member.id}`,
          { method: 'DELETE', status: 200 },
        ),
    );
    assert.equal(
      result.status,
      404,
      'revoked access follows the existing not-found contract',
    );
  });

  test('RECORDING-13: download-only revocation during signing blocks download but keeps viewing', async () => {
    const meeting = await h.instant(),
      recording = await h.readyRecording(meeting);
    await h.request(
      `/recordings/${recording.id}/permissions/${h.actors.member.id}`,
      {
        method: 'PUT',
        body: { canView: true, canDownload: true },
        status: 200,
      },
    );
    const response = await holdProvider(
      h,
      '/storage/sign',
      () =>
        h.request(`/recordings/${recording.id}/download-url`, {
          actor: h.actors.member,
          method: 'POST',
          body: {},
        }),
      () =>
        h.request(
          `/recordings/${recording.id}/permissions/${h.actors.member.id}`,
          {
            method: 'PUT',
            body: { canView: true, canDownload: false },
            status: 200,
          },
        ),
    );
    assert.equal(response.status, 403);
    await h.request(`/recordings/${recording.id}/playback-url`, {
      actor: h.actors.member,
      method: 'POST',
      body: {},
      status: 200,
    });
  });

  test('RECORDING-07: delete is owner-only, denies playback immediately and worker removes the object', async () => {
    const meeting = await h.instant(),
      recording = await h.readyRecording(meeting);
    await h.request(
      `/recordings/${recording.id}/permissions/${h.actors.member.id}`,
      {
        method: 'PUT',
        body: { canView: true, canDownload: true },
        status: 200,
      },
    );
    await h.request(`/recordings/${recording.id}`, {
      actor: h.actors.member,
      method: 'DELETE',
      status: 403,
    });
    await h.request(`/recordings/${recording.id}`, {
      method: 'DELETE',
      status: 202,
    });
    await h.request(`/recordings/${recording.id}/playback-url`, {
      method: 'POST',
      body: {},
      status: 404,
    });
    h.worker.nextReconcileAt = Date.now() + 60000;
    h.worker.nextAutoAt = Date.now() + 60000;
    await h.worker.tick();
    assert.equal(h.providers.objects.has(recording.s3Key), false);
    assert.equal(
      await h.db.meetingRecordingPermission.count({
        where: { recordingId: recording.id },
      }),
      0,
    );
  });

  test('RECORDING-08: provider outage and malformed layouts do not enqueue an unusable recording', async () => {
    const meeting = await h.instant();
    await h.request(`/${meeting.joinToken}/recordings`, {
      method: 'POST',
      body: { layout: 'unsupported' },
      headers: { 'idempotency-key': randomUUID() },
      status: 400,
    });
    h.providers.failures.set('/twirp/livekit.Egress/ListEgress', 503);
    const response = await h.request(`/${meeting.joinToken}/recordings`, {
      method: 'POST',
      body: {},
      headers: { 'idempotency-key': randomUUID() },
    });
    assert.equal(
      response.status,
      503,
      JSON.stringify(h.providers.calls.slice(-3)),
    );
    assert.equal(
      await h.db.meetingRecording.count({ where: { meetingId: meeting.id } }),
      0,
    );
  });

  test('RECORDING-09: sequential replay, payload conflict and repeated stop preserve one durable job', async () => {
    const meeting = await h.instant(),
      key = randomUUID();
    const start = () =>
      h.request(`/${meeting.joinToken}/recordings`, {
        method: 'POST',
        body: { layout: 'speaker' },
        headers: { 'idempotency-key': key },
        status: 202,
      });
    const first = await start(),
      replay = await start();
    assert.equal(first.payload.id, replay.payload.id);
    await h.request(`/${meeting.joinToken}/recordings`, {
      method: 'POST',
      body: { layout: 'grid' },
      headers: { 'idempotency-key': key },
      status: 409,
    });
    const stopKey = randomUUID();
    for (let i = 0; i < 2; i++)
      await h.request(
        `/${meeting.joinToken}/recordings/${first.payload.id}/stop`,
        {
          method: 'POST',
          body: {},
          headers: { 'idempotency-key': stopKey },
          status: 202,
        },
      );
    assert.equal(
      await h.db.meetingRecordingJob.count({
        where: {
          recordingId: first.payload.id,
          kind: 'STOP',
          state: 'PENDING',
        },
      }),
      1,
    );
    assert.equal(
      (
        await h.db.meetingRecording.findUniqueOrThrow({
          where: { id: first.payload.id },
        })
      ).status,
      'PROCESSING',
    );
  });

  test('RECORDING-10: attendees share excludes users joining after stop and ownership survives host transfer', async () => {
    const meeting = await h.instant();
    await h.join(meeting);
    const cutoff = new Date();
    const recording = await h.readyRecording(meeting, { stoppedAt: cutoff });
    await h.join(meeting, 'other');
    await h.db.meetingParticipant.updateMany({
      where: { meetingId: meeting.id, userId: h.actors.other.id },
      data: { joinedAt: new Date(cutoff.getTime() + 1000) },
    });
    await h.db.meetingEvent.updateMany({
      where: {
        meetingId: meeting.id,
        actorId: h.actors.other.id,
        type: 'PARTICIPANT_JOINED',
      },
      data: { createdAt: new Date(cutoff.getTime() + 1000) },
    });
    await h.request(`/recordings/${recording.id}/permissions/participants`, {
      method: 'POST',
      body: { canDownload: false },
      status: 200,
    });
    const permissions = await h.db.meetingRecordingPermission.findMany({
      where: { recordingId: recording.id },
    });
    assert.deepEqual(
      permissions.map((permission) => permission.userId),
      [h.actors.member.id],
    );
    await h.request(
      `/${meeting.joinToken}/participants/${h.actors.member.id}/role`,
      { method: 'PATCH', body: { role: 'HOST' }, status: 200 },
    );
    await h.request(`/recordings/${recording.id}`, {
      actor: h.actors.member,
      method: 'PATCH',
      body: { title: 'New host rename' },
      status: 403,
    });
    await h.request(`/recordings/${recording.id}`, {
      method: 'PATCH',
      body: { title: 'Original owner rename' },
      status: 200,
    });
  });

  test('RECORDING-11: automatic recording queues once for a connected host', async () => {
    const meeting = await h.instant({ autoRecord: true });
    await h.worker.requestAutomaticRecording(meeting.roomName);
    await h.worker.requestAutomaticRecording(meeting.roomName);
    assert.equal(
      await h.db.meetingRecording.count({ where: { meetingId: meeting.id } }),
      1,
    );
    assert.equal(
      await h.db.meetingRecordingJob.count({
        where: { recording: { meetingId: meeting.id }, kind: 'START' },
      }),
      1,
    );
  });

  test('RECORDING-12: global recording capacity admits only one of two concurrent rooms', async () => {
    const first = await h.instant(),
      second = await h.instant();
    const capacity = process.env.MEETING_RECORDING_MAX_CONCURRENT;
    process.env.MEETING_RECORDING_MAX_CONCURRENT = '1';
    let results;
    try {
      results = await Promise.all(
        [first, second].map((meeting) =>
          h.request(`/${meeting.joinToken}/recordings`, {
            method: 'POST',
            body: {},
            headers: { 'idempotency-key': randomUUID() },
          }),
        ),
      );
    } finally {
      process.env.MEETING_RECORDING_MAX_CONCURRENT = capacity;
    }
    assert.deepEqual(results.map((result) => result.status).sort(), [202, 429]);
  });
}
