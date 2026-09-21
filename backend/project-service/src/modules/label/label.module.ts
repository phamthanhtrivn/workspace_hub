import { Module, forwardRef } from '@nestjs/common';
import { LabelController } from './label.controller';
import { LabelService } from './label.service';
import { ProjectModule } from '../project/project.module';
import { ActivityModule } from '../activity/activity.module';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [
    forwardRef(() => ProjectModule),
    forwardRef(() => ActivityModule),
    forwardRef(() => TaskModule),
  ],
  controllers: [LabelController],
  providers: [LabelService],
  exports: [LabelService],
})
export class LabelModule {}
