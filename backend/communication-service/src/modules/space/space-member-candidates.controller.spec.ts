import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SpaceRole } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { RuntimeConfigService } from '../../common/config/runtime-config.service';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { SpaceController } from './space.controller';
import { SpaceService } from './space.service';
import { SpaceMemberCandidatesService } from './space-member-candidates.service';
import { SpaceMemberCandidatesResponse } from './types/space-member-candidates.types';

describe('Space member candidate HTTP response', () => {
  let app: INestApplication;
  const candidates = { getCandidates: jest.fn() };
  const spaceId = '11111111-1111-4111-8111-111111111111';
  const ownerId = '22222222-2222-4222-8222-222222222222';
  const channelId = '33333333-3333-4333-8333-333333333333';

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SpaceController],
      providers: [
        { provide: SpaceService, useValue: {} },
        { provide: RuntimeConfigService, useValue: {} },
        { provide: SpaceMemberCandidatesService, useValue: candidates },
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
    candidates.getCandidates.mockReset();
  });

  it.each([
    { mode: 'channel creation', channelId: undefined },
    { mode: 'existing private channel', channelId },
  ])(
    'exposes members and pagination directly in data for $mode',
    async (query) => {
      const page: SpaceMemberCandidatesResponse = {
        members: [
          {
            id: 'membership',
            userId: 'member',
            spaceId,
            role: SpaceRole.MEMBER,
            joinedAt: new Date(0),
            profile: null,
          },
        ],
        pagination: { page: 2, pageSize: 10, total: 11, totalPages: 2 },
      };
      candidates.getCandidates.mockResolvedValue(page);

      const response = await request(app.getHttpServer() as App)
        .get(`/api/spaces/${spaceId}/member-candidates`)
        .query({ page: 2, channelId: query.channelId })
        .set('x-user-id', ownerId)
        .expect(200);

      const body: unknown = response.body;
      expect(body).toMatchObject({
        success: true,
        data: {
          members: [{ userId: 'member' }],
          pagination: page.pagination,
        },
      });
      expect(body).not.toHaveProperty('data.data');
      expect(candidates.getCandidates).toHaveBeenCalledWith(ownerId, spaceId, {
        page: 2,
        ...(query.channelId ? { channelId: query.channelId } : {}),
      });
    },
  );
});
