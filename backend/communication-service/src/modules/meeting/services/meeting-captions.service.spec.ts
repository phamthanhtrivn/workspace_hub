import { BadRequestException, HttpException } from '@nestjs/common';
import { MEETING_ERROR_MESSAGES } from '../types/meeting.enums';
import { MeetingCaptionsService } from './meeting-captions.service';
import type { MeetingPolicyService } from './meeting-policy.service';
import type { LiveKitService } from '../../../infrastructure/livekit/livekit.service';

describe('Meeting captions access and service integration', () => {
  const policy = { assertJoinedMeetingParticipant: jest.fn() };
  const livekit = { isParticipantConnected: jest.fn() };
  const originalFetch = global.fetch;
  const originalUrl = process.env.CAPTION_SERVICE_URL;
  const originalToken = process.env.CAPTION_SERVICE_TOKEN;
  let service: MeetingCaptionsService;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.CAPTION_SERVICE_URL = 'http://captions:8095';
    process.env.CAPTION_SERVICE_TOKEN = 'internal-test-token';
    policy.assertJoinedMeetingParticipant.mockResolvedValue({
      meeting: { id: 'meeting-id', roomName: 'trusted-room' },
    });
    livekit.isParticipantConnected.mockResolvedValue(true);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          workerIdentity: 'captions:meeting-id',
          language: 'vi',
        }),
    });
    service = new MeetingCaptionsService(
      policy as unknown as MeetingPolicyService,
      livekit as unknown as LiveKitService,
    );
  });
  afterAll(() => {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.CAPTION_SERVICE_URL;
    else process.env.CAPTION_SERVICE_URL = originalUrl;
    if (originalToken === undefined) delete process.env.CAPTION_SERVICE_TOKEN;
    else process.env.CAPTION_SERVICE_TOKEN = originalToken;
  });

  it('derives the room and viewer from the authenticated meeting participant', async () => {
    await expect(service.start('join', 'user')).resolves.toMatchObject({
      language: 'vi',
    });
    const [url, request] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      { body: string; headers: { Authorization: string } },
    ];
    expect(url).toBe('http://captions:8095/sessions');
    expect(JSON.parse(request.body)).toEqual({
      meetingId: 'meeting-id',
      roomName: 'trusted-room',
      viewerId: 'user',
    });
    expect(request.headers.Authorization).toBe('Bearer internal-test-token');
  });
  it('denies outsiders before contacting the recognition service', async () => {
    policy.assertJoinedMeetingParticipant.mockRejectedValue(
      new HttpException('Forbidden', 403),
    );
    await expect(service.start('join', 'outsider')).rejects.toMatchObject({
      status: 403,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('denies stale joined participants without a live room connection', async () => {
    livekit.isParticipantConnected.mockResolvedValue(false);
    await expect(service.start('join', 'user')).rejects.toMatchObject({
      status: 403,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('releases only the authenticated viewers lease', async () => {
    await service.release('join', 'user');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://captions:8095/sessions/meeting-id/viewers/user',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
  it('treats cleanup after the room has ended as already released', async () => {
    policy.assertJoinedMeetingParticipant.mockRejectedValue(
      new BadRequestException(MEETING_ERROR_MESSAGES.MEETING_NOT_LIVE),
    );
    await expect(service.release('join', 'user')).resolves.toEqual({
      released: true,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('reports unavailable configuration and does not expose service credentials', async () => {
    delete process.env.CAPTION_SERVICE_TOKEN;
    await expect(service.status('join', 'user')).resolves.toEqual({
      available: false,
      language: 'vi',
    });
    await expect(service.start('join', 'user')).rejects.toMatchObject({
      status: 503,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('preserves recognition capacity errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 429 });
    await expect(service.start('join', 'user')).rejects.toMatchObject({
      status: 429,
    });
  });
  it('converts outages to an actionable 503', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new Error('Internal endpoint details'),
    );
    await expect(service.start('join', 'user')).rejects.toMatchObject({
      status: 503,
    });
  });
});
