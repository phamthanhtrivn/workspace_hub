import { Module } from '@nestjs/common';
import { HttpJsonClient } from '../../common/adapters/http-json.client';
import { PrismaModule } from '../../prisma/prisma.module';
import { DirectMessagePermissionService } from './direct-message-permission.service';
import { UserDirectMessageSettingsClient } from './user-direct-message-settings.client';

@Module({
  imports: [PrismaModule],
  providers: [HttpJsonClient, UserDirectMessageSettingsClient, DirectMessagePermissionService],
  exports: [DirectMessagePermissionService],
})
export class DirectMessagePermissionModule {}
