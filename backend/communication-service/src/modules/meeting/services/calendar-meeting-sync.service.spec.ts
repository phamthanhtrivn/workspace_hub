import { CalendarMeetingSyncService } from './calendar-meeting-sync.service';

describe('Calendar meeting idempotency', () => {
  function setup(status = 'SCHEDULED', revision = 1n) {
    const meeting = { id: 'meeting', joinToken: 'token', createdBy: 'host', status, calendarSyncRevision: revision, scheduledStartAt: new Date('2030-01-01T09:00:00Z') };
    const tx = { calendarMeetingSyncState: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() }, $queryRaw: jest.fn(), meeting: { findUnique: jest.fn().mockResolvedValue(meeting), update: jest.fn(({ data }) => ({ ...meeting, ...data })), create: jest.fn() }, meetingParticipant: { deleteMany: jest.fn(), createMany: jest.fn() } };
    const service = new CalendarMeetingSyncService({ $transaction: (operation: any) => operation(tx) } as any);
    const dto = { eventId: 'event', hostId: 'host', revision: '2', enabled: true, title: 'Updated', scheduledStartAt: '2030-01-01T11:00:00Z', scheduledEndAt: '2030-01-01T12:00:00Z', inviteeIds: [] };
    return { service, tx, dto };
  }
  it('ignores a replay or older revision', async () => {
    const { service, tx, dto } = setup('SCHEDULED', 3n);
    await service.sync(dto); expect(tx.meeting.update).not.toHaveBeenCalled(); expect(tx.meeting.create).not.toHaveBeenCalled();
  });
  it.each(['LIVE', 'ENDED'])('does not reschedule or cancel a %s room', async status => {
    const { service, tx, dto } = setup(status);
    await service.sync({ ...dto, enabled: false });
    expect(tx.meeting.update).toHaveBeenCalledWith({ where: { id: 'meeting' }, data: { calendarSyncRevision: 2n } });
  });
  it('does not resurrect a cancelled occurrence when an older create arrives', async () => {
    const { service, tx, dto } = setup();
    tx.meeting.findUnique.mockResolvedValue(null as any);
    tx.calendarMeetingSyncState.findUnique.mockResolvedValue({ revision: 3n } as any);
    await service.sync(dto);
    expect(tx.meeting.create).not.toHaveBeenCalled();
  });
  it('rejects a different host before updating the room', async () => {
    const { service, tx, dto } = setup();
    await expect(service.sync({ ...dto, hostId: 'outsider' })).rejects.toThrow('Meeting owner');
    expect(tx.meeting.update).not.toHaveBeenCalled();
  });
});
