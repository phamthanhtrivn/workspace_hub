import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { DirectMessagePermissionService } from '../direct-message/direct-message-permission.service';
import { DirectConversationController } from './direct-conversation.controller';
import { DirectConversationService } from './direct-conversation.service';

jest.mock('src/infrastructure/s3/s3.service', () => ({ S3Service: class {} }));

describe('DirectConversationController send permission response', () => {
  let app: INestApplication;
  const permissionService = { getSendPermission: jest.fn() };
  const conversationId = '11111111-1111-4111-8111-111111111111';
  const senderId = '22222222-2222-4222-8222-222222222222';

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [DirectConversationController],
      providers: [
        { provide: DirectConversationService, useValue: {} },
        {
          provide: DirectMessagePermissionService,
          useValue: permissionService,
        },
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
    permissionService.getSendPermission.mockReset();
  });

  it.each([
    { canSend: true, reason: null },
    { canSend: false, reason: 'RECIPIENT_BLOCKS_NEW_DM' },
  ])(
    'returns a single data envelope for canSend=$canSend',
    async (permission) => {
      permissionService.getSendPermission.mockResolvedValue(permission);

      const response = await request(app.getHttpServer() as App)
        .get(`/api/direct-conversations/${conversationId}/send-permission`)
        .set('x-user-id', senderId)
        .expect(200);

      const body: unknown = response.body;
      expect(body).toMatchObject({ data: permission });
      expect(body).not.toHaveProperty('data.data');
      expect(permissionService.getSendPermission).toHaveBeenCalledWith(
        conversationId,
        senderId,
      );
    },
  );
});
