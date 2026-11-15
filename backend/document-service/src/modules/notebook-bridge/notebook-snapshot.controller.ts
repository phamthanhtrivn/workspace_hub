import { Body, Controller, Headers, Post } from '@nestjs/common';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { assertServiceKey } from '../../common/internal-service-key';
import { IndependentAuthentication } from '../../common/decorators/http-authentication.decorator';
import { ModuleFileSnapshotService } from '../document/module-file-snapshot.service';
import { CopyDocumentDto } from '../document/dto/copy-document.dto';

class SnapshotActorDto {
  @IsUUID() userId!: string;
  @IsUUID() notebookId!: string;
}
class CopyNotebookSnapshotDto extends SnapshotActorDto {
  @IsEmail() userEmail!: string;
  @ValidateNested() @Type(() => CopyDocumentDto) ref!: CopyDocumentDto;
}
class ResolveNotebookSnapshotsDto extends SnapshotActorDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(5)
  @IsUUID(undefined, { each: true })
  ids!: string[];
  @IsOptional() @IsBoolean() download = false;
  @IsOptional() @IsBoolean() retain = false;
}
class UploadNotebookSnapshotDto extends SnapshotActorDto {
  @IsUUID() operationId!: string;
  @IsString() @MaxLength(255) name!: string;
  @IsString() @MaxLength(100) mimeType!: string;
  @IsInt() @Min(1) @Max(20 * 1024 * 1024) sizeBytes!: number;
}
class ConfirmNotebookSnapshotDto extends SnapshotActorDto {
  @IsUUID() snapshotId!: string;
}

@IndependentAuthentication()
@Controller('internal/notebook-snapshots')
export class NotebookSnapshotController {
  constructor(private readonly snapshots: ModuleFileSnapshotService) {}
  private authenticate(key: string) {
    assertServiceKey(
      key,
      process.env.AI_DOCUMENT_SERVICE_KEY,
      process.env.AI_DOCUMENT_SERVICE_KEY_PREVIOUS,
    );
  }
  @Post('copy')
  async copy(
    @Headers('x-internal-service-key') key: string,
    @Body() body: CopyNotebookSnapshotDto,
  ) {
    this.authenticate(key);

    return {
      message: 'File copy request completed',
      data: await this.snapshots.copy(body.userId, body.userEmail, body.ref, {
        scope: 'NOTEBOOK',
        notebookId: body.notebookId,
      }),
    };
  }
  @Post('resolve')
  async resolve(
    @Headers('x-internal-service-key') key: string,
    @Body() body: ResolveNotebookSnapshotsDto,
  ) {
    this.authenticate(key);

    return {
      message: 'File copy request completed',
      data: await this.snapshots.resolve(
        body.userId,
        body.notebookId,
        body.ids,
        body.download,
        body.retain,
      ),
    };
  }
  @Post('upload')
  async upload(
    @Headers('x-internal-service-key') key: string,
    @Body() body: UploadNotebookSnapshotDto,
  ) {
    this.authenticate(key);

    return {
      message: 'File copy request completed',
      data: await this.snapshots.upload(
        body.userId,
        body.notebookId,
        body.operationId,
        body.name,
        body.mimeType,
        body.sizeBytes,
      ),
    };
  }
  @Post('confirm')
  async confirm(
    @Headers('x-internal-service-key') key: string,
    @Body() body: ConfirmNotebookSnapshotDto,
  ) {
    this.authenticate(key);

    return {
      message: 'File copy request completed',
      data: await this.snapshots.confirmUpload(
        body.userId,
        body.notebookId,
        body.snapshotId,
      ),
    };
  }
  @Post('remove')
  async remove(
    @Headers('x-internal-service-key') key: string,
    @Body() body: ResolveNotebookSnapshotsDto,
  ) {
    this.authenticate(key);
    await this.snapshots.remove(body.userId, body.notebookId, body.ids);

    return { message: 'File copy request completed', data: {} };
  }
}
