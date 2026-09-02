import { ForbiddenException } from '@nestjs/common';
import { EventSourceType, EventVisibility } from '@prisma/client';
import { EventWithRelations } from './calendar-event.types';
import { EventAccessPolicy } from './event-access.policy';

describe('EventAccessPolicy', () => {
  const policy = new EventAccessPolicy({} as never);
  const event = {
    createdBy: 'owner',
    sourceType: EventSourceType.USER,
    visibility: EventVisibility.DEFAULT,
    calendar: { ownerUserId: 'owner' },
    attendees: [{ userId: 'guest' }],
  };

  it('allows an invited attendee to view an event', () => {
    expect(() =>
      policy.assertCanViewEvent('guest', event as EventWithRelations),
    ).not.toThrow();
  });

  it('rejects an outsider from viewing a private event', () => {
    expect(() =>
      policy.assertCanViewEvent('outsider', event as EventWithRelations),
    ).toThrow(ForbiddenException);
  });

  it('rejects management of synchronized task events', () => {
    expect(() =>
      policy.assertUserManagedEvent({
        ...event,
        sourceType: EventSourceType.TASK,
      } as EventWithRelations),
    ).toThrow(ForbiddenException);
  });
});
