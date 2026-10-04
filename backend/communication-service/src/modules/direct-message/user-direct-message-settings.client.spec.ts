import { ServiceUnavailableException } from '@nestjs/common';
import { UserDirectMessageSettingsClient } from './user-direct-message-settings.client';
import { ServiceHttpError } from '../../common/adapters/http-json.client';

describe('UserDirectMessageSettingsClient', () => {
  const recipientId = 'recipient-id';
  const config = {
    userServiceUrl: 'http://user-service:8081',
    internalServiceKey: 'shared-key',
  };

  it('reads the recipient setting using the configured service URL and key', async () => {
    const http = {
      request: jest
        .fn()
        .mockResolvedValue({ data: { allowNewDirectMessages: true } }),
    };
    const client = new UserDirectMessageSettingsClient(
      http as any,
      config as any,
    );

    await expect(client.allowsNewDirectMessages(recipientId)).resolves.toBe(
      true,
    );
    expect(http.request).toHaveBeenCalledWith({
      service: 'user-service',
      url: 'http://user-service:8081/api/users/internal/recipient-id/direct-message-settings',
      headers: { 'x-internal-service-key': 'shared-key' },
    });
  });

  it('distinguishes an unavailable or malformed response from a recipient opt-out', async () => {
    const http = { request: jest.fn().mockResolvedValue({ data: {} }) };
    const client = new UserDirectMessageSettingsClient(
      http as any,
      config as any,
    );
    await expect(
      client.allowsNewDirectMessages(recipientId),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('treats an internal service key rejection as unavailable, not a recipient opt-out', async () => {
    const http = {
      request: jest
        .fn()
        .mockRejectedValue(
          new ServiceHttpError('user-service', 'HTTP 403', 403),
        ),
    };
    const client = new UserDirectMessageSettingsClient(
      http as any,
      config as any,
    );
    await expect(
      client.allowsNewDirectMessages(recipientId),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
