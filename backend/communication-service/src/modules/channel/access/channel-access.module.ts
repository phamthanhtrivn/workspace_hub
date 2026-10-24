import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ChannelAccessService } from './channel-access.service';
import { PrivateChannelGuard } from './private-channel.guard';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    ChannelAccessService,
    { provide: APP_GUARD, useClass: PrivateChannelGuard },
  ],
  exports: [ChannelAccessService],
})
export class ChannelAccessModule {}
