import { NotFoundException } from '@nestjs/common';
import { ChannelAccessService } from './channel-access.service';
import { ChatRoomHandler } from '../../socket/chat/handlers/chat-room.handler';
import { Socket } from 'socket.io';

describe('Private channel access', () => {
  function fixture(
    visibility = 'PRIVATE',
    membership: { id: string } | null = null,
  ) {
    const prisma = {
      channel: { findUnique: jest.fn().mockResolvedValue({ visibility }) },
      channelMember: { findFirst: jest.fn().mockResolvedValue(membership) },
    };
    const access = new ChannelAccessService(
      prisma as unknown as ConstructorParameters<
        typeof ChannelAccessService
      >[0],
    );
    return { prisma, access };
  }
  it('hides private channels from nonmembers, even when they know the ID', async () => {
    const { access, prisma } = fixture();
    await expect(
      access.assertPrivateAccess('private', 'space-owner'),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.channelMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          channelId: 'private',
          userId: 'space-owner',
          channel: { space: { members: { some: { userId: 'space-owner' } } } },
        },
      }),
    );
  });
  it('allows members and preserves public access behavior', async () => {
    await expect(
      fixture('PRIVATE', { id: 'member' }).access.assertPrivateAccess(
        'private',
        'member',
      ),
    ).resolves.toBeUndefined();
    const publicChannel = fixture('PUBLIC');
    await publicChannel.access.assertPrivateAccess('public', 'visitor');
    expect(publicChannel.prisma.channelMember.findFirst).not.toHaveBeenCalled();
  });
  it('does not join a private socket room for a nonmember', async () => {
    const { access } = fixture();
    const handler = new ChatRoomHandler(
      {} as ConstructorParameters<typeof ChatRoomHandler>[0],
      access,
    );
    const client = { data: { userId: 'outsider' }, join: jest.fn() };
    await expect(
      handler.handleJoinConversation(
        { channelId: 'private' },
        client as unknown as Socket,
      ),
    ).rejects.toThrow(NotFoundException);
    expect(client.join).not.toHaveBeenCalled();
  });
});
