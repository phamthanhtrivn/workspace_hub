import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsUUID } from 'class-validator';
import { ApiResponse } from '../../common/api-response';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { ProjectFileService, UploadedProjectFile } from './project-file.service';

class UploadProjectFileDto {
  @IsOptional()
  @IsUUID()
  sprintId?: string;
}

@Controller('api/projects/:projectId/files')
export class ProjectFileController {
  constructor(private readonly files: ProjectFileService) {}

  @Get()
  async list(@CurrentUserId() userId: string, @Param('projectId', new ParseUUIDPipe()) projectId: string) {
    return ApiResponse.success(await this.files.list(userId, projectId));
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 1 } }))
  async upload(@CurrentUserId() userId: string, @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @UploadedFile() file: UploadedProjectFile | undefined, @Body() body: UploadProjectFileDto) {
    return ApiResponse.success(await this.files.upload(userId, projectId, file, body.sprintId));
  }

  @Get(':fileId/download')
  async download(@CurrentUserId() userId: string, @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('fileId', new ParseUUIDPipe()) fileId: string) {
    const file = await this.files.download(userId, projectId, fileId);
    return new StreamableFile(Buffer.from(file.content), {
      type: 'application/octet-stream',
      disposition: `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      length: file.content.length,
    });
  }

  @Delete(':fileId')
  async remove(@CurrentUserId() userId: string, @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('fileId', new ParseUUIDPipe()) fileId: string) {
    await this.files.remove(userId, projectId, fileId);
    return ApiResponse.success(null);
  }
}
