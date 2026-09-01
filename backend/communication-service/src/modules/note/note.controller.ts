import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Query,
  Body,
  Patch,
} from '@nestjs/common';
import { NoteService } from './note.service';
import { NOTE_ERROR_MESSAGES } from './types/note.enums';

@Controller('api/notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Get(':channelId')
  async getNotesInConversation(
    @Param('channelId') channelId: string,
    @Headers('x-user-id') userId: string,
    @Query('q') q?: string,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException(
        NOTE_ERROR_MESSAGES.MISSING_USER_OR_CHANNEL_ID,
      );
    }

    return this.noteService.getNotesInConversation(channelId, userId, q);
  }

  @Patch(':channelId/messages/:messageId')
  async updateNote(
    @Param('channelId') channelId: string,
    @Param('messageId') messageId: string,
    @Headers('x-user-id') userId: string,
    @Body() data: { title: string; content: string },
  ) {
    if (!userId || !channelId || !messageId || !data.title || !data.content) {
      throw new BadRequestException(NOTE_ERROR_MESSAGES.MISSING_REQUIRED_DATA);
    }

    return this.noteService.updateNoteAndPublish(
      channelId,
      messageId,
      data.title,
      data.content,
      userId,
    );
  }
}
