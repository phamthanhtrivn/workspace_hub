import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { DurableKafkaProducer } from '../../infrastructure/kafka/durable-kafka-producer';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, SpaceRole } from '@prisma/client';
import { DefaultSpaceChannelNames } from './types/space.types';
import {
  reconcilePrivateMemberships,
  publishPrivateMembershipChanges,
} from '../channel/private-channel.service';
import { EnsureProjectSpaceDto } from './dto/ensure-project-space.dto';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import { SPACE_ERROR_MESSAGES } from './types/space.enums';
import { SpaceSettingsService } from './space-settings.service';
import { SpaceEventPublisher } from './space-event-publisher.service';

@Injectable()
export class ProjectSpaceProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatSocketPublisher: ChatSocketPublisher,
    @Inject('KAFKA_PRODUCER')
    private readonly kafkaClient: DurableKafkaProducer,
    private readonly settings: SpaceSettingsService,
    private readonly events: SpaceEventPublisher,
  ) {}
  normalizeProjectSpaceMembers(dto: EnsureProjectSpaceDto) {
    const roleByUserId = new Map<string, SpaceRole>();
    for (const member of dto.members ?? []) {
      if (!member.userId) continue;
      const existingRole = roleByUserId.get(member.userId);
      if (existingRole === SpaceRole.ADMIN) continue;
      roleByUserId.set(
        member.userId,
        member.role === SpaceRole.ADMIN ? SpaceRole.ADMIN : SpaceRole.MEMBER,
      );
    }
    roleByUserId.set(dto.ownerId, SpaceRole.ADMIN);
    return Array.from(roleByUserId.entries()).map(([userId, role]) => ({
      userId,
      role,
    }));
  }

  async ensureDefaultProjectChannel(
    tx: Prisma.TransactionClient,
    spaceId: string,
    createdBy: string,
  ) {
    const existingDefaultChannel = await tx.channel.findFirst({
      where: { spaceId, isDefault: true },
      orderBy: { createdAt: 'asc' },
    });
    if (existingDefaultChannel) {
      return existingDefaultChannel;
    }

    const channel = await tx.channel.create({
      data: {
        spaceId,
        name: DefaultSpaceChannelNames[0],
        createdBy,
        isDefault: true,
      },
    });

    await tx.channelSetting.create({
      data: {
        channelId: channel.id,
        allowSendMessage: true,
        allowCreateNote: true,
        allowCreateTask: true,
        allowCreatePoll: true,
        allowPinMessage: true,
      },
    });

    return channel;
  }

  isProjectSpaceUniqueConstraint(error: unknown) {
    if (typeof error !== 'object' || error === null) return false;
    const prismaError = error as { code?: string; meta?: { target?: unknown } };
    const target = prismaError.meta?.target;
    const fields = Array.isArray(target)
      ? target.filter((field): field is string => typeof field === 'string')
      : typeof target === 'string'
        ? [target]
        : [];
    return (
      prismaError.code === 'P2002' &&
      fields.some((field) => field.includes('project_id'))
    );
  }

  async syncProjectSpace(
    tx: Prisma.TransactionClient,
    existingSpace: { id: string; name: string; createdBy: string },
    dto: EnsureProjectSpaceDto,
    trimmedName: string,
    members: { userId: string; role: SpaceRole }[],
  ) {
    await tx.$queryRaw`SELECT id FROM spaces WHERE id = ${existingSpace.id}::uuid FOR UPDATE`;
    const current = await tx.space.findUnique({
      where: { id: existingSpace.id },
    });
    const currentRevision = current?.accessSyncRevision ?? 0n;
    const requestedRevision = dto.syncRevision ? BigInt(dto.syncRevision) : 0n;
    if (currentRevision > requestedRevision) {
      const channel = await this.ensureDefaultProjectChannel(
        tx,
        existingSpace.id,
        existingSpace.createdBy,
      );
      return {
        projectId: dto.projectId,
        spaceId: existingSpace.id,
        channelId: channel.id,
        channelIds: [],
        joinedMembers: [],
        removedMembers: [],
        privateMembershipChanges: [],
      };
    }
    if (dto.syncRevision)
      await tx.space.update({
        where: { id: existingSpace.id },
        data: { accessSyncRevision: requestedRevision },
      });
    const space =
      existingSpace.name === trimmedName
        ? existingSpace
        : await tx.space.update({
            where: { id: existingSpace.id },
            data: { name: trimmedName },
          });
    const defaultChannel = await this.ensureDefaultProjectChannel(
      tx,
      space.id,
      space.createdBy,
    );
    const memberUserIds = members.map((member) => member.userId);
    const [channels, existingSpaceMembers, existingChannelMembers] =
      await Promise.all([
        tx.channel.findMany({
          where: { spaceId: space.id },
          select: { id: true },
        }),
        tx.spaceMember.findMany({
          where: { spaceId: space.id },
          select: { userId: true },
        }),
        tx.channelMember.findMany({
          where: {
            channelId: defaultChannel.id,
            userId: { in: memberUserIds },
          },
          select: { userId: true },
        }),
      ]);
    const existingSpaceMemberIds = new Set(
      existingSpaceMembers.map((member) => member.userId),
    );
    const existingChannelMemberIds = new Set(
      existingChannelMembers.map((member) => member.userId),
    );
    const activeMemberIds = new Set(memberUserIds);
    const joinedMembers = members.filter(
      (member) =>
        !existingSpaceMemberIds.has(member.userId) ||
        !existingChannelMemberIds.has(member.userId),
    );
    const removedMembers = existingSpaceMembers.filter(
      (member) => !activeMemberIds.has(member.userId),
    );
    const removedMemberIds = removedMembers.map((member) => member.userId);
    const channelIds = channels.map((channel) => channel.id);

    for (const member of members) {
      await tx.spaceMember.upsert({
        where: {
          spaceId_userId: {
            spaceId: space.id,
            userId: member.userId,
          },
        },
        create: {
          spaceId: space.id,
          userId: member.userId,
          role: member.role,
        },
        update: member.userId === dto.ownerId ? { role: SpaceRole.ADMIN } : {},
      });

      await tx.channelMember.upsert({
        where: {
          channelId_userId: {
            channelId: defaultChannel.id,
            userId: member.userId,
          },
        },
        create: {
          channelId: defaultChannel.id,
          userId: member.userId,
        },
        update: {},
      });
    }

    const privateMembershipChanges = await reconcilePrivateMemberships(
      tx,
      space.id,
      removedMemberIds,
    );
    if (removedMemberIds.length > 0) {
      await tx.channelMember.deleteMany({
        where: {
          userId: { in: removedMemberIds },
          channelId: { in: channelIds },
        },
      });
      await tx.spaceMember.deleteMany({
        where: {
          spaceId: space.id,
          userId: { in: removedMemberIds },
        },
      });
    }

    return {
      projectId: dto.projectId,
      spaceId: space.id,
      channelId: defaultChannel.id,
      channelIds,
      joinedMembers,
      removedMembers,
      privateMembershipChanges,
    };
  }

  async getProjectSpaceStatus(projectId: string) {
    const space = await this.prisma.space.findFirst({
      where: { projectId },
      select: { id: true },
    });
    if (!space) {
      return {
        projectId,
        exists: false,
        spaceId: null,
        channelId: null,
      };
    }

    const defaultChannel = await this.prisma.channel.findFirst({
      where: { spaceId: space.id, isDefault: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      projectId,
      exists: true,
      spaceId: space.id,
      channelId: defaultChannel?.id ?? null,
    };
  }

  async ensureProjectSpace(dto: EnsureProjectSpaceDto) {
    const trimmedName = dto.name?.trim();
    if (!trimmedName) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NAME_EMPTY);
    }

    const members = this.normalizeProjectSpaceMembers(dto);
    if (members.length === 0) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const existingSpace = await tx.space.findFirst({
            where: { projectId: dto.projectId },
          });

          if (existingSpace) {
            return this.syncProjectSpace(
              tx,
              existingSpace,
              dto,
              trimmedName,
              members,
            );
          }

          const space = await tx.space.create({
            data: {
              name: trimmedName,
              createdBy: dto.ownerId,
              projectId: dto.projectId,
              accessSyncRevision: dto.syncRevision
                ? BigInt(dto.syncRevision)
                : 0n,
            },
          });

          await tx.spaceMember.createMany({
            data: members.map((member) => ({
              spaceId: space.id,
              userId: member.userId,
              role: member.role,
            })),
            skipDuplicates: true,
          });

          await this.settings.createSpaceSettingIfAvailable(tx, space.id);

          const defaultChannel = await this.ensureDefaultProjectChannel(
            tx,
            space.id,
            dto.ownerId,
          );

          await tx.channelMember.createMany({
            data: members.map((member) => ({
              channelId: defaultChannel.id,
              userId: member.userId,
            })),
            skipDuplicates: true,
          });

          return {
            projectId: dto.projectId,
            spaceId: space.id,
            channelId: defaultChannel.id,
            channelIds: [defaultChannel.id],
            joinedMembers: members,
            removedMembers: [],
            privateMembershipChanges: [],
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      await this.events.publishProjectSpaceMembersJoined(result);
      await this.events.publishProjectSpaceMembersRemoved(result);
      publishPrivateMembershipChanges(
        this.chatSocketPublisher,
        result.privateMembershipChanges,
        this.kafkaClient,
      );
      return {
        projectId: result.projectId,
        spaceId: result.spaceId,
        channelId: result.channelId,
      };
    } catch (error) {
      if (!this.isProjectSpaceUniqueConstraint(error)) {
        throw error;
      }

      const result = await this.prisma.$transaction(
        async (tx) => {
          const existingSpace = await tx.space.findFirst({
            where: { projectId: dto.projectId },
          });
          if (!existingSpace) throw error;
          return this.syncProjectSpace(
            tx,
            existingSpace,
            dto,
            trimmedName,
            members,
          );
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      await this.events.publishProjectSpaceMembersJoined(result);
      await this.events.publishProjectSpaceMembersRemoved(result);
      publishPrivateMembershipChanges(
        this.chatSocketPublisher,
        result.privateMembershipChanges,
        this.kafkaClient,
      );
      return {
        projectId: result.projectId,
        spaceId: result.spaceId,
        channelId: result.channelId,
      };
    }
  }
}
