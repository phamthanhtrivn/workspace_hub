import { Module } from '@nestjs/common';
import { CommentController } from './controllers/comment.controller';
import { InvitationController } from './controllers/invitation.controller';
import { MemberController } from './controllers/member.controller';
import { ProjectController } from './controllers/project.controller';
import { TaskController } from './controllers/task.controller';
import { SprintController } from './controllers/sprint.controller';
import { ChecklistController } from './controllers/checklist.controller';
import { LabelController } from './controllers/label.controller';
import { ActivityController } from './controllers/activity.controller';
import { DependencyController } from './controllers/dependency.controller';
import { ProjectAccessService } from './services/project-access.service';
import { ProjectService } from './services/project.service';
import { MemberService } from './services/member.service';
import { InvitationService } from './services/invitation.service';
import { TaskService } from './services/task.service';
import { CommentService } from './services/comment.service';
import { InvitationEmailService } from './services/invitation-email.service';
import { SprintService } from './services/sprint.service';
import { ChecklistService } from './services/checklist.service';
import { LabelService } from './services/label.service';
import { ActivityService } from './services/activity.service';
import { NotificationEventService } from './services/notification-event.service';
import { DependencyService } from './services/dependency.service';
import { ProjectGateway } from './events/project.gateway';

@Module({
  controllers: [
    ProjectController,
    MemberController,
    InvitationController,
    TaskController,
    CommentController,
    SprintController,
    ChecklistController,
    LabelController,
    ActivityController,
    DependencyController,
  ],
  providers: [
    ProjectAccessService,
    ProjectService,
    MemberService,
    InvitationService,
    TaskService,
    CommentService,
    InvitationEmailService,
    SprintService,
    ChecklistService,
    LabelService,
    ActivityService,
    NotificationEventService,
    DependencyService,
    ProjectGateway,
  ],
  exports: [ProjectGateway],
})
export class ProjectModule {}
