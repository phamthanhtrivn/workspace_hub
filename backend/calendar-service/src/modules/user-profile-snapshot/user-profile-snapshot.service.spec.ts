import { UserProfileSnapshotService } from './user-profile-snapshot.service';

describe('UserProfileSnapshotService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('hydrates a missing profile from User Service and returns its display name', async () => {
    const userId = '11111111-1111-1111-1111-111111111111';
    const hydrated = {
      userId,
      email: 'nhan@example.com',
      fullName: 'Việt Nhân Trần',
      avatarUrl: null,
    };
    const prisma = {
      userProfileSnapshot: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([hydrated]),
        upsert: jest.fn(),
      },
    };
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: userId,
              email: hydrated.email,
              fullName: hydrated.fullName,
              avatarUrl: null,
            },
          ],
        }),
    } as Response);
    const service = new UserProfileSnapshotService(prisma as never);

    const profiles = await service.getProfilesByUserIds([userId]);

    expect(prisma.userProfileSnapshot.upsert).toHaveBeenCalledTimes(1);
    expect(profiles.get(userId)?.fullName).toBe('Việt Nhân Trần');
  });

  it('fails softly when User Service is unavailable', async () => {
    const userId = '11111111-1111-1111-1111-111111111111';
    const prisma = {
      userProfileSnapshot: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
      },
    };
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('unavailable'));
    const service = new UserProfileSnapshotService(prisma as never);

    await expect(service.getProfilesByUserIds([userId])).resolves.toEqual(
      new Map(),
    );
  });
});
