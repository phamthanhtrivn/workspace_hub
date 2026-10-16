import { ResourceAccessService } from './resource-access.service';

describe('ResourceAccessService endpoints', () => {
  const environment = { ...process.env };
  afterEach(() => {
    process.env = { ...environment };
    jest.restoreAllMocks();
  });

  it.each([undefined, 'http://document-service:8085'])(
    'checks access through the configured endpoint (%s)',
    async (endpoint) => {
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
        `${endpoint ?? 'http://localhost:8085'}/api/documents/document/access`,
        expect.objectContaining({
          headers: {
            'x-user-id': 'user',
            'x-user-email': 'user@example.com',
          },
        }),
      );
    },
  );
});
