import { ForbiddenException } from '@nestjs/common';
import { Calendar } from '@prisma/client';
import { EventWithRelations } from './calendar-event.types';
import { EventAccessPolicy } from './event-access.policy';

describe('EventAccessPolicy', () => {
  const policy = new EventAccessPolicy({} as never);
  const event = {
    createdBy: 'owner',
    calendar: { ownerUserId: 'owner' },
    attendees: [{ userId: 'guest' }],
  };

  it('allows an invited attendee to view an event', () => {
    expect(() =>
      policy.assertCanViewEvent('guest', event as unknown as EventWithRelations),
    ).not.toThrow();
  });

  it('rejects user-created events in project task calendars', () => {
    expect(() =>
      policy.assertPersonalCalendar({
        projectId: '11111111-1111-1111-1111-111111111111',
      } as Calendar),
    ).toThrow(ForbiddenException);
  });
});
