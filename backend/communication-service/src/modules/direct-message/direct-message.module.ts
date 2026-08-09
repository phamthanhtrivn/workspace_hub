import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DirectMessageController } from './direct-message.controller';
import { DirectMessageService } from './direct-message.service';

@Module({
  imports: [PrismaModule],
  controllers: [DirectMessageController],
  providers: [DirectMessageService],
  exports: [DirectMessageService],
})
export class DirectMessageModule {}
