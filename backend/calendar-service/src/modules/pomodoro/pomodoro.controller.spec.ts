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
    saveConfig: jest.fn(),
    dailyStats: jest.fn(),
    getState: jest.fn(),
    saveState: jest.fn(),
    create: jest.fn(),
    list: jest.fn(),
    today: jest.fn(),
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

  it('requires a user ID before reading config', async () => {
    await request(app.getHttpServer())
      .get('/api/calendar/pomodoro/config')
      .expect(400);
    expect(service.getConfig).not.toHaveBeenCalled();
  });

  it('validates and saves config', async () => {
    const config = {
      focusDuration: 25,
      shortBreak: 5,
      longBreak: 15,
      longBreakInterval: 4,
      autoStartBreak: false,
      autoStartFocus: false,
      soundEnabled: true,
      soundType: 'chime',
      soundVolume: 0.7,
      notificationEnabled: true,
      dailyGoalPomodoros: 8,
    };
    await request(app.getHttpServer())
      .put('/api/calendar/pomodoro/config')
      .set('x-user-id', userId)
      .send({ ...config, focusDuration: 0 })
      .expect(400);
    await request(app.getHttpServer())
      .put('/api/calendar/pomodoro/config')
      .set('x-user-id', userId)
      .send({ ...config, shortBreak: 0 })
      .expect(400);
    expect(service.saveConfig).not.toHaveBeenCalled();

    service.saveConfig.mockResolvedValue(config);
    const response = await request(app.getHttpServer())
      .put('/api/calendar/pomodoro/config')
      .set('x-user-id', userId)
      .send(config)
      .expect(200);
    expect(response.body).toMatchObject({ success: true, data: config });
    expect(service.saveConfig).toHaveBeenCalledWith(userId, config);
  });

  it('passes the date and time zone to daily stats', async () => {
    service.dailyStats.mockResolvedValue({ completedPomodoros: 1 });
    const response = await request(app.getHttpServer())
      .get('/api/calendar/pomodoro/stats/daily')
      .query({ date: '2026-09-27', timeZone: 'Asia/Ho_Chi_Minh' })
      .set('x-user-id', userId)
      .expect(200);
    expect(response.body.data.completedPomodoros).toBe(1);
    expect(service.dailyStats).toHaveBeenCalledWith(
      userId,
      '2026-09-27',
      'Asia/Ho_Chi_Minh',
    );
  });

  it('reads, validates and saves timer state', async () => {
    service.getState.mockResolvedValue({ status: 'IDLE', version: 2 });
    const read = await request(app.getHttpServer())
      .get('/api/calendar/pomodoro/state')
      .set('x-user-id', userId)
      .expect(200);
    expect(read.body.data.version).toBe(2);

    const state = {
      mode: 'FOCUS',
      status: 'IDLE',
      remainingSeconds: 1500,
      cycleCount: 0,
      notes: '',
      expectedVersion: 2,
    };
    await request(app.getHttpServer())
      .put('/api/calendar/pomodoro/state')
      .set('x-user-id', userId)
      .send({ ...state, expectedVersion: -1 })
      .expect(400);
    expect(service.saveState).not.toHaveBeenCalled();

    service.saveState.mockResolvedValue({ ...state, version: 3 });
    const saved = await request(app.getHttpServer())
      .put('/api/calendar/pomodoro/state')
      .set('x-user-id', userId)
      .send(state)
      .expect(200);
    expect(saved.body.data.version).toBe(3);
    expect(service.saveState).toHaveBeenCalledWith(
      userId,
      expect.objectContaining(state),
    );
  });

  it('lists today sessions and creates a valid session', async () => {
    service.today.mockResolvedValue([{ id: 'session-one' }]);
    const today = await request(app.getHttpServer())
      .get('/api/calendar/pomodoro/sessions/today')
      .query({ timeZone: 'Asia/Ho_Chi_Minh' })
      .set('x-user-id', userId)
      .expect(200);
    expect(today.body.data).toHaveLength(1);
    expect(service.today).toHaveBeenCalledWith(userId, 'Asia/Ho_Chi_Minh');

    const session = {
      sessionType: 'FOCUS',
      status: 'COMPLETED',
      startedAt: '2026-09-27T08:00:00Z',
      endedAt: '2026-09-27T08:25:00Z',
      plannedSeconds: 1500,
      actualSeconds: 1500,
    };
    service.create.mockResolvedValue({ id: 'session-two', ...session });
    const created = await request(app.getHttpServer())
      .post('/api/calendar/pomodoro/sessions')
      .set('x-user-id', userId)
      .send(session)
      .expect(201);
    expect(created.body.data.id).toBe('session-two');
    expect(service.create).toHaveBeenCalledWith(
      userId,
      expect.objectContaining(session),
    );
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

  it('clears timer state with the expected version', async () => {
    service.deleteState.mockResolvedValue({ status: 'IDLE', version: 4 });
    const response = await request(app.getHttpServer())
      .delete('/api/calendar/pomodoro/state')
      .set('x-user-id', userId)
      .send({ expectedVersion: 3 })
      .expect(200);
    expect(response.body.data.version).toBe(4);
    expect(service.deleteState).toHaveBeenCalledWith(userId, 3);
  });
});
