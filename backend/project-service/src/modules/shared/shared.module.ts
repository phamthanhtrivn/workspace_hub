import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationEventService } from './notification-event.service';
import { ProjectAccessService } from './project-access.service';

@Module({
  imports: [PrismaModule],
  providers: [ProjectAccessService, NotificationEventService],
  exports: [PrismaModule, ProjectAccessService, NotificationEventService],
})
export class SharedModule {}
