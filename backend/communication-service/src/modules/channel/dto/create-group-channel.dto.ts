import { IsNotEmpty, IsOptional, IsString, IsArray, IsUUID } from 'class-validator';

export class CreateGroupConversationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty()
  participantIds: string[];
}
