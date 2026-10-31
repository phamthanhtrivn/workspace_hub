import { Injectable } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { MessageService } from './message.service';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';

@Injectable()
export class SystemMessageService {
  constructor(
    private readonly messageService: MessageService,
    private readonly publisher: ChatSocketPublisher,
  ) {}
  async sendSystemMessage(
    channelId: string,
    userId: string,
    content: string,
  ): Promise<Record<string, unknown> & { id: string }> {
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

    await this.publisher.publishChannelMessageCreated(
      channelId,
      messageWithUrls,
    );
    return messageWithUrls;
  }
}
