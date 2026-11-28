import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UploadConfirmation,
  UploadScope,
  UPLOAD_POLICY,
} from './upload-policy';

@Injectable()
export class UploadIntentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    s3Key: string,
    sizeBytes: number,
    mimeType: string,
    scope: UploadScope,
  ) {
    await this.prisma.storageUploadIntent.create({
      data: {
        s3Key,
        sizeBytes,
        mimeType,
        actorId: scope.actorId,
        publicDocumentId: scope.publicDocumentId,
        expiresAt: new Date(
          Date.now() + UPLOAD_POLICY.URL_LIFETIME_SECONDS * 1000,
        ),
      },
    });
  }

  async assertScope(
    s3Key: string,
    sizeBytes: number,
    scope: UploadConfirmation,
  ) {
    const intent = await this.prisma.storageUploadIntent.findUnique({
      where: { s3Key },
    });
    if (
      !intent ||
      intent.actorId !== scope.actorId ||
      intent.publicDocumentId !== (scope.publicDocumentId ?? null) ||
      intent.mimeType !== scope.mimeType ||
      intent.sizeBytes !== BigInt(sizeBytes) ||
      (intent.target !== null && intent.target !== scope.target) ||
      (intent.target === null && intent.expiresAt <= new Date())
    ) {
      throw new BadRequestException(
        'Upload is invalid for this document or user',
      );
    }
  }

  async bind(s3Key: string, target: string) {
    // Binding is durable across a later quota/metadata failure. Retrying the same
    // operation is safe, while another document cannot reuse the uploaded bytes.
    const bound = await this.prisma.storageUploadIntent.updateMany({
      where: {
        s3Key,
        OR: [{ target }, { target: null, expiresAt: { gt: new Date() } }],
      },
      data: { target },
    });
    if (!bound.count) {
      throw new BadRequestException('Upload has expired or is already in use');
    }
  }
}
