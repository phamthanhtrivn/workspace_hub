import { CalendarConferenceSyncService } from './calendar-conference-sync.service';

describe('Occurrence conference synchronization', () => {
  const event = { id: 'first', calendarId: 'calendar', createdBy: 'host', conferenceEnabled: true,
    status: 'CONFIRMED', title: 'Planning', description: null,
    startAt: new Date('2030-01-01T09:00:00Z'), endAt: new Date('2030-01-01T10:00:00Z'), attendees: [] };
  it('enqueues one independent binding per occurrence and does not requeue identical snapshots', async () => {
    const bindings: any[] = [];
    const tx = { $queryRaw: jest.fn(), calendarEvent: { findMany: jest.fn().mockResolvedValue([event, { ...event, id: 'second' }]) }, calendarConference: {
      findMany: jest.fn(async () => [...bindings]),
      upsert: jest.fn(async ({ create }) => bindings.push(create)), update: jest.fn(),
    } };
    const service = new CalendarConferenceSyncService({} as any);
    await service.reconcileCalendar(tx as any, 'calendar');
    expect(bindings.map(binding => binding.eventId)).toEqual(['first', 'second']);
    await service.reconcileCalendar(tx as any, 'calendar');
    expect(tx.calendarConference.upsert).toHaveBeenCalledTimes(2);
  });
  it('keeps a cancellation job when a recurring occurrence is removed', async () => {
    const tx = { $queryRaw: jest.fn(), calendarEvent: { findMany: jest.fn().mockResolvedValue([]) }, calendarConference: {
      findMany: jest.fn().mockResolvedValue([{ eventId: 'removed', enabled: true, payload: { eventId: 'removed', hostId: 'host' } }]), update: jest.fn(),
    } };
    await new CalendarConferenceSyncService({} as any).reconcileCalendar(tx as any, 'calendar');
    expect(tx.calendarConference.update).toHaveBeenCalledWith(expect.objectContaining({ where: { eventId: 'removed' }, data: expect.objectContaining({ enabled: false, status: 'PENDING' }) }));
  });
});
