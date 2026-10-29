import {
  Body,
  Controller,
  Headers,
  Module,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { WorkAssistantService } from './work-assistant.service';
export class CalendarContextDto {
  @IsUUID() userId!: string;
  @IsOptional() @IsUUID() projectId?: string;
  @IsDateString() from!: string;
  @IsDateString() to!: string;
  @IsDateString() windowStart!: string;
  @IsDateString() windowEnd!: string;
  @IsDateString() todayEnd!: string;
}
export function requireAssistantKey(key: string | undefined) {
  const expected = process.env.WORK_ASSISTANT_SERVICE_KEY || '';
  if (expected.length < 32)
    throw new ServiceUnavailableException('Work assistant is not configured');
  if (
    typeof key !== 'string' ||
    Buffer.byteLength(key) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(key), Buffer.from(expected))
  )
    throw new UnauthorizedException();
}
@Controller('internal/work-assistant')
export class WorkAssistantController {
  constructor(private readonly service: WorkAssistantService) {}
  @Post('context')
  async context(
    @Headers('x-internal-service-key') key: string,
    @Body() body: CalendarContextDto,
  ) {
    requireAssistantKey(key);
    return {
      message: 'Work context loaded',
      data: await this.service.context(body),
    };
  }
}
@Module({
  controllers: [WorkAssistantController],
  providers: [WorkAssistantService],
})
export class WorkAssistantModule {}
