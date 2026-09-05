import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MESSAGE_DIRECTION } from '../../message/types/message.enums';

export class ListMeetingMessagesDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsEnum(MESSAGE_DIRECTION)
  direction?: MESSAGE_DIRECTION;
}
