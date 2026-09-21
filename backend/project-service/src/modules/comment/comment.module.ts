import { forwardRef, Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { ActivityModule } from '../activity/activity.module';
import { ProjectModule } from '../project/project.module';
import { TaskModule } from '../task/task.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';

@Module({
  imports: [
    ActivityModule,
    forwardRef(() => ProjectModule),
    forwardRef(() => TaskModule),
    UserProfileSnapshotModule,
  ],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
