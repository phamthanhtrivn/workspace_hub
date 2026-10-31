import { PomodoroConfigService } from './pomodoro-config.service';
import { PomodoroTimerService } from './pomodoro-timer.service';
import { PomodoroStatisticsService } from './pomodoro-statistics.service';
import { PomodoroSessionService } from './pomodoro-session.service';
import { Module } from '@nestjs/common';
import { PomodoroController } from './pomodoro.controller';
import { PomodoroService } from './pomodoro.service';

@Module({
  controllers: [PomodoroController],
  providers: [
    PomodoroService,
    PomodoroConfigService,
    PomodoroTimerService,
    PomodoroStatisticsService,
    PomodoroSessionService,
  ],
})
export class PomodoroModule {}
