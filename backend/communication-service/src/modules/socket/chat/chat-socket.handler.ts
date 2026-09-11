import { Injectable } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatEvent } from './chat-socket.events';
import { ChatRoomHandler } from './handlers/chat-room.handler';

@Injectable()
export class ChatSocketHandler {
  constructor(private readonly chatRoomHandler: ChatRoomHandler) {}

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
    return this.chatRoomHandler.handleDirectTyping(data, client);
  }
}
