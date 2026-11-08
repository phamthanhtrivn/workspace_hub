import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';
import { DOCUMENT_CHAT_SHARING } from '../types/document-chat-sharing.constants';

export class PrepareChatShareDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(DOCUMENT_CHAT_SHARING.MAX_RECIPIENTS)
  @IsUUID('all', { each: true })
  recipientUserIds: string[];
}
