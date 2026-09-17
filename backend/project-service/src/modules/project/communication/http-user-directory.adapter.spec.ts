import { HttpJsonClient } from '../../../common/communication/http-json.client';
import { RuntimeConfigService } from '../../../common/config/runtime-config.service';
import { HttpUserDirectoryAdapter } from './http-user-directory.adapter';
import { UserProfileSnapshotService } from '../../user-profile-snapshot/user-profile-snapshot.service';

describe('HttpUserDirectoryAdapter', () => {
  const request = jest.fn();
  const userProfiles = {
    getProfileByUserId: jest.fn(),
    upsertFromEvent: jest.fn().mockResolvedValue(undefined),
  } as unknown as UserProfileSnapshotService;

  const adapter = new HttpUserDirectoryAdapter(
    { request } as unknown as HttpJsonClient,
    { userServiceUrl: 'http://users' } as RuntimeConfigService,
    userProfiles,
  );

  beforeEach(() => {
    request.mockReset();
    (userProfiles.getProfileByUserId as jest.Mock).mockReset();
  });

  it('maps a valid user contact from http when no snapshot', async () => {
    (userProfiles.getProfileByUserId as jest.Mock).mockResolvedValue(null);
    request.mockResolvedValue({
      data: {
        email: 'member@example.com',
        fullName: 'Member',
        avatarUrl: 'https://cdn.example.com/member.png',
      },
    });

    await expect(adapter.getContact('user-1')).resolves.toEqual({
      email: 'member@example.com',
      fullName: 'Member',
      avatarUrl: 'https://cdn.example.com/member.png',
    });
    expect(request).toHaveBeenCalledWith({
      service: 'User service',
      url: 'http://users/api/users/user-1/profile',
    });
  });

  it('returns contact directly from local snapshot if available', async () => {
    (userProfiles.getProfileByUserId as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      email: 'member@example.com',
      fullName: 'Member',
      avatarUrl: 'https://cdn.example.com/member.png',
    });

    await expect(adapter.getContact('user-1')).resolves.toEqual({
      email: 'member@example.com',
      fullName: 'Member',
      avatarUrl: 'https://cdn.example.com/member.png',
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects an invalid profile response instead of trusting a cast', async () => {
    (userProfiles.getProfileByUserId as jest.Mock).mockResolvedValue(null);
    request.mockResolvedValue({ data: { email: null } });

    await expect(adapter.getContact('user-1')).rejects.toThrow('User user-1 has no email address');
  });
});
