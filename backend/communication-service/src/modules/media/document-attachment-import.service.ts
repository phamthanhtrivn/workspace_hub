import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  GoneException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import {
  UPLOAD_POLICY,
  validateUploadMetadata,
  type ChatAttachment,
} from '../../infrastructure/s3/attachment-upload.policy';
import { MediaAccessService } from './media-access.service';
import type { ImportDocumentsDto } from './dto/import-documents.dto';

const COPY_LEASE_MS = 180_000;
const EXPORT_ROUTE = '/api/documents/exports';
const childId = (operationId: string, index: number) => {
  const hex = createHash('sha256')
    .update(`${operationId}:${index}`)
    .digest('hex')
    .slice(0, 32)
    .split('');
  hex[12] = '4';
  hex[16] = 'a';

  return hex
    .join('')
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
};
interface ExportedFile {
  name: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
}

@Injectable()
export class DocumentAttachmentImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: MediaAccessService,
    private readonly s3: S3Service,
  ) {}

  async meetingTargets(actorId: string) {
    const meetings = await this.prisma.meeting.findMany({
      where: {
        status: 'LIVE',
        participants: { some: { userId: actorId, status: 'JOINED' } },
      },
      select: {
        id: true,
        joinToken: true,
        title: true,
        chatEnabled: true,
        participants: { where: { userId: actorId }, select: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Available meeting chats',
      data: meetings
        .filter(
          (meeting) =>
            meeting.chatEnabled ||
            meeting.participants[0]?.role !== 'PARTICIPANT',
        )
        .map((meeting) => ({
          id: meeting.id,
          joinToken: meeting.joinToken,
          title: meeting.title,
        })),
    };
  }

  async import(
    actorId: string,
    authorization: string,
    request: ImportDocumentsDto,
  ) {
    await this.access.assertCanUpload(
      request.chatId,
      request.chatType,
      actorId,
    );
    const fingerprint = createHash('sha256')
      .update(JSON.stringify([request.chatId, request.chatType, request.refs]))
      .digest('hex');
    const receipt = await this.prisma.documentAttachmentImport.upsert({
      where: {
        actorId_operationId: { actorId, operationId: request.operationId },
      },
      update: {},
      create: {
        actorId,
        operationId: request.operationId,
        fingerprint,
        chatId: request.chatId,
        chatType: request.chatType,
      },
    });
    if (receipt.fingerprint !== fingerprint)
      throw new ConflictException(
        'This operation belongs to another file selection.',
      );
    if (receipt.status === 'EXPIRED')
      throw new GoneException(
        'The prepared copy has expired. Try copying it again.',
      );
    if (receipt.status === 'READY')
      return { message: 'Files copied', data: receipt.result };
    const leaseToken = randomUUID();
    const claim = await this.prisma.documentAttachmentImport.updateMany({
      where: {
        id: receipt.id,
        OR: [
          { status: 'FAILED' },
          {
            status: 'PREPARING',
            OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
          },
        ],
      },
      data: {
        status: 'PREPARING',
        leaseToken,
        leaseUntil: new Date(Date.now() + COPY_LEASE_MS),
      },
    });
    if (!claim.count)
      throw new ConflictException(
        'Files are still being copied. Retry the same operation.',
      );
    const attachments = (Array.isArray(receipt.result)
      ? receipt.result
      : []) as unknown as ChatAttachment[];
    try {
      for (let index = 0; index < request.refs.length; index++) {
        await this.renew(receipt.id, leaseToken);
        const previous = attachments[index];
        if (previous) {
          try {
            await this.s3.assertAttachments([previous], {
              actorId,
              referenceId: request.chatId,
              chatType: request.chatType,
            });
            continue;
          } catch (error) {
            if (!(error instanceof BadRequestException)) throw error;
          }
        }
        const exported = await this.export(authorization, {
          ...request.refs[index],
          operationId: childId(request.operationId, index),
        });
        await this.renew(receipt.id, leaseToken);
        validateUploadMetadata(exported.name, exported.mimeType);
        if (
          !Number.isSafeInteger(exported.sizeBytes) ||
          exported.sizeBytes < 0 ||
          exported.sizeBytes > UPLOAD_POLICY.MAX_SIZE_BYTES
        )
          throw new BadRequestException('Attachment exceeds 10 MiB.');
        const attachment = {
          name: exported.name,
          mimeType: exported.mimeType,
          sizeBytes: exported.sizeBytes,
          s3Key: `chat-media/${request.chatId}/copy_${receipt.id}_${index}`,
        };
        attachments[index] = attachment;
        await this.prisma.documentAttachmentImport.updateMany({
          where: { id: receipt.id, leaseToken },
          data: { result: attachments as unknown as Prisma.InputJsonValue },
        });
        const bytes = await this.download(exported);
        await this.s3.putImportedAttachment(
          attachment.s3Key,
          bytes,
          attachment.mimeType,
          {
            actorId,
            referenceId: request.chatId,
            chatType: request.chatType,
            sizeBytes: bytes.length,
          },
        );
        await this.s3.assertAttachments([attachment], {
          actorId,
          referenceId: request.chatId,
          chatType: request.chatType,
        });
      }
      await this.access.assertCanUpload(
        request.chatId,
        request.chatType,
        actorId,
      );
      const completed = await this.prisma.documentAttachmentImport.updateMany({
        where: { id: receipt.id, leaseToken },
        data: {
          status: 'READY',
          leaseToken: null,
          leaseUntil: null,
          result: attachments as unknown as Prisma.InputJsonValue,
        },
      });
      if (!completed.count)
        throw new ConflictException(
          'Copy lease changed. Retry the same operation.',
        );

      return { message: 'Files copied', data: attachments };
    } catch (error) {
      await this.prisma.documentAttachmentImport.updateMany({
        where: { id: receipt.id, leaseToken },
        data: { status: 'FAILED', leaseToken: null, leaseUntil: null },
      });
      throw error;
    }
  }

  private async renew(id: string, leaseToken: string) {
    const changed = await this.prisma.documentAttachmentImport.updateMany({
      where: { id, leaseToken },
      data: { leaseUntil: new Date(Date.now() + COPY_LEASE_MS) },
    });
    if (!changed.count) throw new ConflictException('Copy lease changed.');
  }
  private async export(
    authorization: string,
    ref: { operationId: string; documentId: string; versionId?: string },
  ): Promise<ExportedFile> {
    const base = process.env.DOCUMENT_SERVICE_URL;
    if (!base || !authorization)
      throw new ServiceUnavailableException(
        'Document import is not configured.',
      );
    const response = await fetch(new URL(EXPORT_ROUTE, base), {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify(ref),
      redirect: 'error',
      signal: AbortSignal.timeout(COPY_LEASE_MS - 10_000),
    });
    if (!response.ok)
      throw new HttpException(
        'Cannot copy the selected document. Check its access, size and version.',
        [400, 401, 403, 404, 409, 410, 412, 413].includes(response.status)
          ? response.status
          : 502,
      );
    const result = (await response.json()) as { data: ExportedFile };
    if (!result.data?.downloadUrl || !result.data.name)
      throw new BadGatewayException('Invalid document export response.');

    return result.data;
  }
  private async download(file: ExportedFile) {
    const response = await fetch(file.downloadUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok || !response.body)
      throw new BadGatewayException('Document export is unavailable.');
    const parts: Buffer[] = [];
    const reader = response.body.getReader();
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > file.sizeBytes || size > UPLOAD_POLICY.MAX_SIZE_BYTES)
          throw new BadRequestException('Exported file size changed.');
        parts.push(Buffer.from(value));
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    if (size !== file.sizeBytes)
      throw new BadRequestException('Exported file is incomplete.');

    return Buffer.concat(parts);
  }
}
