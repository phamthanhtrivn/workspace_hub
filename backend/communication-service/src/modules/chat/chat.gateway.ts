import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatEvent } from './chat.events';
import { MessageService } from '../message/message.service';
import { PollService } from '../poll/poll.service';
import { NoteService } from '../note/note.service';
import { MessageType } from '@prisma/client';
import { mapMediaWithUrl } from '../../common/utils/file.util';

@WebSocketGateway({
  path: '/communication.io',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messageService: MessageService,
    private readonly pollService: PollService,
    private readonly noteService: NoteService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payloadBase64 = token.split('.')[1];
      const decoded = JSON.parse(
        Buffer.from(payloadBase64, 'base64').toString(),
      );
      const userId = decoded.sub || decoded.id;
      client.data.userId = userId; // standard fields

      client.join(userId);
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(_: Socket) {}

  @SubscribeMessage(ChatEvent.JOIN_CONVERSATION)
  handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.conversationId) {
      client.join(data.conversationId);
      return { status: 'joined', conversationId: data.conversationId };
    }
  }

  @SubscribeMessage(ChatEvent.SEND_MESSAGE)
  async handleSendMessage(
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
      replyToMessageId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (
      !userId ||
      !data.conversationId ||
      (data.content === undefined && (!data.medias || data.medias.length === 0) && !data.pollData && !data.noteData)
    ) {
      return { status: 'error', message: 'Invalid data' };
    }

    try {
      const message = await this.messageService.createMessage(
        data.conversationId,
        userId,
        data.content || '',
        data.type || MessageType.TEXT,
        data.medias,
        data.pollData,
        data.noteData,
        data.replyToMessageId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.conversationId,
      );

      const messageWithUrls = {
        ...message,
        medias: mapMediaWithUrl(message.medias),
      };

      const targetRooms = [data.conversationId, ...memberUserIds];
      this.server.to(targetRooms).emit(ChatEvent.NEW_MESSAGE, messageWithUrls);

      if (data.medias && data.medias.length > 0) {
        this.server.to(targetRooms).emit(ChatEvent.MEDIA_UPDATED, {
          conversationId: data.conversationId,
          messageId: message.id,
          media: messageWithUrls.medias,
        });
      }

      if (data.pollData && messageWithUrls.poll) {
        this.server.to(targetRooms).emit(ChatEvent.POLL_UPDATED, {
          conversationId: data.conversationId,
          messageId: message.id,
          poll: messageWithUrls.poll,
        });
      }

      if (data.noteData && messageWithUrls.note) {
        this.server.to(targetRooms).emit(ChatEvent.NOTE_UPDATED, {
          conversationId: data.conversationId,
          messageId: message.id,
          note: messageWithUrls.note,
        });
      }

      return { status: 'success', data: messageWithUrls };
    } catch (error) {
      console.error(error);
      return { status: 'error', message: 'Failed to send message' };
    }
  }

  async sendSystemMessage(
    conversationId: string,
    userId: string,
    content: string,
  ) {
    try {
      const message = await this.messageService.createMessage(
        conversationId,
        userId,
        content,
        MessageType.SYSTEM,
      );

      const memberUserIds =
        await this.messageService.getConversationMemberIds(conversationId);

      const messageWithUrls = {
        ...message,
        medias: [],
      };

      const targetRooms = [conversationId, ...memberUserIds];
      this.server.to(targetRooms).emit(ChatEvent.NEW_MESSAGE, messageWithUrls);
      return { status: 'success', data: messageWithUrls };
    } catch (error) {
      console.error(error);
      return { status: 'error', message: 'Failed to send system message' };
    }
  }

  @SubscribeMessage(ChatEvent.REACT_MESSAGE)
  async handleReactMessage(
    @MessageBody() data: { conversationId: string; messageId: string; emoji: string; action: 'add' | 'remove' },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.conversationId || !data.emoji) return;

    try {
      let finalAction = data.action;
      let finalEmoji = data.emoji;

      if (data.action === 'add') {
        const result = await this.messageService.addReaction(data.messageId, userId, data.emoji);
        finalAction = result.action as any;
        finalEmoji = result.emoji;
      } else {
        await this.messageService.removeReaction(data.messageId, userId, data.emoji);
      }

      const memberUserIds = await this.messageService.getConversationMemberIds(data.conversationId);
      const targetRooms = [data.conversationId, ...memberUserIds];
      
      this.server.to(targetRooms).emit(ChatEvent.REACTION_UPDATED, {
        conversationId: data.conversationId,
        messageId: data.messageId,
        userId,
        emoji: finalEmoji,
        action: finalAction,
      });
      return { status: 'success' };
    } catch (error) {
      console.error(error);
      return { status: 'error', message: 'Failed to update reaction' };
    }
  }

  @SubscribeMessage(ChatEvent.VOTE_POLL)
  async handleVotePoll(
    @MessageBody() data: { conversationId: string; messageId: string; pollOptionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.conversationId || !data.pollOptionId) return;

    try {
      const updatedMessage = await this.pollService.votePoll(data.messageId, data.pollOptionId, userId);

      const memberUserIds = await this.messageService.getConversationMemberIds(data.conversationId);
      const targetRooms = [data.conversationId, ...memberUserIds];
      
      this.server.to(targetRooms).emit(ChatEvent.MESSAGE_MOVED, updatedMessage);
      return { status: 'success' };
    } catch (error) {
      console.error(error);
      return { status: 'error', message: 'Failed to vote poll' };
    }
  }

  @SubscribeMessage(ChatEvent.ADD_POLL_OPTION)
  async handleAddPollOption(
    @MessageBody() data: { conversationId: string; messageId: string; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.conversationId || !data.text) return;

    try {
      const updatedMessage = await this.pollService.addPollOption(data.messageId, data.text, userId);

      const memberUserIds = await this.messageService.getConversationMemberIds(data.conversationId);
      const targetRooms = [data.conversationId, ...memberUserIds];
      
      this.server.to(targetRooms).emit(ChatEvent.MESSAGE_MOVED, updatedMessage);
      return { status: 'success' };
    } catch (error) {
      console.error(error);
      return { status: 'error', message: 'Failed to add poll option' };
    }
  }

  @SubscribeMessage(ChatEvent.EDIT_POLL)
  async handleEditPoll(
    @MessageBody() data: { conversationId: string; messageId: string; title: string; multipleChoice: boolean; allowAddOptions: boolean; anonymous?: boolean; isLocked?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.conversationId || !data.title) return;

    try {
      const updatedMessage = await this.pollService.updatePoll(data.messageId, data.title, data.multipleChoice, data.allowAddOptions, data.anonymous, data.isLocked);

      const memberUserIds = await this.messageService.getConversationMemberIds(data.conversationId);
      const targetRooms = [data.conversationId, ...memberUserIds];
      
      this.server.to(targetRooms).emit(ChatEvent.MESSAGE_MOVED, updatedMessage);
      return { status: 'success' };
    } catch (error) {
      console.error(error);
      return { status: 'error', message: 'Failed to edit poll' };
    }
  }

  @SubscribeMessage(ChatEvent.EDIT_NOTE)
  async handleEditNote(
    @MessageBody() data: { conversationId: string; messageId: string; title: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.conversationId || !data.title || !data.content) return;

    try {
      const updatedMessage = await this.noteService.updateNote(data.messageId, data.title, data.content, userId);

      const memberUserIds = await this.messageService.getConversationMemberIds(data.conversationId);
      const targetRooms = [data.conversationId, ...memberUserIds];
      
      this.server.to(targetRooms).emit(ChatEvent.MESSAGE_MOVED, updatedMessage);
      return { status: 'success' };
    } catch (error) {
      console.error(error);
      return { status: 'error', message: 'Failed to edit note' };
    }
  }

  @SubscribeMessage(ChatEvent.EDIT_MESSAGE)
  async handleEditMessage(
    @MessageBody() data: { conversationId: string; messageId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.conversationId || data.content === undefined) return;

    try {
      const updatedMessage = await this.messageService.editMessage(data.messageId, data.content, userId);

      const memberUserIds = await this.messageService.getConversationMemberIds(data.conversationId);
      const targetRooms = [data.conversationId, ...memberUserIds];
      
      this.server.to(targetRooms).emit(ChatEvent.MESSAGE_UPDATED, updatedMessage);
      return { status: 'success' };
    } catch (error) {
      console.error(error);
      return { status: 'error', message: 'Failed to edit message' };
    }
  }

  @SubscribeMessage(ChatEvent.RECALL_MESSAGE)
  async handleRecallMessage(
    @MessageBody() data: { conversationId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.conversationId) return;

    try {
      const updatedMessage = await this.messageService.recallMessage(data.messageId, userId);

      const memberUserIds = await this.messageService.getConversationMemberIds(data.conversationId);
      const targetRooms = [data.conversationId, ...memberUserIds];
      
      this.server.to(targetRooms).emit(ChatEvent.MESSAGE_UPDATED, updatedMessage);
      return { status: 'success' };
    } catch (error) {
      console.error(error);
      return { status: 'error', message: 'Failed to recall message' };
    }
  }

  @SubscribeMessage(ChatEvent.READ_MESSAGE)
  async handleReadMessage(
    @MessageBody() data: { conversationId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.conversationId) return;

    try {
      const readReceipt = await this.messageService.markConversationAsRead(data.conversationId, userId, data.messageId);
      
      const memberUserIds = await this.messageService.getConversationMemberIds(data.conversationId);
      const targetRooms = [data.conversationId, ...memberUserIds];
      
      this.server.to(targetRooms).emit(ChatEvent.MESSAGE_READ, {
        conversationId: data.conversationId,
        messageId: data.messageId,
        userId,
        readAt: readReceipt.lastReadAt,
      });
      return { status: 'success' };
    } catch (error) {
      console.error(error);
      return { status: 'error', message: 'Failed to mark as read' };
    }
  }

  @SubscribeMessage(ChatEvent.TYPING)
  async handleTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.conversationId) return;

    try {
      const memberUserIds = await this.messageService.getConversationMemberIds(data.conversationId);
      const targetRooms = [data.conversationId, ...memberUserIds];
      
      this.server.to(targetRooms).emit(ChatEvent.TYPING, {
        conversationId: data.conversationId,
        userId,
        isTyping: data.isTyping,
      });
    } catch (error) {
      console.error(error);
    }
  }

  emitMemberJoin(targetRooms: string[], payload: any) {
    this.server.to(targetRooms).emit(ChatEvent.JOIN_CONVERSATION, payload);
  }
}
