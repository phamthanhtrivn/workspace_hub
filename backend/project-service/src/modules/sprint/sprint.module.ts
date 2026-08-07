import { Module } from '@nestjs/common';
import { SprintController } from './controllers/sprint.controller';
import { SprintService } from './services/sprint.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule, RealtimeModule],
  controllers: [SprintController],
  providers: [SprintService],
  exports: [SprintService],
})
export class SprintModule {}
