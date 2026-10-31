import { Injectable } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { MESSAGE_DIRECTION, MESSAGE_CONSTANTS } from './types/message.enums';
import { MessageQueryService } from './message-query.service';
import { MessageMutationService } from './message-mutation.service';
import { MessagePresentationService } from './message-presentation.service';
import { MessagePublishingService } from './message-publishing.service';

@Injectable()
export class MessageService {
  constructor(
    private readonly queries: MessageQueryService,
    private readonly mutations: MessageMutationService,
    private readonly presentation: MessagePresentationService,
    private readonly publishing: MessagePublishingService,
  ) {}
  async createMessage(
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
    attachmentMediaId?: string,
  ) {
    return this.mutations.createMessage(
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
  }

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
    return this.publishing.createMessageAndPublish(
      channelId,
      senderId,
      content,
      type,
      medias,
      pollData,
      noteData,
      threadParentId,
      mentions,
      attachmentMediaId,
    );
  }

  async getConversationMessages(
    channelId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    direction: MESSAGE_DIRECTION = MESSAGE_DIRECTION.OLDER,
  ) {
    return this.queries.getConversationMessages(
      channelId,
      cursor,
      limit,
      direction,
    );
  }

  async getConversationMedia(
    channelId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    mediaType?: string,
    q?: string,
  ) {
    return this.queries.getConversationMedia(
      channelId,
      cursor,
      limit,
      mediaType,
      q,
    );
  }

  async searchMessages(
    channelId: string,
    q?: string,
    senderId?: string,
    type?: string,
  ) {
    return this.queries.searchMessages(channelId, q, senderId, type);
  }

  async getConversationThreads(channelId: string) {
    return this.queries.getConversationThreads(channelId);
  }

  async getFollowedThreads(userId: string) {
    return this.queries.getFollowedThreads(userId);
  }

  async followThread(userId: string, messageId: string) {
    return this.mutations.followThread(userId, messageId);
  }

  async unfollowThread(userId: string, messageId: string) {
    return this.mutations.unfollowThread(userId, messageId);
  }

  async markThreadAsRead(userId: string, messageId: string) {
    return this.mutations.markThreadAsRead(userId, messageId);
  }

  async getThreadMessages(messageId: string) {
    return this.queries.getThreadMessages(messageId);
  }

  async getConversationMemberIds(channelId: string): Promise<string[]> {
    return this.queries.getConversationMemberIds(channelId);
  }

  async getConversationMembersInfo(
    channelId: string,
  ): Promise<{ userId: string; muted: boolean }[]> {
    return this.queries.getConversationMembersInfo(channelId);
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    return this.mutations.addReaction(messageId, userId, emoji);
  }

  async addReactionAndPublish(
    messageId: string,
    userId: string,
    emoji: string,
  ) {
    return this.publishing.addReactionAndPublish(messageId, userId, emoji);
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    return this.mutations.removeReaction(messageId, userId, emoji);
  }

  async removeReactionAndPublish(
    messageId: string,
    userId: string,
    emoji: string,
  ) {
    return this.publishing.removeReactionAndPublish(messageId, userId, emoji);
  }

  async markConversationAsRead(
    channelId: string,
    userId: string,
    messageId: string,
  ) {
    return this.mutations.markConversationAsRead(channelId, userId, messageId);
  }

  async markConversationAsReadAndPublish(
    channelId: string,
    userId: string,
    messageId: string,
  ) {
    return this.publishing.markConversationAsReadAndPublish(
      channelId,
      userId,
      messageId,
    );
  }

  async editMessage(messageId: string, content: string, userId: string) {
    return this.mutations.editMessage(messageId, content, userId);
  }

  async editMessageAndPublish(
    messageId: string,
    content: string,
    userId: string,
  ) {
    return this.publishing.editMessageAndPublish(messageId, content, userId);
  }

  async recallMessage(messageId: string, userId: string) {
    return this.mutations.recallMessage(messageId, userId);
  }

  async recallMessageAndPublish(messageId: string, userId: string) {
    return this.publishing.recallMessageAndPublish(messageId, userId);
  }

  async pinMessage(messageId: string, userId: string) {
    return this.mutations.pinMessage(messageId, userId);
  }

  async pinMessageAndPublish(messageId: string, userId: string) {
    return this.publishing.pinMessageAndPublish(messageId, userId);
  }

  async unpinMessage(messageId: string, userId: string) {
    return this.mutations.unpinMessage(messageId, userId);
  }

  async unpinMessageAndPublish(messageId: string, userId: string) {
    return this.publishing.unpinMessageAndPublish(messageId, userId);
  }

  async getPinnedMessages(
    channelId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    q?: string,
  ) {
    return this.queries.getPinnedMessages(channelId, cursor, limit, q);
  }

  async getThreadFollowers(messageId: string): Promise<string[]> {
    return this.queries.getThreadFollowers(messageId);
  }

  async addThreadFollower(messageId: string, userId: string): Promise<void> {
    return this.mutations.addThreadFollower(messageId, userId);
  }
}
