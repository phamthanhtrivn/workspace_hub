import { Test, TestingModule } from '@nestjs/testing';
import { UserProfileSnapshotService } from './user-profile-snapshot.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserProfileSnapshotEventType } from './types/user-profile-snapshot.enums';

describe('UserProfileSnapshotService', () => {
  let service: UserProfileSnapshotService;
  let prisma: {
    userProfileSnapshot: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      userProfileSnapshot: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileSnapshotService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UserProfileSnapshotService>(UserProfileSnapshotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsertFromEvent', () => {
    it('should upsert snapshot on UPSERTED event', async () => {
      const payload = {
        eventType: UserProfileSnapshotEventType.UPSERTED,
        userId: '11111111-1111-1111-1111-111111111111',
        email: 'test@example.com',
        fullName: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
        occurredAt: new Date().toISOString(),
      };

      prisma.userProfileSnapshot.findUnique.mockResolvedValue(null);
      prisma.userProfileSnapshot.upsert.mockResolvedValue({
        userId: payload.userId,
        email: payload.email,
        fullName: payload.fullName,
        avatarUrl: payload.avatarUrl,
        syncedAt: new Date(),
      });

      const result = await service.upsertFromEvent(payload);

      expect(prisma.userProfileSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: payload.userId },
          create: expect.objectContaining({
            userId: payload.userId,
            email: payload.email,
            fullName: payload.fullName,
          }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('should delete snapshot on REMOVED event', async () => {
      const payload = {
        eventType: UserProfileSnapshotEventType.REMOVED,
        userId: '11111111-1111-1111-1111-111111111111',
      };

      prisma.userProfileSnapshot.findUnique.mockResolvedValue(null);
      prisma.userProfileSnapshot.deleteMany.mockResolvedValue({ count: 1 });

      await service.upsertFromEvent(payload);

      expect(prisma.userProfileSnapshot.deleteMany).toHaveBeenCalledWith({
        where: { userId: payload.userId },
      });
    });
  });

  describe('getProfilesByUserIds', () => {
    it('should return a map of profiles by user id', async () => {
      const userId = '11111111-1111-1111-1111-111111111111';
      prisma.userProfileSnapshot.findMany.mockResolvedValue([
        {
          userId,
          email: 'test@example.com',
          fullName: 'Test User',
          avatarUrl: 'https://example.com/avatar.png',
        },
      ]);

      const map = await service.getProfilesByUserIds([userId]);

      expect(map.has(userId)).toBe(true);
      expect(map.get(userId)?.fullName).toBe('Test User');
    });
  });
});
