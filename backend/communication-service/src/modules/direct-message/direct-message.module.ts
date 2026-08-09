import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { DirectMessageController } from './direct-message.controller';
import { DirectMessageService } from './direct-message.service';

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [DirectMessageController],
  providers: [DirectMessageService],
  exports: [DirectMessageService],
})
export class DirectMessageModule {}
