import { AttendeeResponseStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateEventResponseDto {
  @IsEnum(AttendeeResponseStatus)
  responseStatus: AttendeeResponseStatus;
}
