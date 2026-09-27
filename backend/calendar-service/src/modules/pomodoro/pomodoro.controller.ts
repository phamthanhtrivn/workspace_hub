import { BadRequestException, Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { CreatePomodoroSessionDto } from './dto/create-pomodoro-session.dto';
import { GetPomodoroSessionsQueryDto } from './dto/get-pomodoro-sessions-query.dto';
import { PomodoroService } from './pomodoro.service';

@Controller('api/calendar/pomodoro/sessions')
export class PomodoroController {
  constructor(private readonly service: PomodoroService) {}

  @Post()
  async create(@Headers('x-user-id') userId: string, @Body() dto: CreatePomodoroSessionDto) {
    this.requireUser(userId);
    return { data: await this.service.create(userId, dto) };
  }

  @Get()
  async list(@Headers('x-user-id') userId: string, @Query() query: GetPomodoroSessionsQueryDto) {
    this.requireUser(userId);
    return { data: await this.service.list(userId, query) };
  }

  private requireUser(userId: string) {
    if (!userId) throw new BadRequestException('Missing user ID');
  }
}
