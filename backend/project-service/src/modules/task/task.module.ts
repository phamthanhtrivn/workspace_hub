import { Module } from '@nestjs/common';
import { ActivityController } from './controllers/activity.controller';
import { ChecklistController } from './controllers/checklist.controller';
import { CommentController } from './controllers/comment.controller';
import { DependencyController } from './controllers/dependency.controller';
import { LabelController } from './controllers/label.controller';
import { TaskController } from './controllers/task.controller';
import { ActivityService } from './services/activity.service';
import { ChecklistService } from './services/checklist.service';
import { CommentService } from './services/comment.service';
import { DependencyService } from './services/dependency.service';
import { LabelService } from './services/label.service';
import { TaskService } from './services/task.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule, RealtimeModule],
  controllers: [
    TaskController,
    ChecklistController,
    CommentController,
    DependencyController,
    LabelController,
    ActivityController,
  ],
  providers: [
    TaskService,
    ChecklistService,
    CommentService,
    DependencyService,
    LabelService,
    ActivityService,
  ],
  exports: [TaskService],
})
export class TaskModule {}
