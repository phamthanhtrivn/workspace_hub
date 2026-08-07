import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUserId } from '../../../common/decorators/current-user-id.decorator';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskService } from '../services/task.service';

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
  ) {
    return ApiResponse.success(await this.tasks.findAll(userId, projectId), 'Tasks loaded successfully');
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
