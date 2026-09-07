import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiResponse } from '../../common/api-response';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberPermissionsDto } from './dto/update-member-permissions.dto';
import { MemberService } from './member.service';
import { ProjectService } from './project.service';

@Controller('api/projects/:projectId/members')
export class MemberController {
  constructor(
    private readonly members: MemberService,
    private readonly projects: ProjectService,
  ) {}

  @Get()
  async findAll(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ) {
    return ApiResponse.success(
      await this.projects.listMembers(userId, projectId),
      'Members loaded successfully',
    );
  }

  @Post()
  async add(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() dto: AddMemberDto,
  ) {
    return ApiResponse.success(
      await this.members.add(userId, projectId, dto),
      'Member added successfully',
    );
  }

  @Patch(':memberUserId')
  async updatePermissions(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('memberUserId', new ParseUUIDPipe()) memberUserId: string,
    @Body() dto: UpdateMemberPermissionsDto,
  ) {
    return ApiResponse.success(
      await this.members.updatePermissions(
        userId,
        projectId,
        memberUserId,
        dto,
      ),
      'Member permissions updated successfully',
    );
  }

  @Delete(':memberUserId')
  async remove(
    @CurrentUserId() userId: string,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('memberUserId', new ParseUUIDPipe()) memberUserId: string,
  ) {
    await this.members.remove(userId, projectId, memberUserId);
    return ApiResponse.success(null, 'Member removed successfully');
  }
}
