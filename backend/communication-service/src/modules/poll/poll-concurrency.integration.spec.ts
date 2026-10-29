import { randomUUID } from 'node:crypto';
import { PollService } from './poll.service';
import { CalendarMeetingSyncService } from '../meeting/services/calendar-meeting-sync.service';

const integration = process.env.TEST_UX_POSTGRES === 'true' ? describe : describe.skip;
integration('Poll and occurrence synchronization (isolated PostgreSQL)', () => {
  let prisma: any, cleanup: () => Promise<void>, polls: PollService, meetings: CalendarMeetingSyncService;
  const host = randomUUID(), channelId = randomUUID(), messageId = randomUUID();
  let options: Array<{ id: string }>;
  beforeAll(async () => {
    ({ prisma, cleanup } = await require('../../../../scripts/isolated-postgres.cjs').isolatedPostgres(process.cwd()));
    polls = new PollService(prisma, { attachSenderProfileToMessage: async message => message } as any, {} as any);
    meetings = new CalendarMeetingSyncService(prisma);
    const space = await prisma.space.create({ data: { name: 'Poll fixture', createdBy: host } });
    await prisma.channel.create({ data: { id: channelId, spaceId: space.id, name: 'Fixture', createdBy: host, members: { create: { userId: host } } } });
    await prisma.message.create({ data: { id: messageId, channelId, senderId: host, type: 'POLL', poll: { create: {
      title: 'Choose', createdBy: host, multipleChoice: false, allowAddOptions: true, anonymous: false,
      options: { create: [{ text: 'First' }, { text: 'Second' }] },
    } } } });
    options = await prisma.pollOption.findMany({ where: { poll: { messageId } } });
  }, 60_000);
  afterAll(async () => { await cleanup?.(); });

  it('serializes two tabs voting for different single-choice options', async () => {
    await Promise.all(options.map(option => polls.votePoll(channelId, messageId, option.id, host, true)));
    const votes = await prisma.pollVote.findMany({ where: { userId: host } });
    expect(votes).toHaveLength(1);
    await Promise.all([1, 2].map(() => polls.votePoll(channelId, messageId, votes[0].pollOptionId, host, true)));
    expect(await prisma.pollVote.count()).toBe(1);
  });
  it('keeps existing votes when switching to single choice is rejected', async () => {
    await polls.updatePoll(channelId, messageId, 'Choose', true, true, host);
    await Promise.all(options.map(option => polls.votePoll(channelId, messageId, option.id, host, true)));
    await expect(polls.updatePoll(channelId, messageId, 'Choose', false, true, host)).rejects.toThrow('multiple options');
    expect(await prisma.pollVote.count()).toBe(2);
  });
  it('creates one room under concurrent retries and retains cancellation watermarks', async () => {
    const dto = { eventId: randomUUID(), hostId: host, revision: '1', enabled: true, title: 'Fixture', scheduledStartAt: '2035-01-01T09:00:00Z', scheduledEndAt: '2035-01-01T10:00:00Z', inviteeIds: [] };
    const results = await Promise.all([meetings.sync(dto), meetings.sync(dto)]);
    expect(results[0].id).toBe(results[1].id);
    await meetings.sync({ ...dto, revision: '3', enabled: false });
    await meetings.sync({ ...dto, revision: '2' });
    expect((await prisma.meeting.findUnique({ where: { id: results[0].id } })).status).toBe('CANCELLED');
    const removed = { ...dto, eventId: randomUUID(), enabled: false, revision: '3' };
    await meetings.sync(removed);
    await meetings.sync({ ...removed, enabled: true, revision: '2' });
    expect(await prisma.meeting.count({ where: { calendarEventId: removed.eventId } })).toBe(0);
    await meetings.sync({ ...dto, revision: '4' });
    expect((await prisma.meeting.findUnique({ where: { id: results[0].id } })).status).toBe('SCHEDULED');
  });
});
