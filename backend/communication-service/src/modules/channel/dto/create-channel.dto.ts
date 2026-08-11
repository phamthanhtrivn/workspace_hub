import { IsNotEmpty, IsOptional, IsString, IsArray, IsUUID } from 'class-validator';

export class CreateChannelDto {
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
