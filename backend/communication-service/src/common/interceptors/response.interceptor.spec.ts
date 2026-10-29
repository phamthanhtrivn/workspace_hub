import type { ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

const respond = (value: unknown) =>
  firstValueFrom(
    new ResponseInterceptor().intercept({} as ExecutionContext, {
      handle: () => of(value),
    }),
  );

describe('ResponseInterceptor', () => {
  it.each([null, undefined, false, 0, '', 'hello', [1, 2], { id: 'one' }])(
    'wraps raw controller data without changing it: %p',
    async (value) => {
      const response = await respond(value);
      expect(response).toMatchObject({
        success: true,
        message: 'Success',
        data: value,
        errors: null,
      });
      expect(response).toHaveProperty('timestamp', expect.any(String));
    },
  );

  it('keeps an existing API envelope unchanged', async () => {
    const value = {
      success: false,
      timestamp: '2026-10-28T01:00:00.000Z',
      message: 'Forbidden',
      data: null,
      errors: [{ code: 'FORBIDDEN' }],
    };
    expect(await respond(value)).toBe(value);
  });

  it('unwraps message/data and preserves pagination metadata', async () => {
    const value = {
      message: 'Loaded',
      data: [{ id: 'one' }],
      pagination: { nextCursor: 'two', total: 8 },
    };
    const response = await respond(value);
    expect(response).toMatchObject({
      success: true,
      ...value,
      errors: null,
    });
    expect(response).toHaveProperty('timestamp', expect.any(String));
  });

  it('preserves legacy non-string messages at the controller boundary', async () => {
    const message = { code: 'DONE' };
    expect(await respond({ message, data: null })).toMatchObject({
      message,
      data: null,
    });
  });

  it('treats an object with only message as raw data', async () => {
    const value = { message: 'A domain field' };
    expect(await respond(value)).toMatchObject({
      message: 'Success',
      data: value,
    });
  });

  it.each([null, undefined, false, 0, ''])(
    'keeps falsy pagination omitted: %p',
    async (pagination) => {
      expect(
        await respond({ message: 'Loaded', data: [], pagination }),
      ).not.toHaveProperty('pagination');
    },
  );
});
