import { Server } from 'socket.io';
import { ProjectRealtimeService } from './project-realtime.service';

describe('ProjectRealtimeService', () => {
  it('publishes changes to the project room and selected user rooms', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const socketsLeave = jest.fn();
    const inRoom = jest.fn().mockReturnValue({ socketsLeave });
    const realtime = new ProjectRealtimeService();
    realtime.bindServer({ to, in: inRoom } as unknown as Server);
    const event = {
      projectId: 'aa5658c8-24cd-42d8-8722-c3b7add9e50f',
      resource: 'TASK' as const,
      action: 'UPDATED' as const,
      actorId: '9d0deeb4-a868-45d9-923e-62feecde6a6e',
      occurredAt: new Date().toISOString(),
    };

    realtime.publish(event, ['190d156b-f262-49e3-b575-aab621404b52']);

    expect(to).toHaveBeenCalledWith(`project:${event.projectId}`);
    expect(to).toHaveBeenCalledWith('project:user:190d156b-f262-49e3-b575-aab621404b52');
    expect(emit).toHaveBeenCalledWith('project:changed', event);
    expect(socketsLeave).not.toHaveBeenCalled();
  });

  it('removes deleted members from the project room server-side', () => {
    const to = jest.fn().mockReturnValue({ emit: jest.fn() });
    const socketsLeave = jest.fn();
    const inRoom = jest.fn().mockReturnValue({ socketsLeave });
    const realtime = new ProjectRealtimeService();
    realtime.bindServer({ to, in: inRoom } as unknown as Server);

    realtime.publish({
      projectId: 'aa5658c8-24cd-42d8-8722-c3b7add9e50f',
      resource: 'MEMBER',
      action: 'DELETED',
      actorId: '9d0deeb4-a868-45d9-923e-62feecde6a6e',
      occurredAt: new Date().toISOString(),
    }, ['190d156b-f262-49e3-b575-aab621404b52']);

    expect(inRoom).toHaveBeenCalledWith('project:user:190d156b-f262-49e3-b575-aab621404b52');
    expect(socketsLeave).toHaveBeenCalledWith('project:aa5658c8-24cd-42d8-8722-c3b7add9e50f');
  });
});
