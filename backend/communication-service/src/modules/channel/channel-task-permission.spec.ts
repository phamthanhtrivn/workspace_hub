import { SpaceRole } from '@prisma/client';
import { ChannelService } from './channel.service';

describe('Channel task permission', () => {
  const projectId = 'project-1';
  const userId = 'user-1';
  const channelId = 'channel-1';

  function createService(
    role: SpaceRole,
    allowCreateTask: boolean,
    linkedProjectId: string | null = projectId,
    isOwner = false,
  ) {
    const prisma = {
      channel: {
        findUnique: jest.fn().mockResolvedValue({
          spaceId: 'space-1',
          space: {
            projectId: linkedProjectId,
            createdBy: isOwner ? userId : 'owner-1',
            members: [{ role }],
          },
          members: [{ id: 'membership-1' }],
          setting: { allowCreateTask },
        }),
      },
      spaceMember: {
        findUnique: jest.fn().mockResolvedValue({ role }),
      },
      channelSetting: {
        update: jest.fn().mockResolvedValue({ allowCreateTask }),
      },
    };
    const publisher = { publishChannelSettingUpdated: jest.fn() };
    const service = new ChannelService(
      prisma as any,
      publisher as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { service, prisma, publisher };
  }

  it('blocks a regular member before task creation', async () => {
    const { service } = createService(SpaceRole.MEMBER, false);
    await expect(service.assertCanCreateTaskInChannel(channelId, projectId, userId))
      .rejects.toThrow('Task creation is disabled in this channel');
  });

  it('allows a member when enabled, and admins or owners when disabled', async () => {
    await expect(createService(SpaceRole.MEMBER, true).service
      .assertCanCreateTaskInChannel(channelId, projectId, userId)).resolves.toBeUndefined();
    await expect(createService(SpaceRole.ADMIN, false).service
      .assertCanCreateTaskInChannel(channelId, projectId, userId)).resolves.toBeUndefined();
    await expect(createService(SpaceRole.MEMBER, false, projectId, true).service
      .assertCanCreateTaskInChannel(channelId, projectId, userId)).resolves.toBeUndefined();
  });

  it('rejects a channel linked to another project', async () => {
    const { service } = createService(SpaceRole.ADMIN, true, 'other-project');
    await expect(service.assertCanCreateTaskInChannel(channelId, projectId, userId))
      .rejects.toThrow('Channel does not belong to this project');
  });

  it('only lets admins change the setting on a project-linked space', async () => {
    const admin = createService(SpaceRole.ADMIN, true);
    await admin.service.updateChannelSettings(channelId, userId, { allowCreateTask: false });
    expect(admin.prisma.channelSetting.update).toHaveBeenCalledWith({
      where: { channelId },
      data: { allowCreateTask: false },
    });
    expect(admin.publisher.publishChannelSettingUpdated).toHaveBeenCalled();

    const owner = createService(SpaceRole.MEMBER, true, projectId, true);
    await expect(owner.service.updateChannelSettings(channelId, userId, { allowCreateTask: false }))
      .resolves.toBeDefined();

    const member = createService(SpaceRole.MEMBER, true);
    await expect(member.service.updateChannelSettings(channelId, userId, { allowCreateTask: false }))
      .rejects.toThrow('You are not allowed to change channel settings');

    const unlinked = createService(SpaceRole.ADMIN, true, null);
    await expect(unlinked.service.updateChannelSettings(channelId, userId, { allowCreateTask: false }))
      .rejects.toThrow('Task creation settings require a project-linked space');
    expect(unlinked.prisma.channelSetting.update).not.toHaveBeenCalled();
  });
});
