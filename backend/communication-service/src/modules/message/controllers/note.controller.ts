import { Controller, Get, Param } from '@nestjs/common';
import { NoteService } from '../services/note.service';

@Controller('api/notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Get(':conversationId')
  async getNotesInConversation(
    @Param('conversationId') conversationId: string,
  ) {
    return this.noteService.getNotesInConversation(conversationId);
  }
}
