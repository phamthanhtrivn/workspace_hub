import { forwardRef, Module } from '@nestjs/common';
import { ChecklistController } from './checklist.controller';
import { ChecklistService } from './checklist.service';
import { ActivityModule } from '../activity/activity.module';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [ActivityModule, forwardRef(() => TaskModule)],
  controllers: [ChecklistController],
  providers: [ChecklistService],
  exports: [ChecklistService],
})
export class ChecklistModule {}
