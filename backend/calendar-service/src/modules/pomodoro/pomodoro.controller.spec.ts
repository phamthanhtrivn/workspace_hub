/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { PomodoroController } from './pomodoro.controller';
import { PomodoroService } from './pomodoro.service';

describe('Calendar Pomodoro API (integration)', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  let app: INestApplication;
  const service = {
    getConfig: jest.fn(),
    create: jest.fn(),
    list: jest.fn(),
    deleteState: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PomodoroController],
      providers: [{ provide: PomodoroService, useValue: service }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('returns config in the standard Calendar envelope', async () => {
    service.getConfig.mockResolvedValue({ focusDuration: 25 });
    const response = await request(app.getHttpServer())
      .get('/api/calendar/pomodoro/config')
      .set('x-user-id', userId)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: { focusDuration: 25 },
    });
  });

  it('rejects an invalid session before writing it', async () => {
    await request(app.getHttpServer())
      .post('/api/calendar/pomodoro/sessions')
      .set('x-user-id', userId)
      .send({ sessionType: 'INVALID', status: 'COMPLETED' })
      .expect(400);

    expect(service.create).not.toHaveBeenCalled();
  });

  it('transforms and bounds session pagination', async () => {
    service.list.mockResolvedValue({
      sessions: [],
      summary: { focusSeconds: 0 },
    });
    await request(app.getHttpServer())
      .get('/api/calendar/pomodoro/sessions')
      .query({
        startAt: '2026-09-01T00:00:00Z',
        endAt: '2026-09-02T00:00:00Z',
        page: '2',
        limit: '20',
      })
      .set('x-user-id', userId)
      .expect(200);

    const query: unknown = service.list.mock.calls[0]?.[1];
    expect(query).toMatchObject({ page: 2, limit: 20 });
  });

  it('requires a version when clearing timer state', async () => {
    await request(app.getHttpServer())
      .delete('/api/calendar/pomodoro/state')
      .set('x-user-id', userId)
      .send({})
      .expect(400);

    expect(service.deleteState).not.toHaveBeenCalled();
  });
});
