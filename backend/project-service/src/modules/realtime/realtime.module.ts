import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ProjectGateway } from './project.gateway';

@Module({
  imports: [SharedModule],
  providers: [ProjectGateway],
  exports: [ProjectGateway],
})
export class RealtimeModule {}
