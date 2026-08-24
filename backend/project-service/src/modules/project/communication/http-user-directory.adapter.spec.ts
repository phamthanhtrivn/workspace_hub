import { HttpJsonClient } from '../../../common/communication/http-json.client';
import { RuntimeConfigService } from '../../../common/config/runtime-config.service';
import { HttpUserDirectoryAdapter } from './http-user-directory.adapter';

describe('HttpUserDirectoryAdapter', () => {
  const request = jest.fn();
  const adapter = new HttpUserDirectoryAdapter(
    { request } as unknown as HttpJsonClient,
    { userServiceUrl: 'http://users' } as RuntimeConfigService,
  );

  beforeEach(() => request.mockReset());

  it('maps a valid user contact', async () => {
    request.mockResolvedValue({ data: { email: 'member@example.com', fullName: 'Member' } });

    await expect(adapter.getContact('user-1')).resolves.toEqual({
      email: 'member@example.com',
      fullName: 'Member',
    });
    expect(request).toHaveBeenCalledWith({
      service: 'User service',
      url: 'http://users/api/users/user-1/profile',
    });
  });

  it('rejects an invalid profile response instead of trusting a cast', async () => {
    request.mockResolvedValue({ data: { email: null } });

    await expect(adapter.getContact('user-1')).rejects.toThrow('User user-1 has no email address');
  });
});
