import { ProjectSocketPublisher } from './project-socket.publisher';
import { SocketEventEmitter } from './socket-event-emitter';
import { SocketRoomService } from './socket-room.service';

describe('ProjectSocketPublisher', () => {
  const events = {
    emitToRooms: jest.fn(),
    emitToUser: jest.fn(),
    removeUserFromRoom: jest.fn(),
  } as unknown as SocketEventEmitter;
  const publisher = new ProjectSocketPublisher(events, new SocketRoomService());

  beforeEach(() => jest.clearAllMocks());

  it('publishes project changes through the shared socket emitter', () => {
    const event = {
      projectId: 'aa5658c8-24cd-42d8-8722-c3b7add9e50f',
      resource: 'TASK' as const,
      action: 'UPDATED' as const,
      actorId: USER_ID,
      occurredAt: new Date().toISOString(),
    };
    publisher.publish(event, [TARGET_USER_ID]);

    expect(events.emitToRooms).toHaveBeenCalledWith(`project:${event.projectId}`, 'project:changed', event);
    expect(events.emitToUser).toHaveBeenCalledWith(TARGET_USER_ID, 'project:changed', event);
  });

  it('removes a deleted member from the project room', () => {
    publisher.publish({
      projectId: 'aa5658c8-24cd-42d8-8722-c3b7add9e50f',
      resource: 'MEMBER',
      action: 'DELETED',
      actorId: USER_ID,
      occurredAt: new Date().toISOString(),
    }, [TARGET_USER_ID]);

    expect(events.removeUserFromRoom).toHaveBeenCalledWith(TARGET_USER_ID, 'project:aa5658c8-24cd-42d8-8722-c3b7add9e50f');
  });
});

const USER_ID = '9d0deeb4-a868-45d9-923e-62feecde6a6e';
const TARGET_USER_ID = '190d156b-f262-49e3-b575-aab621404b52';
