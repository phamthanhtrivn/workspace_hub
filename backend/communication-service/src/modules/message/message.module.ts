import { Module } from '@nestjs/common';
import { MessageController } from './controllers/message.controller';
import { NoteController } from './controllers/note.controller';
import { PollController } from './controllers/poll.controller';
import { MediaController } from './controllers/media.controller';

import { MessageService } from './services/message.service';
import { NoteService } from './services/note.service';
import { PollService } from './services/poll.service';

import { PrismaModule } from '../../prisma/prisma.module';
import { S3Module } from '../../infrastructure/s3/s3.module';

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [
    MessageController,
    NoteController,
    PollController,
    MediaController,
  ],
  providers: [MessageService, NoteService, PollService],
  exports: [MessageService, NoteService, PollService],
})
export class MessageModule {}
