import { firstValueFrom, of } from 'rxjs';
import type { ExecutionContext } from '@nestjs/common';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { MeetingCaptionsController } from './meeting-captions.controller';
import type { MeetingCaptionsService } from './services/meeting-captions.service';

describe('Caption API response envelope', () => {
  const service = {
    status: jest.fn().mockResolvedValue({ available: true, language: 'vi' }),
    start: jest.fn().mockResolvedValue({
      workerIdentity: 'captions:meeting',
      language: 'vi',
    }),
    release: jest.fn().mockResolvedValue({ released: true }),
  };
  const controller = new MeetingCaptionsController(
    service as unknown as MeetingCaptionsService,
  );
  const interceptor = new ResponseInterceptor();

  it.each([
    ['status', { available: true, language: 'vi' }],
    ['start', { workerIdentity: 'captions:meeting', language: 'vi' }],
    ['release', { released: true }],
  ] as const)(
    'returns a flat data envelope for %s after the global interceptor',
    async (method, data) => {
      const result = await controller[method]('join', 'user');
      const response = await firstValueFrom(
        interceptor.intercept({} as ExecutionContext, {
          handle: () => of(result),
        }),
      );
      expect(response).toMatchObject({ success: true, data });
      expect(response.data).not.toHaveProperty('data');
    },
  );
});
