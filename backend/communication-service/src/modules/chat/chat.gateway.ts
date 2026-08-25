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
import {
  ChatEvent,
  CHAT_CONTEXT_TYPE,
  CHAT_RESPONSE_STATUS,
  CHAT_REACTION_ACTION,
  CHAT_ERROR_MESSAGES,
} from './types/chat.enums';
import { MessageService } from '../message/message.service';
import { MessageType } from '@prisma/client';
import { mapMediaWithUrl } from '../../common/utils/file.util';
import { PollService } from '../poll/poll.service';
import { NoteService } from '../note/note.service';
import { DirectMessageService } from '../direct-message/direct-message.service';
import { MeetingSocketEvent } from '../meeting/meeting.events';
import {
  MeetingAccessUpdatedPayload,
  MeetingJoinDecisionPayload,
  MeetingParticipantPayload,
  MeetingJoinRequestPayload,
} from '../meeting/types/meeting.types';
import {
  getMeetingHostRoom,
  getMeetingUserRoom,
} from '../meeting/utils/meeting-room.util';

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
    private readonly directMessageService: DirectMessageService,
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

  @SubscribeMessage(MeetingSocketEvent.JOIN_CONTROL_ROOM)
  handleJoinMeetingControlRoom(
    @MessageBody() data: { meetingId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.meetingId) return;

    client.join(getMeetingHostRoom(data.meetingId));
    client.join(getMeetingUserRoom(data.meetingId, userId));

    return {
      status: CHAT_RESPONSE_STATUS.JOINED,
      meetingId: data.meetingId,
    };
  }

  @SubscribeMessage(ChatEvent.JOIN_CONVERSATION)
  handleJoinConversation(
    @MessageBody() data: { channelId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.channelId) {
      client.join(data.channelId);
      return {
        status: CHAT_RESPONSE_STATUS.JOINED,
        chatId: data.channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: data.channelId,
      };
    }
  }

  @SubscribeMessage(ChatEvent.JOIN_DIRECT_CONVERSATION)
  handleJoinDirectConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.conversationId) {
      client.join(data.conversationId);
      return {
        status: CHAT_RESPONSE_STATUS.JOINED,
        chatId: data.conversationId,
        chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
        conversationId: data.conversationId,
      };
    }
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
    const userId = client.data.userId;
    if (
      !userId ||
      !data.channelId ||
      (data.content === undefined &&
        (!data.medias || data.medias.length === 0) &&
        !data.pollData &&
        !data.noteData)
    ) {
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.INVALID_DATA,
      };
    }

    try {
      const message = await this.messageService.createMessage(
        data.channelId,
        userId,
        data.content || '',
        data.type || MessageType.TEXT,
        data.medias,
        data.pollData,
        data.noteData,
        data.threadParentId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );

      let threadFollowers: string[] = [];
      if (data.threadParentId) {
        threadFollowers = await this.messageService.getThreadFollowers(
          data.threadParentId,
        );
      }

      const messageWithUrls = {
        ...message,
        chatId: data.channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        medias: mapMediaWithUrl(message.medias),
        mentions: data.mentions,
        threadFollowers: data.threadParentId ? threadFollowers : undefined,
      };

      const targetRooms = [data.channelId, ...memberUserIds];
      this.server.to(targetRooms).emit(ChatEvent.NEW_MESSAGE, messageWithUrls);

      if (data.medias && data.medias.length > 0) {
        this.server.to(targetRooms).emit(ChatEvent.MEDIA_UPDATED, {
          chatId: data.channelId,
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
          channelId: data.channelId,
          messageId: message.id,
          media: messageWithUrls.medias,
        });
      }

      if (data.pollData && messageWithUrls.poll) {
        this.server.to(targetRooms).emit(ChatEvent.POLL_UPDATED, {
          chatId: data.channelId,
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
          channelId: data.channelId,
          messageId: message.id,
          poll: messageWithUrls.poll,
        });
      }

      if (data.noteData && messageWithUrls.note) {
        this.server.to(targetRooms).emit(ChatEvent.NOTE_UPDATED, {
          chatId: data.channelId,
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
          channelId: data.channelId,
          messageId: message.id,
          note: messageWithUrls.note,
        });
      }

      return { status: CHAT_RESPONSE_STATUS.SUCCESS, data: messageWithUrls };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.SEND_FAILED,
      };
    }
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
    const userId = client.data.userId;
    if (
      !userId ||
      !data.conversationId ||
      (data.content === undefined && (!data.medias || data.medias.length === 0))
    ) {
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.INVALID_DATA,
      };
    }

    try {
      const message = await this.directMessageService.createDirectMessage(
        data.conversationId,
        userId,
        data.content || '',
        data.type || MessageType.TEXT,
        data.medias,
        data.threadParentId,
      );

      const memberUserIds =
        await this.directMessageService.getDirectConversationMemberIds(
          data.conversationId,
        );

      let threadFollowers: string[] = [];
      if (data.threadParentId) {
        threadFollowers =
          await this.directMessageService.getDirectThreadFollowers(
            data.threadParentId,
          );
      }

      const messageWithUrls = {
        ...message,
        chatId: data.conversationId,
        chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
        medias: mapMediaWithUrl(message.medias),
        mentions: data.mentions,
        threadFollowers: data.threadParentId ? threadFollowers : undefined,
      };

      const targetRooms = [data.conversationId, ...memberUserIds];
      this.server.to(targetRooms).emit(ChatEvent.NEW_MESSAGE, messageWithUrls);

      if (data.medias && data.medias.length > 0) {
        this.server.to(targetRooms).emit(ChatEvent.MEDIA_UPDATED, {
          chatId: data.conversationId,
          chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
          conversationId: data.conversationId,
          messageId: message.id,
          media: messageWithUrls.medias,
        });
      }

      return { status: CHAT_RESPONSE_STATUS.SUCCESS, data: messageWithUrls };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.SEND_FAILED,
      };
    }
  }

  async sendSystemMessage(channelId: string, userId: string, content: string) {
    try {
      const message = await this.messageService.createMessage(
        channelId,
        userId,
        content,
        MessageType.SYSTEM,
      );

      const memberUserIds =
        await this.messageService.getConversationMemberIds(channelId);

      const messageWithUrls = {
        ...message,
        chatId: channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        medias: [],
      };

      const targetRooms = [channelId, ...memberUserIds];
      this.server.to(targetRooms).emit(ChatEvent.NEW_MESSAGE, messageWithUrls);
      return { status: CHAT_RESPONSE_STATUS.SUCCESS, data: messageWithUrls };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.SYSTEM_SEND_FAILED,
      };
    }
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
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId || !data.emoji) return;

    try {
      let finalAction = data.action;
      let finalEmoji = data.emoji;

      if (data.action === CHAT_REACTION_ACTION.ADD) {
        const result = await this.messageService.addReaction(
          data.messageId,
          userId,
          data.emoji,
        );
        finalAction = result.action as any;
        finalEmoji = result.emoji;
      } else {
        await this.messageService.removeReaction(
          data.messageId,
          userId,
          data.emoji,
        );
      }

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      this.server.to(targetRooms).emit(ChatEvent.REACTION_UPDATED, {
        chatId: data.channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: data.channelId,
        messageId: data.messageId,
        userId,
        emoji: finalEmoji,
        action: finalAction,
      });
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.REACTION_FAILED,
      };
    }
  }

  @SubscribeMessage(ChatEvent.VOTE_POLL)
  async handleVotePoll(
    @MessageBody()
    data: { channelId: string; messageId: string; pollOptionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId || !data.pollOptionId)
      return;

    try {
      const updatedMessage = await this.pollService.votePoll(
        data.channelId,
        data.messageId,
        data.pollOptionId,
        userId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      this.server.to(targetRooms).emit(ChatEvent.MESSAGE_MOVED, {
        ...updatedMessage,
        chatId: data.channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: data.channelId,
      });
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.POLL_VOTE_FAILED,
      };
    }
  }

  @SubscribeMessage(ChatEvent.ADD_POLL_OPTION)
  async handleAddPollOption(
    @MessageBody()
    data: { channelId: string; messageId: string; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId || !data.text) return;

    try {
      const updatedMessage = await this.pollService.addPollOption(
        data.channelId,
        data.messageId,
        data.text,
        userId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      this.server.to(targetRooms).emit(ChatEvent.MESSAGE_MOVED, {
        ...updatedMessage,
        chatId: data.channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: data.channelId,
      });
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.POLL_ADD_OPTION_FAILED,
      };
    }
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
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId || !data.title) return;

    try {
      const updatedMessage = await this.pollService.updatePoll(
        data.channelId,
        data.messageId,
        data.title,
        data.multipleChoice,
        data.allowAddOptions,
        userId,
        data.anonymous,
        data.isLocked,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      this.server.to(targetRooms).emit(ChatEvent.MESSAGE_MOVED, {
        ...updatedMessage,
        chatId: data.channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: data.channelId,
      });
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.POLL_EDIT_FAILED,
      };
    }
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
    const userId = client.data.userId;
    if (
      !userId ||
      !data.messageId ||
      !data.channelId ||
      !data.title ||
      !data.content
    )
      return;

    try {
      const updatedMessage = await this.noteService.updateNote(
        data.channelId,
        data.messageId,
        data.title,
        data.content,
        userId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      this.server.to(targetRooms).emit(ChatEvent.MESSAGE_MOVED, {
        ...updatedMessage,
        chatId: data.channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: data.channelId,
      });
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.NOTE_EDIT_FAILED,
      };
    }
  }

  @SubscribeMessage(ChatEvent.EDIT_MESSAGE)
  async handleEditMessage(
    @MessageBody()
    data: { channelId: string; messageId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (
      !userId ||
      !data.messageId ||
      !data.channelId ||
      data.content === undefined
    )
      return;

    try {
      const updatedMessage = await this.messageService.editMessage(
        data.messageId,
        data.content,
        userId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      this.server
        .to(targetRooms)
        .emit(ChatEvent.MESSAGE_UPDATED, updatedMessage);
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.MESSAGE_EDIT_FAILED,
      };
    }
  }

  @SubscribeMessage(ChatEvent.RECALL_MESSAGE)
  async handleRecallMessage(
    @MessageBody() data: { channelId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId) return;

    try {
      const updatedMessage = await this.messageService.recallMessage(
        data.messageId,
        userId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      this.server
        .to(targetRooms)
        .emit(ChatEvent.MESSAGE_UPDATED, updatedMessage);
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.MESSAGE_RECALL_FAILED,
      };
    }
  }

  @SubscribeMessage(ChatEvent.READ_MESSAGE)
  async handleReadMessage(
    @MessageBody() data: { channelId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId) return;

    try {
      const readReceipt = await this.messageService.markConversationAsRead(
        data.channelId,
        userId,
        data.messageId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      this.server.to(targetRooms).emit(ChatEvent.MESSAGE_READ, {
        chatId: data.channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: data.channelId,
        messageId: data.messageId,
        userId,
        readAt: readReceipt.lastReadAt,
      });
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.READ_RECEIPT_FAILED,
      };
    }
  }

  @SubscribeMessage(ChatEvent.READ_DIRECT_MESSAGE)
  async handleReadDirectMessage(
    @MessageBody()
    data: { conversationId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.conversationId) return;

    try {
      const readReceipt =
        await this.directMessageService.markDirectConversationAsRead(
          data.conversationId,
          userId,
          data.messageId,
        );

      const memberUserIds =
        await this.directMessageService.getDirectConversationMemberIds(
          data.conversationId,
        );
      const targetRooms = [data.conversationId, ...memberUserIds];

      this.server.to(targetRooms).emit(ChatEvent.MESSAGE_READ, {
        chatId: data.conversationId,
        chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
        conversationId: data.conversationId,
        messageId: data.messageId,
        userId,
        readAt: readReceipt.lastReadAt,
      });
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.READ_RECEIPT_FAILED,
      };
    }
  }

  @SubscribeMessage(ChatEvent.TYPING)
  async handleTyping(
    @MessageBody() data: { channelId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.channelId) return;

    try {
      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      this.server.to(targetRooms).emit(ChatEvent.TYPING, {
        chatId: data.channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: data.channelId,
        userId,
        isTyping: data.isTyping,
      });
    } catch (error) {
      console.error(error);
    }
  }

  @SubscribeMessage(ChatEvent.TYPING_DIRECT)
  async handleDirectTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.conversationId) return;

    try {
      const memberUserIds =
        await this.directMessageService.getDirectConversationMemberIds(
          data.conversationId,
        );
      const targetRooms = [data.conversationId, ...memberUserIds];

      this.server.to(targetRooms).emit(ChatEvent.TYPING, {
        chatId: data.conversationId,
        chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
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

  emitMeetingJoinRequested(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ) {
    const payload: MeetingJoinRequestPayload = {
      meetingId,
      userId,
      participant,
    };
    this.server
      .to(getMeetingHostRoom(meetingId))
      .emit(MeetingSocketEvent.JOIN_REQUESTED, payload);
  }

  emitMeetingJoinApproved(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ) {
    const payload: MeetingJoinDecisionPayload = {
      meetingId,
      userId,
      participant,
    };
    this.server
      .to(getMeetingUserRoom(meetingId, userId))
      .emit(MeetingSocketEvent.JOIN_APPROVED, payload);
  }

  emitMeetingJoinRejected(
    meetingId: string,
    userId: string,
    participant: MeetingParticipantPayload,
  ) {
    const payload: MeetingJoinDecisionPayload = {
      meetingId,
      userId,
      participant,
    };
    this.server
      .to(getMeetingUserRoom(meetingId, userId))
      .emit(MeetingSocketEvent.JOIN_REJECTED, payload);
  }

  emitMeetingAccessUpdated(
    meetingId: string,
    allowJoinWithoutApproval: boolean,
  ) {
    const payload: MeetingAccessUpdatedPayload = {
      meetingId,
      allowJoinWithoutApproval,
    };
    this.server
      .to(getMeetingHostRoom(meetingId))
      .emit(MeetingSocketEvent.ACCESS_UPDATED, payload);
  }

  @SubscribeMessage(ChatEvent.PIN_MESSAGE)
  async handlePinMessage(
    @MessageBody() data: { channelId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId) return;

    try {
      const updatedMessage = await this.messageService.pinMessage(
        data.messageId,
        userId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      const messageWithUrls = {
        ...updatedMessage,
        medias: mapMediaWithUrl(updatedMessage.medias),
      };

      this.server
        .to(targetRooms)
        .emit(ChatEvent.MESSAGE_PINNED, messageWithUrls);
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: error.message || CHAT_ERROR_MESSAGES.PIN_FAILED,
      };
    }
  }

  @SubscribeMessage(ChatEvent.UNPIN_MESSAGE)
  async handleUnpinMessage(
    @MessageBody() data: { channelId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId) return;

    try {
      const updatedMessage = await this.messageService.unpinMessage(
        data.messageId,
        userId,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        data.channelId,
      );
      const targetRooms = [data.channelId, ...memberUserIds];

      const messageWithUrls = {
        ...updatedMessage,
        medias: mapMediaWithUrl(updatedMessage.medias),
      };

      this.server
        .to(targetRooms)
        .emit(ChatEvent.MESSAGE_UNPINNED, messageWithUrls);
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: error.message || CHAT_ERROR_MESSAGES.UNPIN_FAILED,
      };
    }
  }
}
