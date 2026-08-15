import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';

import { MessageService } from './message.service';

import { PrismaModule } from '../../prisma/prisma.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { UserProfileSnapshotModule } from '../user-profile-snapshot/user-profile-snapshot.module';

@Module({
  imports: [PrismaModule, S3Module, UserProfileSnapshotModule],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
