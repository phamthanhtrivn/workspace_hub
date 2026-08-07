import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { MemberModule } from './modules/member/member.module';
import { ProjectModule } from './modules/project/project.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { SharedModule } from './modules/shared/shared.module';
import { SprintModule } from './modules/sprint/sprint.module';
import { TaskModule } from './modules/task/task.module';

@Module({
  imports: [
    PrismaModule,
    SharedModule,
    RealtimeModule,
    ProjectModule,
    TaskModule,
    SprintModule,
    MemberModule,
    InvitationModule,
  ],
})
export class AppModule {}
