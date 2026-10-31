import { DirectMessageWithMedia } from './types/direct-message-payload.types';
import { Injectable } from '@nestjs/common';
import { mapMediaWithUrl } from '../../common/utils/file.util';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';

@Injectable()
export class DirectMessagePresentationService {
  constructor() {}
  mapDirectMessage(message: DirectMessageWithMedia) {
    return {
      ...message,
      chatId: message.conversationId,
      chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
      medias: mapMediaWithUrl(message.medias || []),
    };
  }
}
