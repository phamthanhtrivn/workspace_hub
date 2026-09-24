import { BadRequestException } from '@nestjs/common';
import { SpaceRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SPACE_ERROR_MESSAGES } from './types/space.enums';
import { SpaceService } from './space.service';

jest.mock('../socket/chat/chat-socket.publisher', () => ({
  ChatSocketPublisher: jest.fn(),
}));

describe('SpaceService project-linked spaces', () => {
  const projectSpaceId = '11111111-1111-4111-8111-111111111111';
  const projectId = '22222222-2222-4222-8222-222222222222';
  const ownerId = '33333333-3333-4333-8333-333333333333';
  const adminId = '44444444-4444-4444-8444-444444444444';
  const memberId = '55555555-5555-4555-8555-555555555555';

  let prisma: any;
  let service: SpaceService;
  let chatSocketPublisher: any;
  let projectNames: any;

  beforeEach(() => {
    prisma = {
      space: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      spaceMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      spaceSetting: {
        upsert: jest.fn(),
      },
      channel: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    chatSocketPublisher = {
      publishToRooms: jest.fn(),
      publishMemberRoleUpdated: jest.fn(),
      publishConversationDisbanded: jest.fn(),
      sendSystemMessage: jest.fn(),
    };
    projectNames = {
      renameProject: jest.fn(),
      publishProjectSpaceEvent: jest.fn().mockResolvedValue({}),
    };

    service = new SpaceService(
      prisma as PrismaService,
      { emit: jest.fn() } as any,
      chatSocketPublisher,
      { getProfilesByUserIds: jest.fn().mockResolvedValue(new Map()) } as any,
      projectNames,
    );
  });

  const mockProjectSpace = () => {
    prisma.space.findUnique.mockResolvedValue({
      id: projectSpaceId,
      name: 'Project Alpha',
      createdBy: ownerId,
      projectId,
    });
  };

  it.each([
    ['transfer ownership', () => service.transferSpaceOwnership(ownerId, projectSpaceId, memberId)],
    ['remove member', () => service.removeSpaceMember(ownerId, projectSpaceId, memberId)],
    ['leave space', () => service.leaveSpace(memberId, projectSpaceId)],
    [
      'invite members',
      () =>
        service.inviteMembersToSpace(
          ownerId,
          projectSpaceId,
          [{ userId: memberId }],
          { fullName: 'Owner', avatarUrl: null },
        ),
    ],
  ])('rejects %s from project-linked spaces', async (_name, action) => {
    mockProjectSpace();
    const blockedAction = action();

    await expect(blockedAction).rejects.toThrow(BadRequestException);
    await expect(blockedAction).rejects.toThrow(
      SPACE_ERROR_MESSAGES.PROJECT_SPACE_MANAGED_BY_PROJECT,
    );
  });

  it('allows project space admins to delete the project space', async () => {
    prisma.space.findUnique
      .mockResolvedValueOnce({
        id: projectSpaceId,
        name: 'Project Alpha',
        createdBy: ownerId,
        projectId,
      })
      .mockResolvedValueOnce({ name: 'Project Alpha', projectId });
    prisma.spaceMember.findUnique.mockResolvedValue({
      spaceId: projectSpaceId,
      userId: adminId,
      role: SpaceRole.ADMIN,
    });
    prisma.channel.findMany.mockResolvedValue([{ id: 'channel-id' }]);
    prisma.spaceMember.findMany.mockResolvedValue([
      { userId: ownerId },
      { userId: adminId },
    ]);
    prisma.space.delete.mockResolvedValue({});

    await expect(
      service.deleteSpace(adminId, projectSpaceId),
    ).resolves.toEqual({ success: true });
    expect(prisma.space.delete).toHaveBeenCalledWith({
      where: { id: projectSpaceId },
    });
    expect(chatSocketPublisher.publishConversationDisbanded).toHaveBeenCalled();
    expect(projectNames.publishProjectSpaceEvent).toHaveBeenCalledWith(
      projectId,
      {
        action: 'DELETED',
        actorId: adminId,
        spaceId: projectSpaceId,
        channelId: null,
        exists: false,
      },
    );
  });

  it('allows the project space owner to update member roles in space', async () => {
    const updatedMember = {
      spaceId: projectSpaceId,
      userId: memberId,
      role: SpaceRole.ADMIN,
    };

    mockProjectSpace();
    prisma.spaceMember.findUnique.mockResolvedValue({
      spaceId: projectSpaceId,
      userId: memberId,
      role: SpaceRole.MEMBER,
    });
    prisma.spaceMember.update = jest.fn().mockResolvedValue(updatedMember);
    prisma.channel.findMany.mockResolvedValue([{ id: 'channel-id' }]);
    prisma.channel.findFirst.mockResolvedValue(null);
    prisma.spaceMember.findMany.mockResolvedValue([
      { userId: ownerId },
      { userId: memberId },
    ]);

    await expect(
      service.updateSpaceMemberRole(
        projectSpaceId,
        ownerId,
        memberId,
        SpaceRole.ADMIN,
      ),
    ).resolves.toEqual(updatedMember);
    expect(prisma.spaceMember.update).toHaveBeenCalledWith({
      where: { spaceId_userId: { spaceId: projectSpaceId, userId: memberId } },
      data: { role: SpaceRole.ADMIN },
    });
    expect(chatSocketPublisher.publishMemberRoleUpdated).toHaveBeenCalled();
  });

  it('allows project space admins to update space permissions', async () => {
    const updatedSetting = {
      id: 'setting-id',
      spaceId: projectSpaceId,
      allowMemberCreateChannel: false,
      allowMemberDeleteOwnChannel: true,
    };

    prisma.space.findUnique
      .mockResolvedValueOnce({
        id: projectSpaceId,
        name: 'Project Alpha',
        createdBy: ownerId,
        projectId,
      })
      .mockResolvedValueOnce({ name: 'Project Alpha' });
    prisma.spaceMember.findUnique.mockResolvedValue({
      spaceId: projectSpaceId,
      userId: adminId,
      role: SpaceRole.ADMIN,
    });
    prisma.spaceSetting.upsert.mockResolvedValue(updatedSetting);
    prisma.channel.findMany.mockResolvedValue([{ id: 'channel-id' }]);
    prisma.spaceMember.findMany.mockResolvedValue([
      { userId: ownerId },
      { userId: adminId },
    ]);

    await expect(
      service.updateSpaceSettings(adminId, projectSpaceId, {
        allowMemberCreateChannel: false,
        allowMemberDeleteOwnChannel: true,
      }),
    ).resolves.toEqual(updatedSetting);
    expect(prisma.spaceSetting.upsert).toHaveBeenCalledWith({
      where: { spaceId: projectSpaceId },
      create: {
        spaceId: projectSpaceId,
        allowMemberCreateChannel: false,
        allowMemberDeleteOwnChannel: true,
      },
      update: {
        allowMemberCreateChannel: false,
        allowMemberDeleteOwnChannel: true,
      },
    });
    expect(chatSocketPublisher.publishToRooms).toHaveBeenCalled();
  });
});
