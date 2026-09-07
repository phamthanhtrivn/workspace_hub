import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import {
  CHAT_ERROR_MESSAGES,
  CHAT_REACTION_ACTION,
  CHAT_RESPONSE_STATUS,
} from '../../../../common/types/chat.enums';
import { MessageService } from '../../../message/message.service';
import { NoteService } from '../../../note/note.service';
import { PollService } from '../../../poll/poll.service';
import { ChatSocketPublisher } from '../chat-socket.publisher';

@Injectable()
export class ChatMessageInteractionHandler {
  constructor(
    private readonly messageService: MessageService,
    private readonly pollService: PollService,
    private readonly noteService: NoteService,
    private readonly chatSocketPublisher: ChatSocketPublisher,
  ) {}

  async handleReactMessage(
    data: {
      channelId: string;
      messageId: string;
      emoji: string;
      action: CHAT_REACTION_ACTION.ADD | CHAT_REACTION_ACTION.REMOVE;
    },
    client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId || !data.messageId || !data.channelId || !data.emoji) return;

    try {
      let finalAction: string | CHAT_REACTION_ACTION = data.action;
      let finalEmoji = data.emoji;

      if (data.action === CHAT_REACTION_ACTION.ADD) {
        const result = await this.messageService.addReaction(
          data.messageId,
          userId,
          data.emoji,
        );
        finalAction = result.action;
        finalEmoji = result.emoji;
      } else {
        await this.messageService.removeReaction(
          data.messageId,
          userId,
          data.emoji,
        );
      }

      await this.chatSocketPublisher.publishChannelReactionUpdated(
        data.channelId,
        {
          messageId: data.messageId,
          userId,
          emoji: finalEmoji,
          action: finalAction,
        },
      );
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.REACTION_FAILED,
      };
    }
  }

  async handleVotePoll(
    data: { channelId: string; messageId: string; pollOptionId: string },
    client: Socket,
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

      await this.chatSocketPublisher.publishMessageMoved(
        data.channelId,
        updatedMessage,
      );
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.POLL_VOTE_FAILED,
      };
    }
  }

  async handleAddPollOption(
    data: { channelId: string; messageId: string; text: string },
    client: Socket,
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

      await this.chatSocketPublisher.publishMessageMoved(
        data.channelId,
        updatedMessage,
      );
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.POLL_ADD_OPTION_FAILED,
      };
    }
  }

  async handleEditPoll(
    data: {
      channelId: string;
      messageId: string;
      title: string;
      multipleChoice: boolean;
      allowAddOptions: boolean;
      anonymous?: boolean;
      isLocked?: boolean;
    },
    client: Socket,
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

      await this.chatSocketPublisher.publishMessageMoved(
        data.channelId,
        updatedMessage,
      );
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.POLL_EDIT_FAILED,
      };
    }
  }

  async handleEditNote(
    data: {
      channelId: string;
      messageId: string;
      title: string;
      content: string;
    },
    client: Socket,
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

      await this.chatSocketPublisher.publishMessageMoved(
        data.channelId,
        updatedMessage,
      );
      return { status: CHAT_RESPONSE_STATUS.SUCCESS };
    } catch (error) {
      console.error(error);
      return {
        status: CHAT_RESPONSE_STATUS.ERROR,
        message: CHAT_ERROR_MESSAGES.NOTE_EDIT_FAILED,
      };
    }
  }
}
