import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { DocumentPickerService } from './document-picker.service';
import { ModuleFileSnapshotService } from './module-file-snapshot.service';
import { ProjectDocumentAttachmentService } from './project-document-attachment.service';
import { CopyDocumentDto } from './dto/copy-document.dto';
import {
  DocumentPickerQuery,
  ImportProjectFilesDto,
} from './dto/document-picker.dto';
@Controller('api/documents')
export class DocumentPickerController {
  constructor(
    private readonly picker: DocumentPickerService,
    private readonly snapshots: ModuleFileSnapshotService,
    private readonly projects: ProjectDocumentAttachmentService,
  ) {}
  @Get('picker') list(
    @Headers('x-user-id') actorId: string,
    @Headers('x-user-email') email: string,
    @Query() query: DocumentPickerQuery,
  ) {
    return this.picker.list(actorId, email, query);
  }
  @Post('exports') async export(
    @Headers('x-user-id') actorId: string,
    @Headers('x-user-email') email: string,
    @Body() request: CopyDocumentDto,
  ) {
    return {
      message: 'File copy prepared',
      data: await this.snapshots.copy(actorId, email, request, {
        scope: 'CHAT',
      }),
    };
  }
  @Post('project-imports') async importProject(
    @Headers('x-user-id') actorId: string,
    @Headers('x-user-email') email: string,
    @Body() request: ImportProjectFilesDto,
  ) {
    return {
      message: 'Files copied into Project Documents',
      data: await this.projects.importTaskAttachmentDocuments(
        actorId,
        email,
        request.projectId,
        request.refs.map((ref) => ref.documentId),
        request.refs[0].operationId,
        Object.fromEntries(
          request.refs
            .filter((ref) => ref.versionId)
            .map((ref) => [ref.documentId, ref.versionId!]),
        ),
      ),
    };
  }
}
