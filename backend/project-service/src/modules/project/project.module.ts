import { Module } from '@nestjs/common';
import { ProjectController } from './controllers/project.controller';
import { ProjectService } from './services/project.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule, RealtimeModule],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
