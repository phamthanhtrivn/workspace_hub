import { HttpJsonClient, ServiceHttpError } from './http-json.client';
import { RuntimeConfigService } from '../config/runtime-config.service';

describe('HttpJsonClient', () => {
  const config = { httpTimeoutMs: 100 } as RuntimeConfigService;
  const client = new HttpJsonClient(config);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a JSON response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'user-1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(client.request({ service: 'Users', url: 'http://users/profile' })).resolves.toEqual({
      data: { id: 'user-1' },
    });
  });

  it('wraps non-success responses with service context', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 503 }));

    await expect(client.request({ service: 'Users', url: 'http://users/profile' })).rejects.toMatchObject({
      name: ServiceHttpError.name,
      service: 'Users',
      status: 503,
    });
  });

  it('wraps network failures', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('name resolution failed'));

    await expect(client.request({ service: 'Users', url: 'http://users/profile' })).rejects.toThrow(
      'Users request failed: name resolution failed',
    );
  });
});
