import { forwardRef, Module } from '@nestjs/common';
import { DependencyController } from './dependency.controller';
import { DependencyService } from './dependency.service';
import { ProjectModule } from '../project/project.module';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [forwardRef(() => ProjectModule), forwardRef(() => TaskModule)],
  controllers: [DependencyController],
  providers: [DependencyService],
  exports: [DependencyService],
})
export class DependencyModule {}
