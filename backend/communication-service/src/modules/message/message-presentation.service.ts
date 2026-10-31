import { Injectable } from '@nestjs/common';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { mapMediaWithUrl } from '../../common/utils/file.util';

@Injectable()
export class MessagePresentationService {
  constructor() {}
  mapChannelMessagePayload<
    T extends { channelId: string; medias?: { s3Key: string }[] },
  >(message: T) {
    return {
      ...message,
      chatId: message.channelId,
      chatType: CHAT_CONTEXT_TYPE.CHANNEL,
      channelId: message.channelId,
      medias: mapMediaWithUrl(message.medias ?? []),
    };
  }
}
