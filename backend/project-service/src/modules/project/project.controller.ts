import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiResponse } from '../../common/utils/api-response';
import { RuntimeConfigService } from '../../common/config/runtime-config.service';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { InternalRenameProjectDto } from './dto/internal-rename-project.dto';
import { ProjectListQueryDto } from './dto/project-list-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectService } from './project.service';

@Controller('api/projects')
export class ProjectController {
  constructor(
    private readonly projects: ProjectService,
    private readonly config: RuntimeConfigService,
  ) {}

  @Post()
  async create(@CurrentUserId() userId: string, @Body() dto: CreateProjectDto) {
    return ApiResponse.success(await this.projects.create(userId, dto), 'Project created successfully');
  }

  @Get()
  async findAll(@CurrentUserId() userId: string, @Query() query: ProjectListQueryDto) {
    const result = await this.projects.findAll(userId, query);
    return ApiResponse.success(result.items, 'Projects loaded successfully', result.pagination);
  }

  @Post(':projectId/space')
  async openProjectSpace(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ) {
    return ApiResponse.success(
      await this.projects.openProjectSpace(userId, projectId),
      'Project space opened successfully',
    );
  }

  @Get(':projectId/space/status')
  async getProjectSpaceStatus(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ) {
    return ApiResponse.success(
      await this.projects.getProjectSpaceStatus(userId, projectId),
      'Project space status loaded successfully',
    );
  }

  @Get(':projectId')
  async findOne(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ) {
    return ApiResponse.success(await this.projects.findOne(userId, projectId), 'Project loaded successfully');
  }

  @Patch('internal/:projectId/name')
  async renameProjectFromSpace(
    @Headers('x-internal-service-key') serviceKey: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: InternalRenameProjectDto,
  ) {
    this.assertInternalServiceKey(serviceKey);
    return ApiResponse.success(
      await this.projects.renameProjectFromSpace(projectId, dto),
      'Project name synced successfully',
    );
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

  private assertInternalServiceKey(serviceKey?: string): void {
    if (!serviceKey || serviceKey !== this.config.internalServiceKey) {
      throw new UnauthorizedException('Invalid internal service key');
    }
  }
}
