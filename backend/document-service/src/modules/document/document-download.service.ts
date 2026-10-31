import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import * as archiver from 'archiver';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemType } from '@prisma/client';
import { DocumentRole } from '../../common/enums/document.enum';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { DOCUMENT_CONSTANTS } from '../../common/constants/document.constants';
import { DocumentAccessService } from './document-access.service';
import { DocumentTreeService } from './document-tree.service';

@Injectable()
export class DocumentDownloadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly access: DocumentAccessService,
    private readonly tree: DocumentTreeService,
  ) {}
  async getPreviewUrl(
    userId: string | undefined,
    userEmail: string | undefined,
    id: string,
    versionId?: string,
  ): Promise<string> {
    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );

    if (item.type === ItemType.FOLDER) {
      throw new BadRequestException('Folders cannot be previewed');
    }

    let s3Key = item.s3Key;

    if (versionId) {
      const version = await this.prisma.documentVersion.findUnique({
        where: { id: versionId, documentItemId: id },
      });
      if (!version) {
        throw new NotFoundException('Document version not found');
      }
      s3Key = version.s3Key;
    }

    if (!s3Key) {
      throw new BadRequestException('Document has no attached file');
    }

    return this.s3Service.generatePresignedDownloadUrl(s3Key);
  }

  async getDownloadUrl(
    userId: string | undefined,
    userEmail: string | undefined,
    id: string,
    versionId?: string,
  ): Promise<string> {
    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );

    if (item.type === ItemType.FOLDER) {
      throw new BadRequestException('Folders cannot be downloaded directly');
    }

    let s3Key = item.s3Key;
    let fileName = item.name;

    if (versionId) {
      const version = await this.prisma.documentVersion.findUnique({
        where: { id: versionId, documentItemId: id },
      });
      if (!version) {
        throw new NotFoundException('Document version not found');
      }
      s3Key = version.s3Key;
      const dotIndex = fileName.lastIndexOf('.');
      if (dotIndex !== -1) {
        fileName = `${fileName.substring(0, dotIndex)}_v${version.versionNumber}${fileName.substring(dotIndex)}`;
      } else {
        fileName = `${fileName}_v${version.versionNumber}`;
      }
    }

    if (!s3Key) {
      throw new BadRequestException('Document has no attached file');
    }

    return this.s3Service.generatePresignedDownloadUrl(s3Key, fileName);
  }

  async downloadFolderAsZip(
    userId: string | undefined,
    userEmail: string | undefined,
    folderId: string,
    res: Response,
  ): Promise<void> {
    const folder = await this.access.checkPermission(
      folderId,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );

    if (folder.type !== ItemType.FOLDER) {
      throw new BadRequestException('This item is not a folder');
    }

    const { files, pathMap } = await this.tree.getFolderDescendantsWithPaths(
      folderId,
      folder.name,
    );

    const folderName = folder.name.replace(
      DOCUMENT_CONSTANTS.REGEX_INVALID_FILENAME_CHARS,
      '_',
    );
    const asciiName = folderName
      .normalize('NFD')
      .replace(DOCUMENT_CONSTANTS.REGEX_DIACRITICS, '')
      .replace(DOCUMENT_CONSTANTS.REGEX_NON_ASCII, '_');
    const encodedName = encodeURIComponent(`${folder.name}.zip`).replace(
      DOCUMENT_CONSTANTS.REGEX_SINGLE_QUOTE,
      DOCUMENT_CONSTANTS.PERCENT_ENCODED_SINGLE_QUOTE,
    );

    res.setHeader('Content-Type', DOCUMENT_CONSTANTS.ZIP_CONTENT_TYPE);
    res.setHeader(
      'Content-Disposition',
      `${DOCUMENT_CONSTANTS.ZIP_CONTENT_DISPOSITION_PREFIX}; filename="${asciiName}.zip"; filename*=UTF-8''${encodedName}`,
    );
    res.setHeader('Transfer-Encoding', 'chunked');

    const archive = new archiver.ZipArchive({
      zlib: { level: DOCUMENT_CONSTANTS.ZIP_COMPRESSION_LEVEL },
    });
    archive.pipe(res);

    for (const file of files) {
      if (!file.s3Key) continue;
      try {
        const stream = await this.s3Service.getFileStream(file.s3Key);
        const filePath = pathMap.get(file.id) ?? file.name;
        archive.append(stream, { name: filePath });
      } catch (err) {
        console.error(`Skipping file ${file.id} due to S3 error:`, err);
      }
    }

    await archive.finalize();
  }
}
