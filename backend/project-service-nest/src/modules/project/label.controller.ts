import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { LabelService } from './label.service';

@Controller('api')
export class LabelController {
  constructor(private readonly labels: LabelService) {}

  @Get('projects/:projectId/labels')
  async list(@CurrentUserId() userId: string, @Param('projectId', new ParseUUIDPipe()) projectId: string) {
    return ApiResponse.success(await this.labels.list(userId, projectId), 'Labels loaded successfully');
  }

  @Post('projects/:projectId/labels')
  async create(@CurrentUserId() userId: string, @Param('projectId', new ParseUUIDPipe()) projectId: string, @Body() dto: CreateLabelDto) {
    return ApiResponse.success(await this.labels.create(userId, projectId, dto), 'Label created successfully');
  }

  @Patch('labels/:labelId')
  async update(@CurrentUserId() userId: string, @Param('labelId', new ParseUUIDPipe()) labelId: string, @Body() dto: UpdateLabelDto) {
    return ApiResponse.success(await this.labels.update(userId, labelId, dto), 'Label updated successfully');
  }

  @Delete('labels/:labelId')
  async remove(@CurrentUserId() userId: string, @Param('labelId', new ParseUUIDPipe()) labelId: string) {
    return ApiResponse.success(await this.labels.remove(userId, labelId), 'Label deleted successfully');
  }

  @Post('tasks/:taskId/labels/:labelId')
  async attach(@CurrentUserId() userId: string, @Param('taskId', new ParseUUIDPipe()) taskId: string, @Param('labelId', new ParseUUIDPipe()) labelId: string) {
    return ApiResponse.success(await this.labels.attach(userId, taskId, labelId), 'Label attached successfully');
  }

  @Delete('tasks/:taskId/labels/:labelId')
  async detach(@CurrentUserId() userId: string, @Param('taskId', new ParseUUIDPipe()) taskId: string, @Param('labelId', new ParseUUIDPipe()) labelId: string) {
    return ApiResponse.success(await this.labels.detach(userId, taskId, labelId), 'Label detached successfully');
  }
}
