import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { InvitationController } from './invitation.controller';
import { MemberController } from './member.controller';
import { ProjectController } from './project.controller';
import { ProjectAccessService } from './project-access.service';
import { ProjectService } from './project.service';
import { MemberService } from './member.service';
import { InvitationService } from './invitation.service';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { CommentService } from './comment.service';
import { InvitationEmailService } from './invitation-email.service';
import { SprintController } from './sprint.controller';
import { SprintService } from './sprint.service';
import { ChecklistController } from './checklist.controller';
import { ChecklistService } from './checklist.service';
import { LabelController } from './label.controller';
import { LabelService } from './label.service';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { NotificationEventService } from './notification-event.service';
import { DependencyController } from './dependency.controller';
import { DependencyService } from './dependency.service';

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
  ],
})
export class ProjectModule {}
