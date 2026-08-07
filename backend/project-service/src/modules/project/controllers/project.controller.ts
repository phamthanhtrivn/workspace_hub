import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUserId } from '../../../common/decorators/current-user-id.decorator';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectService } from '../services/project.service';

@Controller('api/projects')
export class ProjectController {
  constructor(private readonly projects: ProjectService) {}

  @Post()
  async create(@CurrentUserId() userId: string, @Body() dto: CreateProjectDto) {
    return ApiResponse.success(await this.projects.create(userId, dto), 'Project created successfully');
  }

  @Get()
  async findAll(@CurrentUserId() userId: string) {
    return ApiResponse.success(await this.projects.findAll(userId), 'Projects loaded successfully');
  }

  @Get(':projectId')
  async findOne(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ) {
    return ApiResponse.success(await this.projects.findOne(userId, projectId), 'Project loaded successfully');
  }

  @Patch(':projectId')
  async update(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return ApiResponse.success(await this.projects.update(userId, projectId, dto), 'Project updated successfully');
  }

  @Delete(':projectId')
  async archive(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ) {
    await this.projects.archive(userId, projectId);
    return ApiResponse.success(null, 'Project archived successfully');
  }
}
