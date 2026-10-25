import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  MeetingSummaryController,
  MeetingSummarySourceController,
} from './meeting-summary.controller';
import { MeetingRecordingService } from './services/meeting-recording.service';

describe('Meeting recording summaries', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const owner = '22222222-2222-4222-8222-222222222222';
  const viewer = '33333333-3333-4333-8333-333333333333';
  const key = 'fixture-meeting-service-key-not-production-000';
  const recordings = { detail: jest.fn(), summarySource: jest.fn() };
  let controller: MeetingSummaryController;
  let internal: MeetingSummarySourceController;
  const originalFetch = global.fetch;
  const originalEnabled = process.env.MEETING_SUMMARY_ENABLED;
  const originalKey = process.env.AI_COMMUNICATION_SERVICE_KEY;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.MEETING_SUMMARY_ENABLED = 'true';
    process.env.AI_COMMUNICATION_SERVICE_KEY = key;
    recordings.detail.mockResolvedValue({
      id,
      ownerId: owner,
      status: 'COMPLETED',
    });
    recordings.summarySource.mockResolvedValue({
      recordingId: id,
      revision: 'a'.repeat(64),
    });
    controller = new MeetingSummaryController(
      recordings as unknown as MeetingRecordingService,
    );
    internal = new MeetingSummarySourceController(
      recordings as unknown as MeetingRecordingService,
    );
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        Response.json({ status: 'COMPLETED', content: 'summary' }),
      );
  });
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEnabled === undefined)
      delete process.env.MEETING_SUMMARY_ENABLED;
    else process.env.MEETING_SUMMARY_ENABLED = originalEnabled;
    if (originalKey === undefined)
      delete process.env.AI_COMMUNICATION_SERVICE_KEY;
    else process.env.AI_COMMUNICATION_SERVICE_KEY = originalKey;
  });

  it('allows a shared viewer to read a result after rechecking access', async () => {
    const result = await controller.get(id, viewer);
    expect(result.data).toMatchObject({
      status: 'COMPLETED',
      content: 'summary',
      canCreate: false,
    });
    expect(result).toHaveProperty('message');
    expect(recordings.detail).toHaveBeenCalledTimes(2);
    expect(recordings.summarySource).not.toHaveBeenCalled();
  });

  it('checks owner access before sending a paid creation request', async () => {
    recordings.summarySource.mockRejectedValue(new ForbiddenException());
    await expect(controller.start(id, viewer)).rejects.toThrow(
      ForbiddenException,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('forwards only the authenticated actor and internal key', async () => {
    await controller.start(id, owner);
    const options = (global.fetch as jest.MockedFunction<typeof fetch>).mock
      .calls[0][1] as RequestInit;
    expect(JSON.parse(options.body as string)).toEqual({ actorId: owner });
    expect(options.headers).toMatchObject({ 'x-internal-service-key': key });
    expect(recordings.summarySource).toHaveBeenCalledWith(id, owner);
  });

  it('does not reveal a cached result after access has been revoked', async () => {
    recordings.detail
      .mockResolvedValueOnce({ id, ownerId: owner })
      .mockRejectedValueOnce(new ForbiddenException());
    await expect(controller.get(id, viewer)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('disabled feature returns no result or provider call', async () => {
    process.env.MEETING_SUMMARY_ENABLED = 'false';
    expect((await controller.get(id, owner)).data).toMatchObject({
      enabled: false,
      status: 'NOT_CREATED',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('source callback requires a matching dedicated service key', async () => {
    expect(() => internal.source(id, 'wrong-key', owner)).toThrow(
      UnauthorizedException,
    );
    expect(recordings.summarySource).not.toHaveBeenCalled();
    await internal.source(id, key, owner);
    expect(recordings.summarySource).toHaveBeenCalledWith(id, owner);
  });
});
