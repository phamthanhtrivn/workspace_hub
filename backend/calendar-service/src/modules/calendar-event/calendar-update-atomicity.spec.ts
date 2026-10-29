import { CalendarEventService } from './calendar-event.facade';

describe('Calendar update notification atomicity', () => {
  it('does not enqueue invitations or updates if the event write fails', async () => {
    const service = Object.create(CalendarEventService.prototype) as any;
    const event = { id: 'event', calendarId: 'calendar', title: 'Old', createdBy: 'owner', calendar: {},
      startAt: new Date('2030-01-01T09:00:00Z'), endAt: new Date('2030-01-01T10:00:00Z'), attendees: [{ userId: 'guest' }] };
    service.accessPolicy = { findEventOrThrow: jest.fn().mockResolvedValue(event), assertCanManageEvent: jest.fn(), assertUserManagedEvent: jest.fn(), assertPersonalCalendar: jest.fn() };
    service.recurrence = { assertValidRule: jest.fn() };
    service.resourceAccess = { assertDocumentAccess: jest.fn() };
    service.notificationOutbox = { enqueueEventUpdate: jest.fn(), enqueueEventInvitations: jest.fn() };
    service.prisma = { $transaction: (operation: any) => operation({ calendarEvent: { update: jest.fn().mockRejectedValue(new Error('Write failed')) } }) };
    await expect(service.updateEvent('owner', undefined, 'event', { title: 'New' })).rejects.toThrow('Write failed');
    expect(service.notificationOutbox.enqueueEventUpdate).not.toHaveBeenCalled();
    expect(service.notificationOutbox.enqueueEventInvitations).not.toHaveBeenCalled();
  });
});
