import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiResponse } from '../../common/utils/api-response';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { AttachTaskDocumentsDto } from './dto/attach-task-documents.dto';
import { GetProjectTasksQueryDto } from './dto/get-project-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskService } from './task.service';

@Controller('api')
export class TaskController {
  constructor(private readonly tasks: TaskService) {}

  @Post('projects/:projectId/tasks')
  async create(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return ApiResponse.success(await this.tasks.create(userId, projectId, dto), 'Task created successfully');
  }

  @Get('projects/:projectId/tasks/status-counts')
  async statusCounts(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ) {
    return ApiResponse.success(await this.tasks.statusCounts(userId, projectId), 'Task status counts loaded successfully');
  }

  @Get('projects/:projectId/tasks')
  async findAll(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Query() query: GetProjectTasksQueryDto,
  ) {
    const result = await this.tasks.findAll(userId, projectId, query);
    return ApiResponse.success(result.items, 'Tasks loaded successfully', result.pagination);
  }

  @Get('tasks/:taskId')
  async findOne(
    @CurrentUserId() userId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
  ) {
    return ApiResponse.success(await this.tasks.findOne(userId, taskId), 'Task loaded successfully');
  }

  @Get('tasks/:taskId/documents')
  async listDocuments(
    @CurrentUserId() userId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
  ) {
    return ApiResponse.success(
      await this.tasks.listDocuments(userId, taskId),
      'Task documents loaded successfully',
    );
  }

  @Post('tasks/:taskId/documents')
  async attachDocuments(
    @CurrentUserId() userId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() dto: AttachTaskDocumentsDto,
  ) {
    return ApiResponse.success(
      await this.tasks.attachDocuments(userId, taskId, dto),
      'Task documents attached successfully',
    );
  }

  @Delete('tasks/:taskId/documents/:attachmentId')
  async detachDocument(
    @CurrentUserId() userId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Param('attachmentId', new ParseUUIDPipe()) attachmentId: string,
  ) {
    return ApiResponse.success(
      await this.tasks.detachDocument(userId, taskId, attachmentId),
      'Task document detached successfully',
    );
  }

  @Patch('tasks/:taskId')
  async update(
    @CurrentUserId() userId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return ApiResponse.success(await this.tasks.update(userId, taskId, dto), 'Task updated successfully');
  }

  @Delete('tasks/:taskId')
  async delete(
    @CurrentUserId() userId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
  ) {
    await this.tasks.delete(userId, taskId);
    return ApiResponse.success(null, 'Task deleted successfully');
  }
}
