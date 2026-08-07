import { Module } from '@nestjs/common';
import { MemberController } from './controllers/member.controller';
import { MemberService } from './services/member.service';
import { ProjectModule } from '../project/project.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule, RealtimeModule, ProjectModule],
  controllers: [MemberController],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}
