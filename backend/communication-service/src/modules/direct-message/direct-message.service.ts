import { Injectable } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import {
  MESSAGE_CONSTANTS,
  MESSAGE_DIRECTION,
} from '../message/types/message.enums';
import { DirectMessageAccessService } from './direct-message-access.service';
import { DirectMessagePresentationService } from './direct-message-presentation.service';
import { DirectMessageQueryService } from './direct-message-query.service';
import { DirectMessageEventPublisher } from './direct-message-event-publisher.service';
import { DirectMessageMutationService } from './direct-message-mutation.service';

@Injectable()
export class DirectMessageService {
  constructor(
    private readonly access: DirectMessageAccessService,
    private readonly presentation: DirectMessagePresentationService,
    private readonly queries: DirectMessageQueryService,
    private readonly events: DirectMessageEventPublisher,
    private readonly mutations: DirectMessageMutationService,
  ) {}
  async createDirectMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
    medias?: {
      name: string;
      s3Key: string;
      mimeType: string;
      sizeBytes: number;
    }[],
    threadParentId?: string,
    mentions?: string[],
    attachmentMediaId?: string,
  ) {
    return this.mutations.createDirectMessage(
      conversationId,
      senderId,
      content,
      type,
      medias,
      threadParentId,
      mentions,
      attachmentMediaId,
    );
  }

  async getDirectConversationMessages(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    direction: MESSAGE_DIRECTION = MESSAGE_DIRECTION.OLDER,
  ) {
    return this.queries.getDirectConversationMessages(
      conversationId,
      userId,
      cursor,
      limit,
      direction,
    );
  }

  async getDirectConversationMedia(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    mediaType?: string,
    q?: string,
  ) {
    return this.queries.getDirectConversationMedia(
      conversationId,
      userId,
      cursor,
      limit,
      mediaType,
      q,
    );
  }

  async getDirectPinnedMessages(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    senderId?: string,
    q?: string,
  ) {
    return this.queries.getDirectPinnedMessages(
      conversationId,
      userId,
      cursor,
      limit,
      senderId,
      q,
    );
  }

  async searchDirectMessages(
    conversationId: string,
    userId: string,
    q?: string,
    senderId?: string,
    type?: string,
  ) {
    return this.queries.searchDirectMessages(
      conversationId,
      userId,
      q,
      senderId,
      type,
    );
  }

  async getDirectConversationThreads(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    senderId?: string,
  ) {
    return this.queries.getDirectConversationThreads(
      conversationId,
      userId,
      cursor,
      limit,
      senderId,
    );
  }

  async getFollowedDirectThreads(userId: string) {
    return this.queries.getFollowedDirectThreads(userId);
  }

  async getDirectThreadMessages(messageId: string, userId: string) {
    return this.queries.getDirectThreadMessages(messageId, userId);
  }

  async getDirectConversationMemberIds(conversationId: string) {
    return this.queries.getDirectConversationMemberIds(conversationId);
  }

  async getDirectConversationMembersInfo(conversationId: string) {
    return this.queries.getDirectConversationMembersInfo(conversationId);
  }

  async getDirectThreadFollowers(messageId: string) {
    return this.queries.getDirectThreadFollowers(messageId);
  }

  async getDirectMessageConversationId(messageId: string) {
    return this.queries.getDirectMessageConversationId(messageId);
  }

  async markDirectConversationAsRead(
    conversationId: string,
    userId: string,
    messageId: string,
  ) {
    return this.mutations.markDirectConversationAsRead(
      conversationId,
      userId,
      messageId,
    );
  }

  async addDirectReaction(messageId: string, userId: string, emoji: string) {
    return this.mutations.addDirectReaction(messageId, userId, emoji);
  }

  async removeDirectReaction(messageId: string, userId: string, emoji: string) {
    return this.mutations.removeDirectReaction(messageId, userId, emoji);
  }

  async editDirectMessage(messageId: string, content: string, userId: string) {
    return this.mutations.editDirectMessage(messageId, content, userId);
  }

  async recallDirectMessage(messageId: string, userId: string) {
    return this.mutations.recallDirectMessage(messageId, userId);
  }

  async deleteDirectMessage(messageId: string, userId: string) {
    return this.mutations.deleteDirectMessage(messageId, userId);
  }

  async pinDirectMessage(messageId: string, userId: string) {
    return this.mutations.pinDirectMessage(messageId, userId);
  }

  async unpinDirectMessage(messageId: string, userId: string) {
    return this.mutations.unpinDirectMessage(messageId, userId);
  }

  async followDirectThread(messageId: string, userId: string) {
    return this.mutations.followDirectThread(messageId, userId);
  }

  async unfollowDirectThread(messageId: string, userId: string) {
    return this.mutations.unfollowDirectThread(messageId, userId);
  }

  async markDirectThreadAsRead(messageId: string, userId: string) {
    return this.mutations.markDirectThreadAsRead(messageId, userId);
  }
}
