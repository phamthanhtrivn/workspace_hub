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

  @Post('resolve-chat-attachment')
  async resolveChatAttachment(
    @Headers('x-internal-service-key') serviceKey: string,
    @Body() body: { userId: string; s3Key: string; download?: boolean },
  ) {
    assertServiceKey(
      serviceKey,
      process.env.AI_DOCUMENT_SERVICE_KEY,
      process.env.AI_DOCUMENT_SERVICE_KEY_PREVIOUS,
    );
    if (
      !isUUID(body?.userId) ||
      typeof body?.s3Key !== 'string' ||
      body.s3Key.length > 1024 ||
      !/^documents\/[a-f0-9-]{36}\/[a-f0-9-]{36}_[a-z0-9._-]+$/i.test(
        body.s3Key,
      ) ||
      (body.download !== undefined && typeof body.download !== 'boolean')
    )
      throw new BadRequestException('Invalid attachment reference');
    const profile = await this.prisma.userProfileSnapshot.findUnique({
      where: { userId: body.userId },
      select: { email: true },
    });
    const email = profile?.email?.trim();
    const version = await this.prisma.documentVersion.findFirst({
      where: {
        s3Key: body.s3Key,
        documentItem: {
          type: 'FILE',
          isArchived: false,
          OR: [
            { ownerUserId: body.userId },
            {
              shares: {
                some: {
                  OR: [
                    { shareWithUserId: body.userId },
                    ...(email
                      ? [
                          {
                            shareWithEmail: {
                              equals: email,
                              mode: 'insensitive' as const,
                            },
                          },
                        ]
                      : []),
                  ],
                },
              },
            },
          ],
        },
      },
      select: { id: true, s3Key: true, sizeBytes: true, documentItemId: true },
    });
    if (!version)
      throw new ForbiddenException(
        'Document attachment unavailable or access revoked',
      );
    const sizeBytes = Number(version.sizeBytes);
    if (
      !Number.isSafeInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > 20 * 1024 * 1024
    )
      throw new BadRequestException('Document attachment exceeds size limit');
    const revision = createHash('sha256')
      .update(`${version.id}:${version.s3Key}:${version.sizeBytes}`)
      .digest('hex');
    return {
      message: 'Chat document attachment resolved',
      data: {
        documentId: version.documentItemId,
        versionId: version.id,
        revision,
        sizeBytes,
        ...(body.download
          ? {
              downloadUrl: await this.s3.generatePresignedDownloadUrl(
                version.s3Key,
                undefined,
                60,
                true,
              ),
            }
          : {}),
      },
    };
  }

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
