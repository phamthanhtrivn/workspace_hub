import { UserProfileSnapshotService } from './user-profile-snapshot.service';

describe('UserProfileSnapshotService', () => {
  const environment = { ...process.env };
  afterEach(() => {
    process.env = { ...environment };
    jest.restoreAllMocks();
  });

  it.each([undefined, 'http://user-service:8081'])(
    'hydrates a missing profile through the configured endpoint (%s)',
    async (endpoint) => {
      if (endpoint) process.env.USER_SERVICE_URL = endpoint;
      else delete process.env.USER_SERVICE_URL;
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

      expect(String(jest.mocked(global.fetch).mock.calls[0][0])).toBe(
        `${endpoint ?? 'http://localhost:8081'}/api/users/profiles/bulk?ids=${userId}`,
      );

      expect(prisma.userProfileSnapshot.upsert).toHaveBeenCalledTimes(1);
      expect(profiles.get(userId)?.fullName).toBe('Việt Nhân Trần');
    },
  );

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
