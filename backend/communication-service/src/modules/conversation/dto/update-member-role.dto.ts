import { IsEnum } from 'class-validator';
import { ConversationRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsEnum(ConversationRole)
  role: ConversationRole;
}
