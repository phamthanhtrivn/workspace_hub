import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Module,
  Post,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { assertServiceKey } from '../../common/internal-service-key';
import { isEmail, isUUID } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Module } from '../../infrastructure/s3/s3.module';
import { S3Service } from '../../infrastructure/s3/s3.service';

type Ref = { documentId: string; versionId?: string };
@Controller('internal/notebook-documents')
export class NotebookBridgeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  @Post('resolve')
  async resolve(
    @Headers('x-internal-service-key') serviceKey: string,
    @Body()
    body: {
      userId: string;
      userEmail: string;
      refs: Ref[];
      download?: boolean;
    },
  ) {
    assertServiceKey(
      serviceKey,
      process.env.AI_DOCUMENT_SERVICE_KEY,
      process.env.AI_DOCUMENT_SERVICE_KEY_PREVIOUS,
    );
    if (
      !isUUID(body?.userId) ||
      !isEmail(body?.userEmail) ||
      (body?.download !== undefined && typeof body.download !== 'boolean')
    )
      throw new BadRequestException('Invalid actor or download flag');
    const actor = { sub: body.userId, email: body.userEmail };
    if (!Array.isArray(body.refs) || !body.refs.length || body.refs.length > 5)
      throw new BadRequestException('Select 1–5 files');
    const results: {
      documentId: string;
      versionId: string;
      revision: string;
      name: string;
      sizeBytes: number;
      current: boolean;
      downloadUrl?: string;
    }[] = [];
    for (const ref of body.refs) {
      if (
        !ref ||
        !isUUID(ref.documentId) ||
        (ref.versionId !== undefined && !isUUID(ref.versionId))
      )
        throw new BadRequestException();
      const item = await this.prisma.documentItem.findUnique({
        where: { id: ref.documentId },
        include: {
          shares: true,
          versions: { orderBy: { versionNumber: 'desc' } },
        },
      });
      // Public-link access does not grant notebook ingestion rights.
      if (
        !item ||
        item.isArchived ||
        item.type !== 'FILE' ||
        (item.ownerUserId !== actor.sub &&
          !item.shares.some(
            (s) =>
              s.shareWithUserId === actor.sub ||
              s.shareWithEmail.toLowerCase() === actor.email.toLowerCase(),
          ))
      )
        throw new ForbiddenException();
      const version = ref.versionId
        ? item.versions.find((v) => v.id === ref.versionId)
        : item.versions[0];
      if (!version) throw new ForbiddenException('File version unavailable');
      const revision = createHash('sha256')
        .update(`${version.id}:${version.s3Key}:${version.sizeBytes}`)
        .digest('hex');
      results.push({
        documentId: item.id,
        versionId: version.id,
        revision,
        name: item.name,
        sizeBytes: Number(version.sizeBytes),
        current: version.id === item.versions[0]?.id,
        ...(body.download
          ? {
              downloadUrl: await this.s3.generatePresignedDownloadUrl(
                version.s3Key,
                item.name,
                60,
                true,
              ),
            }
          : {}),
      });
    }
    return { message: 'Notebook sources resolved', data: results };
  }
}

@Module({ imports: [S3Module], controllers: [NotebookBridgeController] })
export class NotebookBridgeModule {}
