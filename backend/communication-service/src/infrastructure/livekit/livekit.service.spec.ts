import { LiveKitService } from './livekit.service';
import {
  LIVEKIT_ROOM_DEPARTURE_TIMEOUT_SECONDS,
  LIVEKIT_ROOM_EMPTY_TIMEOUT_SECONDS,
} from './types/livekit.constants';

describe('LiveKitService', () => {
  beforeEach(() => {
    process.env.LIVEKIT_URL = 'ws://livekit:7880';
    process.env.LIVEKIT_PUBLIC_URL = 'ws://localhost:7880';
    process.env.LIVEKIT_API_KEY = 'test-key';
    process.env.LIVEKIT_API_SECRET = 'test-secret';
  });

  it('sets one-hour empty and departure timeouts when creating a room', async () => {
    const service = new LiveKitService();
    const createRoom = jest.fn().mockResolvedValue({ name: 'room-1' });

    jest.spyOn(service, 'createRoomServiceClient').mockReturnValue({
      createRoom,
    } as never);

    await service.createRoom('room-1', {
      meetingType: 'INSTANT',
      createdBy: 'user-1',
    });

    expect(createRoom).toHaveBeenCalledWith({
      name: 'room-1',
      emptyTimeout: LIVEKIT_ROOM_EMPTY_TIMEOUT_SECONDS,
      departureTimeout: LIVEKIT_ROOM_DEPARTURE_TIMEOUT_SECONDS,
      metadata: JSON.stringify({
        meetingType: 'INSTANT',
        createdBy: 'user-1',
      }),
    });
  });
});
