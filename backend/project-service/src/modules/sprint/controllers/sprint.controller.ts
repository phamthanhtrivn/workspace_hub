import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUserId } from '../../../common/decorators/current-user-id.decorator';
import { AddSprintTasksDto } from '../dto/add-sprint-tasks.dto';
import { CreateSprintDto } from '../dto/create-sprint.dto';
import { UpdateSprintDto } from '../dto/update-sprint.dto';
import { SprintService } from '../services/sprint.service';

@Controller('api')
export class SprintController {
  constructor(private readonly sprints: SprintService) {}

  @Get('projects/:projectId/sprints')
  async list(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ) {
    return ApiResponse.success(await this.sprints.list(userId, projectId), 'Sprints loaded successfully');
  }

  @Post('projects/:projectId/sprints')
  async create(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateSprintDto,
  ) {
    return ApiResponse.success(await this.sprints.create(userId, projectId, dto), 'Sprint created successfully');
  }

  @Post('sprints/:sprintId/tasks')
  async addTasks(
    @CurrentUserId() userId: string,
    @Param('sprintId', new ParseUUIDPipe()) sprintId: string,
    @Body() dto: AddSprintTasksDto,
  ) {
    return ApiResponse.success(await this.sprints.addTasks(userId, sprintId, dto), 'Tasks added to sprint successfully');
  }

  @Patch('sprints/:sprintId')
  async update(
    @CurrentUserId() userId: string,
    @Param('sprintId', new ParseUUIDPipe()) sprintId: string,
    @Body() dto: UpdateSprintDto,
  ) {
    return ApiResponse.success(await this.sprints.update(userId, sprintId, dto), 'Sprint updated successfully');
  }

  @Delete('sprints/:sprintId/tasks/:taskId')
  async removeTask(
    @CurrentUserId() userId: string,
    @Param('sprintId', new ParseUUIDPipe()) sprintId: string,
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
  ) {
    return ApiResponse.success(await this.sprints.removeTask(userId, sprintId, taskId), 'Task moved back to backlog');
  }

  @Patch('sprints/:sprintId/start')
  async start(
    @CurrentUserId() userId: string,
    @Param('sprintId', new ParseUUIDPipe()) sprintId: string,
  ) {
    return ApiResponse.success(await this.sprints.start(userId, sprintId), 'Sprint started successfully');
  }

  @Patch('sprints/:sprintId/complete')
  async complete(
    @CurrentUserId() userId: string,
    @Param('sprintId', new ParseUUIDPipe()) sprintId: string,
  ) {
    return ApiResponse.success(await this.sprints.complete(userId, sprintId), 'Sprint completed successfully');
  }

  @Patch('sprints/:sprintId/reopen')
  async reopen(
    @CurrentUserId() userId: string,
    @Param('sprintId', new ParseUUIDPipe()) sprintId: string,
  ) {
    return ApiResponse.success(await this.sprints.reopen(userId, sprintId), 'Sprint reopened successfully');
  }
}
