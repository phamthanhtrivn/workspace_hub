import { ResourceAccessService } from './resource-access.service';
const key = 'fixture-calendar-document-not-production-000';

describe('ResourceAccessService endpoints', () => {
  const environment = { ...process.env };
  afterEach(() => {
    process.env = { ...environment };
    jest.restoreAllMocks();
  });

  it.each([undefined, 'http://document-service:8085'])(
    'checks access through the configured endpoint (%s)',
    async (endpoint) => {
      process.env.CALENDAR_DOCUMENT_SERVICE_KEY = key;
      if (endpoint) process.env.DOCUMENT_SERVICE_URL = endpoint;
      else delete process.env.DOCUMENT_SERVICE_URL;
      const request = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      await new ResourceAccessService().assertDocumentAccess(
        'user',
        'user@example.com',
        ['document'],
      );
      expect(request).toHaveBeenCalledWith(
        `${endpoint ?? 'http://localhost:8085'}/internal/document-access/resolve`,
        expect.objectContaining({
          headers: {
            'content-type': 'application/json',
            'x-internal-service-key': key,
          },
          method: 'POST',
          body: JSON.stringify({
            userId: 'user',
            userEmail: 'user@example.com',
            documentIds: ['document'],
          }),
        }),
      );
    },
  );

  it('batches distinct document IDs without caching permission results', async () => {
    process.env.CALENDAR_DOCUMENT_SERVICE_KEY = key;
    const request = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 } as Response);
    const access = new ResourceAccessService();
    const ids = Array.from({ length: 51 }, (_, i) => String(i));
    await access.assertDocumentAccess('user', 'user@example.com', [
      ...ids,
      ids[0],
    ]);
    expect(request).toHaveBeenCalledTimes(2);
    await access.assertDocumentAccess('user', 'user@example.com', ['0']);
    expect(request).toHaveBeenCalledTimes(3);
  });
  it('fails closed before making a request if service credentials are missing', async () => {
    delete process.env.CALENDAR_DOCUMENT_SERVICE_KEY;
    const request = jest.spyOn(global, 'fetch');
    await expect(
      new ResourceAccessService().assertDocumentAccess(
        'user',
        'user@example.com',
        ['doc'],
      ),
    ).rejects.toMatchObject({ status: 503 });
    expect(request).not.toHaveBeenCalled();
  });
  it.each([403, 404])('denies access for HTTP %s', async (status) => {
    process.env.CALENDAR_DOCUMENT_SERVICE_KEY = key;
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status } as Response);
    await expect(
      new ResourceAccessService().assertDocumentAccess(
        'user',
        'user@example.com',
        ['doc'],
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it.each([401, 500])(
    'reports a dependency/configuration failure for HTTP %s',
    async (status) => {
      process.env.CALENDAR_DOCUMENT_SERVICE_KEY = key;
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: false, status } as Response);
      await expect(
        new ResourceAccessService().assertDocumentAccess(
          'user',
          'user@example.com',
          ['doc'],
        ),
      ).rejects.toMatchObject({ status: 503 });
    },
  );
  it('does not retry a network failure or fall back to untrusted user headers', async () => {
    process.env.CALENDAR_DOCUMENT_SERVICE_KEY = key;
    const request = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('network failure'));
    await expect(
      new ResourceAccessService().assertDocumentAccess(
        'user',
        'user@example.com',
        ['doc'],
      ),
    ).rejects.toMatchObject({ status: 503 });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
