import {
  AttendeeResponseStatus,
  EventSourceType,
  EventStatus,
  EventVisibility,
} from '@prisma/client';
import { EventMapper } from './event.mapper';

describe('EventMapper', () => {
  it('maps internal relations and permissions to the public event shape', () => {
    const mapper = new EventMapper();
    const event = {
      id: 'event-id',
      createdBy: 'owner',
      sourceType: EventSourceType.USER,
      status: EventStatus.CONFIRMED,
      visibility: EventVisibility.DEFAULT,
      calendar: { ownerUserId: 'owner', timeZone: 'Asia/Ho_Chi_Minh' },
      attendees: [
        {
          userId: 'guest',
          responseStatus: AttendeeResponseStatus.NEEDS_ACTION,
        },
      ],
      documents: [{ documentId: 'document-id' }],
      recurrenceSeries: null,
    } as never;

    expect(mapper.toPublicEvent('owner', event)).toEqual(
      expect.objectContaining({
        documentIds: ['document-id'],
        exceptionDates: [],
        recurrenceRule: null,
        recurrenceParentId: null,
        timeZone: 'Asia/Ho_Chi_Minh',
        permissions: { canManage: true, canRespond: false },
      }),
    );
  });

  it('marks project tasks as read-only', () => {
    const mapper = new EventMapper();
    const event = {
      id: 'event-id',
      createdBy: 'owner',
      sourceType: EventSourceType.TASK,
      sourceId: null,
      status: EventStatus.CONFIRMED,
      visibility: EventVisibility.DEFAULT,
      calendar: {
        ownerUserId: 'owner',
        projectId: 'project-id',
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      attendees: [],
      documents: [],
      recurrenceSeries: null,
    } as never;

    expect(mapper.toPublicEvent('owner', event)).toEqual(
      expect.objectContaining({
        permissions: { canManage: false, canRespond: false },
      }),
    );
  });
});
