import { Injectable } from '@nestjs/common';
import {
  CHAT_CONTEXT_TYPE,
  CHAT_REACTION_ACTION,
} from '../../../common/types/chat.enums';
import { MessageType } from '@prisma/client';
import { MessageService } from '../../message/message.service';
import { SocketEventEmitter } from '../services/socket-event-emitter';
import { ChatEvent } from './chat-socket.events';
import { ChatSocketRoomResolver } from './chat-socket-room-resolver';

type ChatSocketPayload = Record<string, unknown>;

type ChatSocketMessage = ChatSocketPayload & {
  id: string;
  channelId?: string | null;
  conversationId?: string | null;
  medias?: unknown[];
  poll?: unknown;
  note?: unknown;
};

@Injectable()
export class ChatSocketPublisher {
  constructor(
    private readonly socketEventEmitter: SocketEventEmitter,
    private readonly roomResolver: ChatSocketRoomResolver,
    private readonly messageService: MessageService,
  ) {}

  publishToRooms<TPayload>(
    rooms: string | string[],
    event: ChatEvent,
    payload: TPayload,
  ): void {
    this.socketEventEmitter.emitToRooms(rooms, event, payload);
  }

  async publishChannelMessageCreated(
    channelId: string,
    message: ChatSocketMessage,
    options?: {
      medias?: unknown[];
      pollData?: unknown;
      noteData?: unknown;
    },
  ): Promise<void> {
    const targetRooms = await this.roomResolver.getChannelTargetRooms(channelId);
    this.publishToRooms(targetRooms, ChatEvent.NEW_MESSAGE, message);

    if (options?.medias && options.medias.length > 0) {
      this.publishToRooms(targetRooms, ChatEvent.MEDIA_UPDATED, {
        chatId: channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId,
        messageId: message.id,
        media: message.medias,
      });
    }

    if (options?.pollData && message.poll) {
      this.publishToRooms(targetRooms, ChatEvent.POLL_UPDATED, {
        chatId: channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId,
        messageId: message.id,
        poll: message.poll,
      });
    }

    if (options?.noteData && message.note) {
      this.publishToRooms(targetRooms, ChatEvent.NOTE_UPDATED, {
        chatId: channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId,
        messageId: message.id,
        note: message.note,
      });
    }
  }

  async publishDirectMessageCreated(
    conversationId: string,
    message: ChatSocketMessage,
    options?: { medias?: unknown[] },
  ): Promise<void> {
    const targetRooms =
      await this.roomResolver.getDirectTargetRooms(conversationId);
    this.publishToRooms(targetRooms, ChatEvent.NEW_MESSAGE, message);

    if (options?.medias && options.medias.length > 0) {
      this.publishToRooms(targetRooms, ChatEvent.MEDIA_UPDATED, {
        chatId: conversationId,
        chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
        conversationId,
        messageId: message.id,
        media: message.medias,
      });
    }
  }

  async publishChannelMessageUpdated(
    channelId: string,
    message: ChatSocketMessage,
  ): Promise<void> {
    const targetRooms = await this.roomResolver.getChannelTargetRooms(channelId);
    this.publishToRooms(targetRooms, ChatEvent.MESSAGE_UPDATED, message);
  }

  async publishChannelMessagePinned(
    channelId: string,
    message: ChatSocketMessage,
  ): Promise<void> {
    const targetRooms = await this.roomResolver.getChannelTargetRooms(channelId);
    this.publishToRooms(targetRooms, ChatEvent.MESSAGE_PINNED, message);
  }

  async publishChannelMessageUnpinned(
    channelId: string,
    message: ChatSocketMessage,
  ): Promise<void> {
    const targetRooms = await this.roomResolver.getChannelTargetRooms(channelId);
    this.publishToRooms(targetRooms, ChatEvent.MESSAGE_UNPINNED, message);
  }

  async publishDirectMessageUpdated(
    conversationId: string,
    event: ChatEvent,
    message: ChatSocketMessage,
  ): Promise<void> {
    const targetRooms =
      await this.roomResolver.getDirectTargetRooms(conversationId);
    this.publishToRooms(targetRooms, event, {
      ...message,
      chatId: conversationId,
      chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
      conversationId,
    });
  }

  async publishChannelMessageRead(
    channelId: string,
    payload: { messageId: string; userId: string; readAt?: Date | null },
  ): Promise<void> {
    const targetRooms = await this.roomResolver.getChannelTargetRooms(channelId);
    this.publishToRooms(targetRooms, ChatEvent.MESSAGE_READ, {
      chatId: channelId,
      chatType: CHAT_CONTEXT_TYPE.CHANNEL,
      channelId,
      messageId: payload.messageId,
      userId: payload.userId,
      readAt: payload.readAt,
    });
  }

  async publishDirectMessageRead(
    conversationId: string,
    payload: { messageId: string; userId: string; readAt?: Date | null },
  ): Promise<void> {
    const targetRooms =
      await this.roomResolver.getDirectTargetRooms(conversationId);
    this.publishToRooms(targetRooms, ChatEvent.MESSAGE_READ, {
      chatId: conversationId,
      chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
      conversationId,
      messageId: payload.messageId,
      userId: payload.userId,
      readAt: payload.readAt,
    });
  }

  async publishChannelReactionUpdated(
    channelId: string,
    payload: {
      messageId: string;
      userId: string;
      emoji: string;
      action: string;
    },
  ): Promise<void> {
    const targetRooms = await this.roomResolver.getChannelTargetRooms(channelId);
    this.publishToRooms(targetRooms, ChatEvent.REACTION_UPDATED, {
      chatId: channelId,
      chatType: CHAT_CONTEXT_TYPE.CHANNEL,
      channelId,
      ...payload,
    });
  }

  async publishDirectReactionUpdated(
    conversationId: string,
    payload: {
      messageId: string;
      userId: string;
      emoji: string;
      action: string | CHAT_REACTION_ACTION;
    },
  ): Promise<void> {
    const targetRooms =
      await this.roomResolver.getDirectTargetRooms(conversationId);
    this.publishToRooms(targetRooms, ChatEvent.REACTION_UPDATED, {
      chatId: conversationId,
      chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
      conversationId,
      ...payload,
    });
  }

  async publishMessageMoved(
    channelId: string,
    message: ChatSocketMessage,
  ): Promise<void> {
    const targetRooms = await this.roomResolver.getChannelTargetRooms(channelId);
    this.publishToRooms(targetRooms, ChatEvent.MESSAGE_MOVED, {
      ...message,
      chatId: channelId,
      chatType: CHAT_CONTEXT_TYPE.CHANNEL,
      channelId,
    });
  }

  async publishTyping(
    chatType: CHAT_CONTEXT_TYPE,
    chatId: string,
    payload: { userId: string; isTyping: boolean },
  ): Promise<void> {
    const targetRooms =
      chatType === CHAT_CONTEXT_TYPE.CHANNEL
        ? await this.roomResolver.getChannelTargetRooms(chatId)
        : await this.roomResolver.getDirectTargetRooms(chatId);

    this.publishToRooms(targetRooms, ChatEvent.TYPING, {
      chatId,
      chatType,
      ...(chatType === CHAT_CONTEXT_TYPE.CHANNEL
        ? { channelId: chatId }
        : { conversationId: chatId }),
      userId: payload.userId,
      isTyping: payload.isTyping,
    });
  }

  async publishConversationMuteUpdated(
    userId: string,
    chatType: CHAT_CONTEXT_TYPE,
    chatId: string,
    muted: boolean,
  ): Promise<void> {
    this.publishToRooms(userId, ChatEvent.CONVERSATION_MUTE_UPDATED, {
      chatId,
      chatType,
      ...(chatType === CHAT_CONTEXT_TYPE.CHANNEL
        ? { channelId: chatId }
        : { conversationId: chatId }),
      muted,
    });
  }

  publishMemberJoin(targetRooms: string[], payload: ChatSocketPayload): void {
    this.publishToRooms(targetRooms, ChatEvent.JOIN_CONVERSATION, payload);
  }

  async sendSystemMessage(
    channelId: string,
    userId: string,
    content: string,
  ): Promise<ChatSocketMessage> {
    const message = await this.messageService.createMessage(
      channelId,
      userId,
      content,
      MessageType.SYSTEM,
    );

    const messageWithUrls = {
      ...message,
      chatId: channelId,
      chatType: CHAT_CONTEXT_TYPE.CHANNEL,
      medias: [],
    };

    await this.publishChannelMessageCreated(channelId, messageWithUrls);
    return messageWithUrls;
  }

  async publishChannelSettingUpdated(
    channelId: string,
    payload: ChatSocketPayload,
  ): Promise<void> {
    this.publishToRooms(channelId, ChatEvent.CHANNEL_SETTING_UPDATED, payload);
  }

  publishMemberRoleUpdated(
    rooms: string | string[],
    payload: ChatSocketPayload,
  ): void {
    this.publishToRooms(rooms, ChatEvent.MEMBER_ROLE_UPDATED, payload);
  }

  publishMemberKicked(
    rooms: string | string[],
    payload: ChatSocketPayload,
  ): void {
    this.publishToRooms(rooms, ChatEvent.MEMBER_KICKED, payload);
  }

  publishMemberLeft(
    rooms: string | string[],
    payload: ChatSocketPayload,
  ): void {
    this.publishToRooms(rooms, ChatEvent.MEMBER_LEFT, payload);
  }

  publishConversationUpdated(
    rooms: string | string[],
    payload: ChatSocketPayload,
  ): void {
    this.publishToRooms(rooms, ChatEvent.CONVERSATION_UPDATED, payload);
  }

  publishConversationDisbanded(
    rooms: string | string[],
    payload: ChatSocketPayload,
  ): void {
    this.publishToRooms(rooms, ChatEvent.CONVERSATION_DISBANDED, payload);
  }

  leaveRoom(room: string): void {
    this.socketEventEmitter.leaveRoom(room);
  }
}
