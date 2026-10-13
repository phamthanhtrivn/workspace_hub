import { LiveKitService } from './livekit.service';
import type { StartEgressRequest } from 'livekit-server-sdk';
import {
  LIVEKIT_ROOM_DEPARTURE_TIMEOUT_SECONDS,
  LIVEKIT_ROOM_EMPTY_TIMEOUT_SECONDS,
} from './types/livekit.constants';

describe('LiveKitService', () => {
  beforeEach(() => {
    jest.replaceProperty(process, 'env', { ...process.env });
    process.env.LIVEKIT_URL = 'ws://livekit:7880';
    process.env.LIVEKIT_PUBLIC_URL = 'ws://localhost:7880';
    process.env.LIVEKIT_API_KEY = 'test-key';
    process.env.LIVEKIT_API_SECRET = 'test-secret';
  });

  afterEach(() => jest.restoreAllMocks());

  it.each(['speaker', 'grid', 'screen'])(
    'uses the application template for the %s recording layout',
    async (layout) => {
      process.env.LIVEKIT_RECORDING_TEMPLATE_URL =
        'http://web:3000/recording-template';
      const service = new LiveKitService();
      const startEgress = jest
        .fn<Promise<{ egressId: string }>, [StartEgressRequest]>()
        .mockResolvedValue({ egressId: 'egress-1' });
      jest.spyOn(service, 'createEgressClient').mockReturnValue({
        startEgress,
      } as never);

      await service.startRecording('room-1', 'recordings/test.mp4', layout);

      expect(startEgress.mock.calls[0][0].source).toMatchObject({
        case: 'template',
        value: {
          layout,
          customBaseUrl: 'http://web:3000/recording-template',
        },
      });
    },
  );

  it('rejects a missing application template instead of recording shared screens with the default template', () => {
    delete process.env.LIVEKIT_RECORDING_TEMPLATE_URL;
    const service = new LiveKitService();
    const createClient = jest.spyOn(service, 'createEgressClient');

    expect(() =>
      service.startRecording('room-1', 'recordings/test.mp4', 'speaker'),
    ).toThrow('The meeting recording template is not configured');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('reports recording unavailable when the application template is missing', () => {
    Object.assign(process.env, {
      MEETING_RECORDING_ENABLED: 'true',
      AWS_S3_BUCKET_NAME: 'test-bucket',
      JWT_SECRET_KEY: 'test-jwt',
      AWS_REGION: 'test-region',
      AWS_ACCESS_KEY: 'test-access',
      AWS_SECRET_KEY: 'test-secret',
      LIVEKIT_EGRESS_WEBHOOK_URL: 'http://communication/egress-webhook',
    });
    delete process.env.LIVEKIT_RECORDING_TEMPLATE_URL;
    const service = new LiveKitService();

    expect(service.isRecordingConfigured()).toBe(false);
    process.env.LIVEKIT_RECORDING_TEMPLATE_URL =
      'http://web:3000/recording-template';
    expect(service.isRecordingConfigured()).toBe(true);
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
