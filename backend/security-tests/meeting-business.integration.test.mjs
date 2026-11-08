import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { MeetingHarness } from './meeting/harness.mjs';
import { registerSchedulingTests } from './meeting/scheduling.mjs';
import { registerParticipationTests } from './meeting/participation.mjs';
import { registerChatHistoryTests } from './meeting/chat-history.mjs';
import { registerRecordingTests } from './meeting/recording.mjs';
import { registerRealtimeRaceTests } from './meeting/realtime-races.mjs';
import { registerIntegrationTests } from './meeting/integrations.mjs';
import { registerAITests } from './meeting/ai-tests.mjs';

describe(
  'Meeting isolated business audit',
  {
    skip: process.env.WORKSPACEHUB_MEETING_INTEGRATION !== '1',
    timeout: 600000,
    concurrency: false,
  },
  () => {
    const h = new MeetingHarness();
    before(
      async () => {
        await h.start();
      },
      { timeout: 240000 },
    );
    after(
      async () => {
        await h.close();
      },
      { timeout: 90000 },
    );
    beforeEach(async () => {
      h.providers.failures.clear();
      h.providers.holds.clear();
      h.mediaAvailable = true;
      await h.db.meetingRecording.updateMany({
        where: {
          status: {
            in: ['STARTING', 'RECORDING', 'PAUSING', 'PAUSED', 'PROCESSING'],
          },
        },
        data: { status: 'FAILED' },
      });
      await h.db.meetingRecordingJob.deleteMany();
    });

    test('ENV-01: isolated migrated database and real HTTP can create an instant room', async () => {
      const meeting = await h.instant();
      assert.equal(meeting.status, 'LIVE');
      assert.equal(meeting.hostId, h.actors.host.id);
      assert.equal(
        await h.db.meetingParticipant.count({
          where: { meetingId: meeting.id, status: 'JOINED' },
        }),
        1,
      );
      assert.ok(h.providers.rooms.has(meeting.roomName));
    });
    registerSchedulingTests(h);
    registerParticipationTests(h);
    registerChatHistoryTests(h);
    registerRecordingTests(h);
    registerRealtimeRaceTests(h);
    registerIntegrationTests(h);
    registerAITests(h);
  },
);
