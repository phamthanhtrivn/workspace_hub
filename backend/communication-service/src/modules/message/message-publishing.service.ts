import { assertClientMessageType } from '../../common/auth/client-message-type';
import { Injectable } from '@nestjs/common';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { MessageType } from '@prisma/client';
import { mapMediaWithUrl } from '../../common/utils/file.util';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import { MessageMutationService } from './message-mutation.service';
import { MessageQueryService } from './message-query.service';
import { MessagePresentationService } from './message-presentation.service';

@Injectable()
export class MessagePublishingService {
  constructor(
    private readonly chatSocketPublisher: ChatSocketPublisher,
    private readonly mutations: MessageMutationService,
    private readonly queries: MessageQueryService,
    private readonly presentation: MessagePresentationService,
  ) {}
  async createMessageAndPublish(
    channelId: string,
    senderId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
    medias?: {
      name: string;
      s3Key: string;
      mimeType: string;
      sizeBytes: number;
    }[],
    pollData?: {
      title: string;
      multipleChoice?: boolean;
      allowAddOptions?: boolean;
      anonymous?: boolean;
      options: string[];
    },
    noteData?: {
      title: string;
      content: string;
    },
    threadParentId?: string,
    mentions?: string[],
    attachmentMediaId?: string,
  ) {
    assertClientMessageType(type);
    const message = await this.mutations.createMessage(
      channelId,
      senderId,
      content,
      type,
      medias,
      pollData,
      noteData,
      threadParentId,
      attachmentMediaId,
    );

    const threadFollowers = threadParentId
      ? await this.queries.getThreadFollowers(threadParentId)
      : undefined;
    const messagePayload = {
      ...message,
      chatId: channelId,
      chatType: CHAT_CONTEXT_TYPE.CHANNEL,
      channelId,
      medias: mapMediaWithUrl(message.medias),
      mentions,
      threadFollowers,
    };

    await this.chatSocketPublisher.publishChannelMessageCreated(
      channelId,
      messagePayload,
      { medias, pollData, noteData },
    );

    return messagePayload;
  }

  async addReactionAndPublish(
    messageId: string,
    userId: string,
    emoji: string,
  ) {
    const result = await this.mutations.addReaction(messageId, userId, emoji);
    const channelId = await this.queries.getMessageChannelId(messageId);

    await this.chatSocketPublisher.publishChannelReactionUpdated(channelId, {
      messageId,
      userId,
      emoji: result.emoji,
      action: result.action,
    });

    return result;
  }

  async removeReactionAndPublish(
    messageId: string,
    userId: string,
    emoji: string,
  ) {
    const result = await this.mutations.removeReaction(
      messageId,
      userId,
      emoji,
    );
    const channelId = await this.queries.getMessageChannelId(messageId);

    await this.chatSocketPublisher.publishChannelReactionUpdated(channelId, {
      messageId,
      userId,
      emoji,
      action: 'remove',
    });

    return result;
  }

  async markConversationAsReadAndPublish(
    channelId: string,
    userId: string,
    messageId: string,
  ) {
    const readReceipt = await this.mutations.markConversationAsRead(
      channelId,
      userId,
      messageId,
    );

    await this.chatSocketPublisher.publishChannelMessageRead(channelId, {
      messageId,
      userId,
      readAt: readReceipt.lastReadAt,
    });

    return readReceipt;
  }

  async editMessageAndPublish(
    messageId: string,
    content: string,
    userId: string,
  ) {
    const updatedMessage = await this.mutations.editMessage(
      messageId,
      content,
      userId,
    );
    const messagePayload =
      this.presentation.mapChannelMessagePayload(updatedMessage);

    await this.chatSocketPublisher.publishChannelMessageUpdated(
      updatedMessage.channelId,
      messagePayload,
    );

    return messagePayload;
  }

  async recallMessageAndPublish(messageId: string, userId: string) {
    const updatedMessage = await this.mutations.recallMessage(
      messageId,
      userId,
    );
    const messagePayload =
      this.presentation.mapChannelMessagePayload(updatedMessage);

    await this.chatSocketPublisher.publishChannelMessageUpdated(
      updatedMessage.channelId,
      messagePayload,
    );

    return messagePayload;
  }

  async pinMessageAndPublish(messageId: string, userId: string) {
    const updatedMessage = await this.mutations.pinMessage(messageId, userId);
    const messagePayload =
      this.presentation.mapChannelMessagePayload(updatedMessage);

    await this.chatSocketPublisher.publishChannelMessagePinned(
      updatedMessage.channelId,
      messagePayload,
    );

    return messagePayload;
  }

  async unpinMessageAndPublish(messageId: string, userId: string) {
    const updatedMessage = await this.mutations.unpinMessage(messageId, userId);
    const messagePayload =
      this.presentation.mapChannelMessagePayload(updatedMessage);

    await this.chatSocketPublisher.publishChannelMessageUnpinned(
      updatedMessage.channelId,
      messagePayload,
    );

    return messagePayload;
  }
}
