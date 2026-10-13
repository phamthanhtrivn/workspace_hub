jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
jest.mock('livekit-server-sdk', () => ({
  TrackSource: {
    CAMERA: 1,
    MICROPHONE: 2,
    SCREEN_SHARE: 3,
    SCREEN_SHARE_AUDIO: 4,
  },
}));

import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { createHmac } from 'crypto';
import { Server } from 'http';
import { MeetingRecordingController } from './meeting-recording.controller';
import { MeetingRecordingService } from './services/meeting-recording.service';

describe('recording API contract', () => {
  let app: INestApplication<Server>;
  const id = '951b9697-a1d5-4af0-9014-1dafad039f51';
  const secret = 'recording-api-test-secret';
  const encoded = [
    { alg: 'HS256' },
    {
      sub: id,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'workspace-hub',
      role: 'USER',
    },
  ]
    .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
    .join('.');
  const authorization = `Bearer ${encoded}.${createHmac('sha256', secret).update(encoded).digest('base64url')}`;
  const calls = {
    start: jest.fn().mockResolvedValue({ id, status: 'STARTING' }),
    grantRecording: jest.fn(),
    list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET_KEY = secret;
    const module = await Test.createTestingModule({
      controllers: [MeetingRecordingController],
      providers: [{ provide: MeetingRecordingService, useValue: calls }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires an authenticated context', async () => {
    await request(app.getHttpServer())
      .get('/api/meetings/recordings')
      .expect(401);
    expect(calls.list).not.toHaveBeenCalled();
  });
  it('returns 202 for an accepted recording command', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/meetings/join-token/recordings')
      .set('Authorization', authorization)
      .set('Idempotency-Key', 'request-1')
      .send({ layout: 'speaker' })
      .expect(202);
    expect(result.body).toMatchObject({ data: { id, status: 'STARTING' } });
    expect(calls.start).toHaveBeenCalledWith(
      'join-token',
      id,
      { layout: 'speaker' },
      'request-1',
    );
  });
  it('rejects unsupported layouts before running a command', async () => {
    await request(app.getHttpServer())
      .post('/api/meetings/join-token/recordings')
      .set('Authorization', authorization)
      .send({ layout: 'arbitrary-url' })
      .expect(400);
    expect(calls.start).not.toHaveBeenCalled();
  });
  it('validates booleans instead of accepting truthy strings as grants', async () => {
    await request(app.getHttpServer())
      .patch(`/api/meetings/join-token/participants/${id}/recording-permission`)
      .set('Authorization', authorization)
      .send({ canRecord: 'true' })
      .expect(400);
    expect(calls.grantRecording).not.toHaveBeenCalled();
  });
  it('rejects invalid recording IDs and oversized page sizes', async () => {
    await request(app.getHttpServer())
      .get('/api/meetings/recordings/not-a-uuid')
      .set('Authorization', authorization)
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/meetings/recordings?limit=999')
      .set('Authorization', authorization)
      .expect(400);
  });
  it('rejects a forged identity header without a signed token', async () => {
    await request(app.getHttpServer())
      .get('/api/meetings/recordings')
      .set('x-user-id', id)
      .expect(401);
    expect(calls.list).not.toHaveBeenCalled();
  });
  it('takes identity from the signed token even if the header is forged', async () => {
    await request(app.getHttpServer())
      .get('/api/meetings/recordings')
      .set('Authorization', authorization)
      .set('x-user-id', 'other-user')
      .expect(200);
    expect(calls.list).toHaveBeenCalledWith(id, {});
  });
});
