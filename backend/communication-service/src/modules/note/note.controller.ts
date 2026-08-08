import { Controller, Get, Param } from '@nestjs/common';
import { NoteService } from './note.service';

@Controller('api/notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Get(':channelId')
  async getNotesInConversation(@Param('channelId') channelId: string) {
    return this.noteService.getNotesInConversation(channelId);
  }
}
