import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UserProfileSnapshotPayload,
  UserProfileSnapshotResponse,
} from './types/user-profile-snapshot.types';
import {
  UserProfileSnapshotErrorMessage,
  UserProfileSnapshotEventType,
} from './types/user-profile-snapshot.enums';

@Injectable()
export class UserProfileSnapshotService {
  private readonly logger = new Logger(UserProfileSnapshotService.name);
  private readonly userServiceUrl =
    process.env.USER_SERVICE_URL ?? 'http://user-service:8081';

  constructor(private readonly prisma: PrismaService) {}

  async upsertFromEvent(payload: UserProfileSnapshotPayload) {
    this.assertValidPayload(payload);

    const occurredAt = payload.occurredAt
      ? new Date(payload.occurredAt)
      : new Date();

    const existingSnapshot = await this.prisma.userProfileSnapshot.findUnique({
      where: { userId: payload.userId },
      select: { syncedAt: true },
    });

    if (existingSnapshot && occurredAt < existingSnapshot.syncedAt) {
      this.logger.debug(
        `Ignored stale user profile snapshot event for ${payload.userId}`,
      );
      return existingSnapshot;
    }

    if (
      payload.eventType === UserProfileSnapshotEventType.REMOVED ||
      payload.eventType === UserProfileSnapshotEventType.DISABLED
    ) {
      return this.prisma.userProfileSnapshot.deleteMany({
        where: { userId: payload.userId },
      });
    }

    return this.prisma.userProfileSnapshot.upsert({
      where: { userId: payload.userId },
      create: {
        userId: payload.userId,
        email: payload.email ?? null,
        fullName: payload.fullName ?? null,
        avatarUrl: payload.avatarUrl ?? null,
        syncedAt: occurredAt,
      },
      update: {
        email: payload.email ?? null,
        fullName: payload.fullName ?? null,
        avatarUrl: payload.avatarUrl ?? null,
        syncedAt: occurredAt,
      },
    });
  }

  async getProfilesByUserIds(
    userIds: string[],
  ): Promise<Map<string, UserProfileSnapshotResponse>> {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return new Map();
    }

    let snapshots = await this.prisma.userProfileSnapshot.findMany({
      where: { userId: { in: uniqueUserIds } },
      select: {
        userId: true,
        email: true,
        fullName: true,
        avatarUrl: true,
      },
    });

    const foundUserIds = new Set(snapshots.map((snapshot) => snapshot.userId));
    const missingUserIds = uniqueUserIds.filter(
      (userId) => !foundUserIds.has(userId),
    );
    if (missingUserIds.length > 0) {
      await this.hydrateMissingProfiles(missingUserIds);
      snapshots = await this.prisma.userProfileSnapshot.findMany({
        where: { userId: { in: uniqueUserIds } },
        select: {
          userId: true,
          email: true,
          fullName: true,
          avatarUrl: true,
        },
      });
    }

    return new Map(
      snapshots.map((snapshot) => [
        snapshot.userId,
        {
          id: snapshot.userId,
          userId: snapshot.userId,
          email: snapshot.email,
          fullName: snapshot.fullName,
          avatarUrl: snapshot.avatarUrl,
        },
      ]),
    );
  }

  private async hydrateMissingProfiles(userIds: string[]): Promise<void> {
    const batchSize = 100;
    for (let offset = 0; offset < userIds.length; offset += batchSize) {
      const batch = userIds.slice(offset, offset + batchSize);
      const url = new URL('/api/users/profiles/bulk', this.userServiceUrl);
      batch.forEach((userId) => url.searchParams.append('ids', userId));

      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) {
          this.logger.warn(
            `User profile backfill returned HTTP ${response.status}`,
          );
          continue;
        }

        const body = (await response.json()) as {
          data?: Array<{
            id: string;
            email?: string | null;
            fullName?: string | null;
            avatarUrl?: string | null;
          }>;
        };
        const occurredAt = new Date();
        await Promise.all(
          (body.data ?? []).map((profile) =>
            this.prisma.userProfileSnapshot.upsert({
              where: { userId: profile.id },
              create: {
                userId: profile.id,
                email: profile.email ?? null,
                fullName: profile.fullName ?? null,
                avatarUrl: profile.avatarUrl ?? null,
                syncedAt: occurredAt,
              },
              update: {
                email: profile.email ?? null,
                fullName: profile.fullName ?? null,
                avatarUrl: profile.avatarUrl ?? null,
                syncedAt: occurredAt,
              },
            }),
          ),
        );
      } catch (error) {
        this.logger.warn(
          `User profile backfill unavailable: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }
  }

  async attachProfilesToEvents<
    T extends {
      createdBy: string;
      updatedBy?: string | null;
      attendees?: Array<{ userId: string } & Record<string, unknown>>;
    },
  >(
    events: T[],
  ): Promise<
    Array<T & { creatorProfile: UserProfileSnapshotResponse | null }>
  > {
    const userIds = events.flatMap((event) => [
      event.createdBy,
      event.updatedBy,
      ...(event.attendees ?? []).map((attendee) => attendee.userId),
    ]);
    const profileByUserId = await this.getProfilesByUserIds(
      userIds.filter((userId): userId is string => Boolean(userId)),
    );

    return events.map((event) => ({
      ...event,
      creatorProfile: profileByUserId.get(event.createdBy) ?? null,
      updaterProfile: event.updatedBy
        ? (profileByUserId.get(event.updatedBy) ?? null)
        : null,
      attendees: event.attendees?.map((attendee) => ({
        ...attendee,
        profile: profileByUserId.get(attendee.userId) ?? null,
      })),
    }));
  }

  private assertValidPayload(payload: UserProfileSnapshotPayload) {
    if (
      !payload ||
      !Object.values(UserProfileSnapshotEventType).includes(payload.eventType)
    ) {
      throw new Error(UserProfileSnapshotErrorMessage.INVALID_EVENT);
    }

    if (!payload.userId) {
      throw new Error(UserProfileSnapshotErrorMessage.MISSING_USER_ID);
    }
  }
}
