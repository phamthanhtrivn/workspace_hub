import { BadRequestException, Controller, Get, Headers, Param } from '@nestjs/common';
import { NoteService } from './note.service';
import { NOTE_ERROR_MESSAGES } from './types/note.enums';

@Controller('api/notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Get(':channelId')
  async getNotesInConversation(
    @Param('channelId') channelId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId || !channelId) {
      throw new BadRequestException(NOTE_ERROR_MESSAGES.MISSING_USER_OR_CHANNEL_ID);
    }

    return this.noteService.getNotesInConversation(channelId, userId);
  }
}
