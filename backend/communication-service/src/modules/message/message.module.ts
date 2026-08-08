import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { NoteController } from '../note/note.controller';

import { MessageService } from './message.service';

import { PrismaModule } from '../../prisma/prisma.module';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { NoteService } from '../note/note.service';
import { PollService } from '../poll/poll.service';
import { PollController } from '../poll/poll.controller';
import { MediaController } from '../media/media.controller';

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
