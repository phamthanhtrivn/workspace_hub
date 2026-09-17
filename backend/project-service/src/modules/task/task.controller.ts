import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { PaginationQueryDto } from '../../common/pagination';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
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

  @Get('projects/:projectId/tasks')
  async findAll(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Query() query: PaginationQueryDto,
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
