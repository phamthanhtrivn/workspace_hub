import { Module } from '@nestjs/common';
import { PomodoroController } from './pomodoro.controller';
import { PomodoroService } from './pomodoro.service';

@Module({ controllers: [PomodoroController], providers: [PomodoroService] })
export class PomodoroModule {}
