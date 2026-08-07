import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CreateDependencyDto } from './dto/create-dependency.dto';
import { DependencyService } from './dependency.service';

@Controller('api')
export class DependencyController {
  constructor(private readonly dependencies: DependencyService) {}

  @Get('projects/:projectId/dependencies')
  async list(@CurrentUserId() userId: string, @Param('projectId', new ParseUUIDPipe()) projectId: string) {
    return ApiResponse.success(await this.dependencies.list(userId, projectId), 'Task dependencies loaded successfully');
  }

  @Post('tasks/:successorTaskId/dependencies')
  async create(@CurrentUserId() userId: string, @Param('successorTaskId', new ParseUUIDPipe()) successorTaskId: string, @Body() dto: CreateDependencyDto) {
    return ApiResponse.success(await this.dependencies.create(userId, successorTaskId, dto), 'Task dependency created successfully');
  }

  @Delete('tasks/:successorTaskId/dependencies/:predecessorTaskId')
  async remove(@CurrentUserId() userId: string, @Param('successorTaskId', new ParseUUIDPipe()) successorTaskId: string, @Param('predecessorTaskId', new ParseUUIDPipe()) predecessorTaskId: string) {
    return ApiResponse.success(await this.dependencies.remove(userId, successorTaskId, predecessorTaskId), 'Task dependency removed successfully');
  }
}
