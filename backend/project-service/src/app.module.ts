import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtIdentityGuard } from "./common/auth/jwt-identity.guard";
import { RuntimeConfigModule } from "./common/config/runtime-config.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { ProjectKafkaModule } from "./infrastructure/kafka/project-kafka.module";
import { HealthController } from "./common/health.controller";

import { ActivityModule } from "./modules/activity/activity.module";
import { ChecklistModule } from "./modules/checklist/checklist.module";
import { CommentModule } from "./modules/comment/comment.module";
import { DependencyModule } from "./modules/dependency/dependency.module";
import { InvitationModule } from "./modules/invitation/invitation.module";
import { LabelModule } from "./modules/label/label.module";
import { MemberModule } from "./modules/member/member.module";
import { NotificationOutboxModule } from "./modules/notification-outbox/notification-outbox.module";
import { ProjectModule } from "./modules/project/project.module";
import { SocketModule } from "./modules/socket/socket.module";
import { TaskModule } from "./modules/task/task.module";
import { UserProfileSnapshotModule } from "./modules/user-profile-snapshot/user-profile-snapshot.module";

@Module({
  imports: [
    RuntimeConfigModule,
    PrismaModule,
    ProjectKafkaModule,
    UserProfileSnapshotModule,
    SocketModule,
    ProjectModule,
    ActivityModule,
    ChecklistModule,
    CommentModule,
    DependencyModule,
    InvitationModule,
    LabelModule,
    MemberModule,
    NotificationOutboxModule,
    TaskModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtIdentityGuard }],
})
export class AppModule {}
