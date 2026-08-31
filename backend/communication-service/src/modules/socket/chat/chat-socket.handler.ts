import { Injectable } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
} from '@nestjs/websockets';
import { MessageType } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { CHAT_REACTION_ACTION } from '../../../common/types/chat.enums';
import { ChatEvent } from './chat-socket.events';
import { ChatSocketPublisher } from './chat-socket.publisher';
import { ChatMessageInteractionHandler } from './handlers/chat-message-interaction.handler';
import { ChatMessageHandler } from './handlers/chat-message.handler';
import { ChatRoomHandler } from './handlers/chat-room.handler';

@Injectable()
export class ChatSocketHandler {
  server: Server;

  constructor(
    private readonly chatRoomHandler: ChatRoomHandler,
    private readonly chatMessageHandler: ChatMessageHandler,
    private readonly chatMessageInteractionHandler: ChatMessageInteractionHandler,
    private readonly chatSocketPublisher: ChatSocketPublisher,
  ) {}

  @SubscribeMessage(ChatEvent.JOIN_CONVERSATION)
  handleJoinConversation(
    @MessageBody() data: { channelId: string },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatRoomHandler.handleJoinConversation(data, client);
  }

  @SubscribeMessage(ChatEvent.JOIN_DIRECT_CONVERSATION)
  handleJoinDirectConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatRoomHandler.handleJoinDirectConversation(data, client);
  }

  @SubscribeMessage(ChatEvent.SEND_MESSAGE)
  async handleSendMessage(
    @MessageBody()
    data: {
      channelId: string;
      content: string;
      type?: MessageType;
      medias?: {
        name: string;
        s3Key: string;
        mimeType: string;
        sizeBytes: number;
      }[];
      pollData?: {
        title: string;
        multipleChoice?: boolean;
        allowAddOptions?: boolean;
        anonymous?: boolean;
        options: string[];
      };
      noteData?: {
        title: string;
        content: string;
      };
      threadParentId?: string;
      mentions?: string[];
    },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatMessageHandler.handleSendMessage(data, client);
  }

  @SubscribeMessage(ChatEvent.SEND_DIRECT_MESSAGE)
  async handleSendDirectMessage(
    @MessageBody()
    data: {
      conversationId: string;
      content: string;
      type?: MessageType;
      medias?: {
        name: string;
        s3Key: string;
        mimeType: string;
        sizeBytes: number;
      }[];
      threadParentId?: string;
      mentions?: string[];
    },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatMessageHandler.handleSendDirectMessage(data, client);
  }

  async sendSystemMessage(channelId: string, userId: string, content: string) {
    return this.chatMessageHandler.sendSystemMessage(channelId, userId, content);
  }

  @SubscribeMessage(ChatEvent.REACT_MESSAGE)
  async handleReactMessage(
    @MessageBody()
    data: {
      channelId: string;
      messageId: string;
      emoji: string;
      action: CHAT_REACTION_ACTION.ADD | CHAT_REACTION_ACTION.REMOVE;
    },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatMessageInteractionHandler.handleReactMessage(
      data,
      client,
    );
  }

  @SubscribeMessage(ChatEvent.VOTE_POLL)
  async handleVotePoll(
    @MessageBody()
    data: { channelId: string; messageId: string; pollOptionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatMessageInteractionHandler.handleVotePoll(
      data,
      client,
    );
  }

  @SubscribeMessage(ChatEvent.ADD_POLL_OPTION)
  async handleAddPollOption(
    @MessageBody()
    data: { channelId: string; messageId: string; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatMessageInteractionHandler.handleAddPollOption(
      data,
      client,
    );
  }

  @SubscribeMessage(ChatEvent.EDIT_POLL)
  async handleEditPoll(
    @MessageBody()
    data: {
      channelId: string;
      messageId: string;
      title: string;
      multipleChoice: boolean;
      allowAddOptions: boolean;
      anonymous?: boolean;
      isLocked?: boolean;
    },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatMessageInteractionHandler.handleEditPoll(
      data,
      client,
    );
  }

  @SubscribeMessage(ChatEvent.EDIT_NOTE)
  async handleEditNote(
    @MessageBody()
    data: {
      channelId: string;
      messageId: string;
      title: string;
      content: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatMessageInteractionHandler.handleEditNote(
      data,
      client,
    );
  }

  @SubscribeMessage(ChatEvent.EDIT_MESSAGE)
  async handleEditMessage(
    @MessageBody()
    data: { channelId: string; messageId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatMessageHandler.handleEditMessage(
      data,
      client,
    );
  }

  @SubscribeMessage(ChatEvent.RECALL_MESSAGE)
  async handleRecallMessage(
    @MessageBody() data: { channelId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatMessageHandler.handleRecallMessage(
      data,
      client,
    );
  }

  @SubscribeMessage(ChatEvent.READ_MESSAGE)
  async handleReadMessage(
    @MessageBody() data: { channelId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatMessageHandler.handleReadMessage(data, client);
  }

  @SubscribeMessage(ChatEvent.READ_DIRECT_MESSAGE)
  async handleReadDirectMessage(
    @MessageBody()
    data: { conversationId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatMessageHandler.handleReadDirectMessage(
      data,
      client,
    );
  }

  @SubscribeMessage(ChatEvent.TYPING)
  async handleTyping(
    @MessageBody() data: { channelId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatRoomHandler.handleTyping(data, client);
  }

  @SubscribeMessage(ChatEvent.TYPING_DIRECT)
  async handleDirectTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatRoomHandler.handleDirectTyping(
      data,
      client,
    );
  }

  emitMemberJoin(targetRooms: string[], payload: Record<string, unknown>) {
    this.chatSocketPublisher.publishMemberJoin(targetRooms, payload);
  }

  @SubscribeMessage(ChatEvent.PIN_MESSAGE)
  async handlePinMessage(
    @MessageBody() data: { channelId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatMessageHandler.handlePinMessage(data, client);
  }

  @SubscribeMessage(ChatEvent.UNPIN_MESSAGE)
  async handleUnpinMessage(
    @MessageBody() data: { channelId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    return this.chatMessageHandler.handleUnpinMessage(data, client);
  }
}
