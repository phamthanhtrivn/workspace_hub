import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { RuntimeConfigService } from '../../common/config/runtime-config.service';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { ChannelController } from './channel.controller';
import { ChannelService } from './channel.service';
import { PrivateChannelMembersService } from './private-channel-members.service';

describe('Private channel member directory HTTP contract', () => {
  let app: INestApplication;
  const directory = { getDirectory: jest.fn() };
  const channelId = '11111111-1111-4111-8111-111111111111';

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ChannelController],
      providers: [
        { provide: ChannelService, useValue: {} },
        { provide: RuntimeConfigService, useValue: {} },
        { provide: PrivateChannelMembersService, useValue: directory },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  afterEach(() => {
    directory.getDirectory.mockReset();
  });

  it('returns a single data envelope and parses page/search query values', async () => {
    const page = {
      canManage: true,
      memberCount: 2,
      members: [{ userId: 'member', joined: false }],
      pagination: { page: 2, pageSize: 10, total: 11, totalPages: 2 },
    };
    directory.getDirectory.mockResolvedValue(page);
    const response = await request(app.getHttpServer() as App)
      .get(`/api/channels/${channelId}/member-directory`)
      .set('x-user-id', 'owner')
      .query({ page: 2, search: 'member' })
      .expect(200);
    const body: unknown = response.body;
    expect(body).toMatchObject({ success: true, data: page });
    expect(body).not.toHaveProperty('data.data');
    expect(directory.getDirectory).toHaveBeenCalledWith(channelId, 'owner', {
      page: 2,
      search: 'member',
    });
  });

  it('rejects invalid requests before loading members', async () => {
    await request(app.getHttpServer() as App)
      .get(`/api/channels/${channelId}/member-directory`)
      .set('x-user-id', 'owner')
      .query({ page: 0 })
      .expect(400);
    await request(app.getHttpServer() as App)
      .get(`/api/channels/${channelId}/member-directory`)
      .expect(400);
    expect(directory.getDirectory).not.toHaveBeenCalled();
  });
});
