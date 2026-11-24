import {
  BadRequestException,
  ConflictException,
  PreconditionFailedException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createHash, randomUUID } from 'node:crypto';
import type { ModuleFileSnapshot } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { DocumentAccessService } from './document-access.service';
import { DocumentTreeService } from './document-tree.service';
import { StorageCleanupService } from './storage-cleanup.service';
import {
  FILE_COPY,
  FILE_COPY_MESSAGES,
  moduleSnapshotKey,
  type ModuleSnapshotScope,
} from './file-copy.constants';
import { zipSnapshot } from './folder-snapshot';
import type { CopyDocumentDto } from './dto/copy-document.dto';
import { validateUploadMetadata } from '../../infrastructure/s3/upload-policy';

export type SnapshotScope = { scope: ModuleSnapshotScope; notebookId?: string };
const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

@Injectable()
export class ModuleFileSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly access: DocumentAccessService,
    private readonly tree: DocumentTreeService,
    private readonly cleanup: StorageCleanupService,
  ) {}

  async copy(
    actorId: string,
    email: string,
    request: CopyDocumentDto,
    target: SnapshotScope,
  ) {
    const operationKey = `${actorId}:${target.scope}:${request.operationId}`;
    const prior = await this.prisma.moduleFileSnapshot.findUnique({
      where: { operationKey },
    });
    if (prior) {
      if (
        prior.sourceDocumentId !== request.documentId ||
        prior.notebookId !== (target.notebookId ?? null) ||
        (request.versionId && prior.sourceVersionId !== request.versionId)
      )
        throw new ConflictException(
          'This copy operation belongs to another selection.',
        );
      if (prior.expiresAt && prior.expiresAt <= new Date())
        throw new GoneException(
          'This prepared copy has expired. Copy the file again.',
        );
      if (prior.status === 'READY') return this.manifest(prior, true);
    }
    const source = await this.access.checkPermission(
      request.documentId,
      actorId,
      email,
    );
    if (source.isArchived)
      throw new ForbiddenException(FILE_COPY_MESSAGES.unavailable);
    if (source.type === 'FOLDER' && target.scope !== 'CHAT')
      throw new BadRequestException(FILE_COPY_MESSAGES.folders);
    const version =
      source.type === 'FILE'
        ? await this.prisma.documentVersion.findFirst({
            where: {
              documentItemId: source.id,
              s3Key: source.s3Key ?? undefined,
            },
            orderBy: { versionNumber: 'desc' },
          })
        : null;
    if (source.type === 'FILE' && (!version || !source.s3Key))
      throw new ForbiddenException(FILE_COPY_MESSAGES.unavailable);
    if (request.versionId && request.versionId !== version?.id)
      throw new PreconditionFailedException(FILE_COPY_MESSAGES.changed);
    const entries =
      source.type === 'FOLDER'
        ? await this.tree.getFolderDescendantsWithPaths(
            source.id,
            source.name,
            FILE_COPY.ZIP_FILES,
          )
        : null;
    const files: {
      id: string;
      s3Key: string;
      path: string;
      sizeBytes: number;
    }[] = [];
    for (
      let offset = 0;
      entries && offset < entries.files.length;
      offset += FILE_COPY.SOURCE_CHECK_BATCH
    ) {
      files.push(
        ...(await Promise.all(
          entries.files
            .slice(offset, offset + FILE_COPY.SOURCE_CHECK_BATCH)
            .map(async (file) => {
              const current = await this.access.checkPermission(
                file.id,
                actorId,
                email,
              );
              if (current.isArchived || !current.s3Key)
                throw new ForbiddenException(FILE_COPY_MESSAGES.unavailable);

              return {
                id: current.id,
                s3Key: current.s3Key,
                path: entries.pathMap.get(file.id) ?? file.name,
                sizeBytes: Number(current.sizeBytes),
              };
            }),
        )),
      );
    }
    files.sort((a, b) => a.id.localeCompare(b.id));
    if (entries) entries.directories.sort();
    const name = entries ? `${source.name}.zip` : source.name;
    const mimeType = entries
      ? 'application/zip'
      : source.mimeType || 'application/octet-stream';
    const sizeBytes = version ? Number(version.sizeBytes) : 0;
    const max =
      target.scope === 'NOTEBOOK'
        ? FILE_COPY.NOTEBOOK_BYTES
        : FILE_COPY.CHAT_BYTES;
    if (sizeBytes > max)
      throw new BadRequestException(`File exceeds ${max / 1024 / 1024} MiB.`);
    const revision = version
      ? createHash('sha256')
          .update(`${version.id}:${version.s3Key}:${version.sizeBytes}`)
          .digest('hex')
      : digest([files, entries?.directories]);
    if (prior && prior.revision !== revision)
      throw new PreconditionFailedException(FILE_COPY_MESSAGES.changed);
    const id = randomUUID();
    const snapshot = await this.prisma.moduleFileSnapshot.upsert({
      where: { operationKey },
      update: {},
      create: {
        id,
        actorId,
        scope: target.scope,
        notebookId: target.notebookId,
        operationKey,
        sourceDocumentId: source.id,
        sourceVersionId: version?.id,
        revision,
        name,
        mimeType,
        sizeBytes: BigInt(sizeBytes),
        s3Key: moduleSnapshotKey(actorId, target.scope, id),
        expiresAt: new Date(Date.now() + FILE_COPY.EXPORT_TTL_MS),
      },
    });
    if (snapshot.status === 'READY') return this.manifest(snapshot, true);
    const leaseToken = randomUUID();
    const destinationKey = moduleSnapshotKey(
      actorId,
      target.scope,
      snapshot.id,
    );
    const claimed = await this.prisma.$transaction(async (tx) => {
      const result = await tx.moduleFileSnapshot.updateMany({
        where: {
          id: snapshot.id,
          OR: [
            { status: 'FAILED' },
            {
              status: 'PREPARING',
              OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
            },
          ],
        },
        data: {
          leaseToken,
          leaseUntil: new Date(Date.now() + FILE_COPY.LEASE_MS),
          status: 'PREPARING',
          s3Key: destinationKey,
        },
      });
      if (result.count && snapshot.s3Key !== destinationKey)
        await this.cleanup.enqueue(tx, [snapshot.s3Key]);

      return result;
    });
    if (!claimed.count)
      throw new ConflictException(FILE_COPY_MESSAGES.preparing);
    snapshot.s3Key = destinationKey;
    try {
      let actualBytes = sizeBytes;
      if (entries) {
        const archive = await zipSnapshot(this.s3, files, entries.directories);
        actualBytes = archive.length;
        await this.s3.putSnapshot(snapshot.s3Key, archive, mimeType);
      } else await this.s3.copySnapshot(version!.s3Key, snapshot.s3Key);
      await this.s3.assertUploadSize(snapshot.s3Key, actualBytes);
      const checked = await this.access.checkPermission(
        source.id,
        actorId,
        email,
      );
      if (checked.isArchived || (!entries && checked.s3Key !== version!.s3Key))
        throw new PreconditionFailedException(FILE_COPY_MESSAGES.changed);
      for (const file of files) {
        const current = await this.access.checkPermission(
          file.id,
          actorId,
          email,
        );
        if (current.isArchived || current.s3Key !== file.s3Key)
          throw new PreconditionFailedException(FILE_COPY_MESSAGES.changed);
      }
      const completed = await this.prisma.moduleFileSnapshot.updateMany({
        where: { id: snapshot.id, leaseToken },
        data: {
          status: 'READY',
          sizeBytes: BigInt(actualBytes),
          leaseToken: null,
          leaseUntil: null,
        },
      });
      if (!completed.count)
        throw new ConflictException(FILE_COPY_MESSAGES.preparing);

      return this.manifest(
        { ...snapshot, status: 'READY', sizeBytes: BigInt(actualBytes) },
        true,
      );
    } catch (error) {
      await this.prisma.moduleFileSnapshot.updateMany({
        where: { id: snapshot.id, leaseToken },
        data: { status: 'FAILED', leaseToken: null, leaseUntil: null },
      });
      throw error;
    }
  }

  async manifest(snapshot: ModuleFileSnapshot, download: boolean) {
    return {
      snapshotId: snapshot.id,
      documentId: snapshot.sourceDocumentId ?? snapshot.id,
      versionId: snapshot.sourceVersionId ?? snapshot.id,
      revision: snapshot.revision,
      name: snapshot.name,
      mimeType: snapshot.mimeType,
      sizeBytes: Number(snapshot.sizeBytes),
      current: true,
      ...(download
        ? {
            downloadUrl: await this.s3.generatePresignedDownloadUrl(
              snapshot.s3Key,
              snapshot.name,
              FILE_COPY.URL_SECONDS,
              true,
            ),
          }
        : {}),
    };
  }

  async resolve(
    actorId: string,
    notebookId: string,
    ids: string[],
    download: boolean,
    retain = false,
  ) {
    return Promise.all(
      ids.map(async (id) => {
        const snapshot = await this.prisma.moduleFileSnapshot.findFirst({
          where: {
            id,
            actorId,
            notebookId,
            scope: 'NOTEBOOK',
            status: 'READY',
          },
        });
        if (
          !snapshot ||
          (!retain && snapshot.expiresAt && snapshot.expiresAt <= new Date())
        )
          throw new NotFoundException('Notebook copy is unavailable.');
        // Once a source is attached/indexed it belongs to the notebook, not a temporary export.
        if (snapshot.expiresAt) {
          const refreshed = await this.prisma.moduleFileSnapshot.updateMany({
            where: { id, ...(retain ? {} : { expiresAt: { gt: new Date() } }) },
            data: {
              expiresAt: retain
                ? null
                : new Date(Date.now() + FILE_COPY.EXPORT_TTL_MS),
            },
          });
          if (!refreshed.count)
            throw new NotFoundException('Notebook copy has expired.');
        }

        return this.manifest(snapshot, download);
      }),
    );
  }

  async upload(
    actorId: string,
    notebookId: string,
    operationId: string,
    name: string,
    mimeType: string,
    sizeBytes: number,
  ) {
    validateUploadMetadata(name, mimeType);
    if (
      !Number.isSafeInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > FILE_COPY.NOTEBOOK_BYTES
    )
      throw new BadRequestException('File exceeds 20 MiB.');
    const id = randomUUID();
    const operationKey = `${actorId}:NOTEBOOK:${operationId}`;
    const snapshot = await this.prisma.moduleFileSnapshot.upsert({
      where: { operationKey },
      update: {},
      create: {
        id,
        actorId,
        notebookId,
        scope: 'NOTEBOOK',
        operationKey,
        name,
        mimeType,
        sizeBytes: BigInt(sizeBytes),
        revision: digest([id, sizeBytes]),
        s3Key: `${moduleSnapshotKey(actorId, 'NOTEBOOK', id)}/${name}`,
        status: 'UPLOADING',
        expiresAt: new Date(Date.now() + FILE_COPY.EXPORT_TTL_MS),
      },
    });
    if (
      snapshot.notebookId !== notebookId ||
      snapshot.name !== name ||
      snapshot.mimeType !== mimeType ||
      Number(snapshot.sizeBytes) !== sizeBytes ||
      snapshot.sourceDocumentId
    )
      throw new ConflictException('Upload operation already used.');
    if (snapshot.expiresAt && snapshot.expiresAt <= new Date())
      throw new GoneException(
        'This upload has expired. Upload the file again.',
      );
    if (
      snapshot.status === 'UPLOADING' &&
      snapshot.s3Key.startsWith('module-snapshots/')
    )
      throw new GoneException(
        'This upload uses an older storage location. Select the file again to retry.',
      );

    return {
      snapshotId: snapshot.id,
      status: snapshot.status,
      presignedUrl:
        snapshot.status === 'READY'
          ? undefined
          : await this.s3.snapshotUploadUrl(
              snapshot.s3Key,
              mimeType,
              sizeBytes,
            ),
    };
  }

  async confirmUpload(actorId: string, notebookId: string, id: string) {
    const snapshot = await this.prisma.moduleFileSnapshot.findFirst({
      where: {
        id,
        actorId,
        notebookId,
        scope: 'NOTEBOOK',
        status: { in: ['UPLOADING', 'READY'] },
      },
    });
    if (!snapshot)
      throw new NotFoundException('Notebook upload is unavailable.');
    if (snapshot.expiresAt && snapshot.expiresAt <= new Date())
      throw new GoneException(
        'This upload has expired. Upload the file again.',
      );
    await this.s3.assertUploadSize(snapshot.s3Key, Number(snapshot.sizeBytes));
    const metadata = await this.s3.describeAiSource(snapshot.s3Key, false);
    if (metadata.mimeType !== snapshot.mimeType)
      throw new BadRequestException('Uploaded content type does not match.');
    await this.prisma.moduleFileSnapshot.update({
      where: { id },
      data: { status: 'READY' },
    });

    return this.manifest(snapshot, true);
  }

  async remove(actorId: string, notebookId: string, ids: string[]) {
    await this.prisma.$transaction(async (tx) => {
      const snapshots = await tx.moduleFileSnapshot.findMany({
        where: { id: { in: ids }, actorId, notebookId, scope: 'NOTEBOOK' },
      });
      await this.cleanup.enqueue(
        tx,
        snapshots.map((snapshot) => snapshot.s3Key),
      );
      await tx.moduleFileSnapshot.deleteMany({
        where: { id: { in: snapshots.map((snapshot) => snapshot.id) } },
      });
    });
  }

  @Cron('0 */15 * * * *')
  async expire() {
    await this.prisma.$transaction(async (tx) => {
      // READY notebook bytes may have committed in AI while its retain RPC was
      // interrupted. Only the AI-aware reconciliation command may prune them.
      const snapshots = await tx.$queryRaw<
        { id: string; s3Key: string }[]
      >`SELECT id,s3_key AS "s3Key" FROM module_file_snapshots WHERE expires_at < NOW() AND NOT (scope='NOTEBOOK' AND status='READY') AND (lease_until IS NULL OR lease_until < NOW()) ORDER BY expires_at,id LIMIT 100 FOR UPDATE SKIP LOCKED`;
      await this.cleanup.enqueue(
        tx,
        snapshots.map((snapshot) => snapshot.s3Key),
      );
      await tx.moduleFileSnapshot.deleteMany({
        where: { id: { in: snapshots.map((snapshot) => snapshot.id) } },
      });
    });
  }
}
