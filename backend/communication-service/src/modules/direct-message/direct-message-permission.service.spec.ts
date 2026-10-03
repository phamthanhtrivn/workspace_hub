import {
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DirectMessagePermissionService } from './direct-message-permission.service';
import { DIRECT_MESSAGE_PERMISSION_REASON } from './types/direct-message-permission.constants';

describe('DirectMessagePermissionService', () => {
  const senderId = 'sender-id';
  const recipientId = 'recipient-id';
  const conversationId = 'conversation-id';

  function createService(
    hasMessage = false,
    recipientAllowsNewMessages = false,
  ) {
    const prisma = {
      directConversationParticipant: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ userId: senderId }, { userId: recipientId }]),
      },
      directMessage: {
        findFirst: jest
          .fn()
          .mockResolvedValue(hasMessage ? { id: 'old-message' } : null),
      },
    };
    const userSettings = {
      allowsNewDirectMessages: jest
        .fn()
        .mockResolvedValue(recipientAllowsNewMessages),
    };
    const service = new DirectMessagePermissionService(
      prisma as any,
      userSettings as any,
    );
    return { service, prisma, userSettings };
  }

  it('blocks the first message when the recipient disallows new DMs', async () => {
    const { service, userSettings } = createService();
    await expect(
      service.getSendPermission(conversationId, senderId),
    ).resolves.toEqual({
      canSend: false,
      reason: DIRECT_MESSAGE_PERMISSION_REASON.RECIPIENT_BLOCKS_NEW_DM,
    });
    await expect(
      service.assertCanSend(conversationId, senderId),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(userSettings.allowsNewDirectMessages).toHaveBeenCalledWith(
      recipientId,
    );
  });

  it('lets the privacy owner send first when the other user allows new DMs', async () => {
    const { service, userSettings } = createService(false, true);
    userSettings.allowsNewDirectMessages.mockImplementation(
      async (userId: string) => userId === recipientId,
    );
    await expect(
      service.getSendPermission(conversationId, senderId),
    ).resolves.toEqual({
      canSend: true,
      reason: null,
    });
    await expect(
      service.getSendPermission(conversationId, recipientId),
    ).resolves.toEqual({
      canSend: false,
      reason: DIRECT_MESSAGE_PERMISSION_REASON.RECIPIENT_BLOCKS_NEW_DM,
    });
    expect(userSettings.allowsNewDirectMessages).toHaveBeenNthCalledWith(
      1,
      recipientId,
    );
    expect(userSettings.allowsNewDirectMessages).toHaveBeenNthCalledWith(
      2,
      senderId,
    );
  });

  it('blocks either sender when both recipients have opted out', async () => {
    const { service, userSettings } = createService(false, false);
    await expect(
      service.getSendPermission(conversationId, senderId),
    ).resolves.toMatchObject({ canSend: false });
    await expect(
      service.getSendPermission(conversationId, recipientId),
    ).resolves.toMatchObject({ canSend: false });
    expect(userSettings.allowsNewDirectMessages).toHaveBeenNthCalledWith(
      1,
      recipientId,
    );
    expect(userSettings.allowsNewDirectMessages).toHaveBeenNthCalledWith(
      2,
      senderId,
    );
  });

  it('allows an existing conversation without checking current privacy', async () => {
    const { service, userSettings } = createService(true);
    await expect(
      service.getSendPermission(conversationId, senderId),
    ).resolves.toEqual({
      canSend: true,
      reason: null,
    });
    expect(userSettings.allowsNewDirectMessages).not.toHaveBeenCalled();
  });

  it('does not reveal permissions to nonparticipants', async () => {
    const { service, prisma, userSettings } = createService();
    await expect(
      service.getSendPermission(conversationId, 'outsider'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.directMessage.findFirst).not.toHaveBeenCalled();
    expect(userSettings.allowsNewDirectMessages).not.toHaveBeenCalled();
  });

  it('fails closed when recipient settings cannot be read', async () => {
    const { service, userSettings } = createService();
    userSettings.allowsNewDirectMessages.mockRejectedValue(
      new ServiceUnavailableException(),
    );
    await expect(
      service.assertCanSend(conversationId, senderId),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
