import { Body, Controller, Delete, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { ChecklistService } from './checklist.service';

@Controller('api')
export class ChecklistController {
  constructor(private readonly checklists: ChecklistService) {}

  @Post('tasks/:taskId/checklists')
  async create(
    @CurrentUserId() userId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() dto: CreateChecklistDto,
  ) {
    return ApiResponse.success(await this.checklists.create(userId, taskId, dto), 'Checklist item created successfully');
  }

  @Patch('checklists/:checklistId')
  async update(
    @CurrentUserId() userId: string,
    @Param('checklistId', new ParseUUIDPipe()) checklistId: string,
    @Body() dto: UpdateChecklistDto,
  ) {
    return ApiResponse.success(await this.checklists.update(userId, checklistId, dto), 'Checklist item updated successfully');
  }

  @Delete('checklists/:checklistId')
  async remove(
    @CurrentUserId() userId: string,
    @Param('checklistId', new ParseUUIDPipe()) checklistId: string,
  ) {
    return ApiResponse.success(await this.checklists.remove(userId, checklistId), 'Checklist item deleted successfully');
  }
}
