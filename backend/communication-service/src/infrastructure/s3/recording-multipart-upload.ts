import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  HeadObjectCommand,
  ListPartsCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { open } from 'fs/promises';

const MIB = 1024 * 1024;

interface UploadedRecordingPart {
  PartNumber: number;
  ETag: string;
  ChecksumCRC32?: string;
}

export interface RecordingUploadState {
  uploadId: string;
  uploadToken: string;
  key: string;
  sizeBytes: number;
  modifiedAtMs: number;
  partSize: number;
  parts: UploadedRecordingPart[];
}

export interface RecordingUploadOptions {
  state?: RecordingUploadState;
  onCheckpoint?: (state: RecordingUploadState | null) => Promise<void>;
  signal?: AbortSignal;
}

export function parseRecordingUploadState(
  value: unknown,
): RecordingUploadState | undefined {
  if (!value || typeof value !== 'object') return;
  const state = value as Record<string, unknown>;
  if (
    typeof state.uploadId !== 'string' ||
    !state.uploadId ||
    typeof state.uploadToken !== 'string' ||
    !state.uploadToken ||
    typeof state.key !== 'string' ||
    !state.key ||
    typeof state.sizeBytes !== 'number' ||
    !Number.isSafeInteger(state.sizeBytes) ||
    state.sizeBytes <= 0 ||
    typeof state.modifiedAtMs !== 'number' ||
    !Number.isFinite(state.modifiedAtMs) ||
    typeof state.partSize !== 'number' ||
    !Number.isInteger(state.partSize) ||
    state.partSize < 5 * MIB ||
    state.partSize > 64 * MIB ||
    !Array.isArray(state.parts) ||
    state.parts.length > 10000
  )
    return;
  const seen = new Set<number>();
  for (const value of state.parts as unknown[]) {
    if (!value || typeof value !== 'object') return;
    const part = value as Record<string, unknown>;
    if (
      typeof part.PartNumber !== 'number' ||
      !Number.isInteger(part.PartNumber) ||
      part.PartNumber < 1 ||
      part.PartNumber > Math.ceil(state.sizeBytes / state.partSize) ||
      seen.has(part.PartNumber) ||
      typeof part.ETag !== 'string' ||
      !part.ETag ||
      (part.ChecksumCRC32 !== undefined &&
        typeof part.ChecksumCRC32 !== 'string')
    )
      return;
    seen.add(part.PartNumber);
  }
  return value as RecordingUploadState;
}

export class RecordingMultipartUploader {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async abort(key: string, uploadId: string) {
    try {
      await this.client.send(
        new AbortMultipartUploadCommand({
          Bucket: this.bucket,
          Key: key,
          UploadId: uploadId,
        }),
      );
    } catch (error) {
      if (!this.isMissingUpload(error)) throw error;
    }
  }

  async upload(
    path: string,
    key: string,
    options: RecordingUploadOptions = {},
  ): Promise<bigint> {
    const file = await open(path, 'r');
    let state = options.state;
    let checkpointSaved = Boolean(state && options.onCheckpoint);
    try {
      options.signal?.throwIfAborted();
      const stat = await file.stat();
      const partSize =
        state?.partSize ??
        this.setting('MEETING_RECORDING_UPLOAD_PART_MIB', 16, 5, 64) * MIB;
      if (
        !stat.size ||
        !Number.isSafeInteger(stat.size) ||
        Math.ceil(stat.size / partSize) > 10000
      )
        throw new Error('Invalid backup size');
      if (
        state &&
        (state.key !== key ||
          state.sizeBytes !== stat.size ||
          state.modifiedAtMs !== stat.mtimeMs)
      ) {
        if (state.key !== key)
          throw new Error('Upload checkpoint belongs to another recording');
        await this.abort(key, state.uploadId);
        await options.onCheckpoint?.(null);
        state = undefined;
        checkpointSaved = false;
      }
      if (state) {
        try {
          state.parts = await this.verifyParts(state, options.signal);
        } catch (error) {
          if (!this.isMissingUpload(error)) throw error;
          if (await this.isCompleted(state, options.signal))
            return BigInt(stat.size);
          await options.onCheckpoint?.(null);
          state = undefined;
          checkpointSaved = false;
        }
      }
      if (!state) {
        const uploadToken = randomUUID();
        const created = await this.client.send(
          new CreateMultipartUploadCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: 'video/mp4',
            ChecksumAlgorithm: 'CRC32',
            Metadata: { 'recording-upload-token': uploadToken },
          }),
          { abortSignal: options.signal },
        );
        if (!created.UploadId) throw new Error('Upload ID missing');
        state = {
          uploadId: created.UploadId,
          uploadToken,
          key,
          sizeBytes: stat.size,
          modifiedAtMs: stat.mtimeMs,
          partSize,
          parts: [],
        };
        await options.onCheckpoint?.(state);
        checkpointSaved = Boolean(options.onCheckpoint);
      }
      const uploaded = new Set(state.parts.map((part) => part.PartNumber));
      const pending = Array.from(
        { length: Math.ceil(stat.size / partSize) },
        (_, index) => index + 1,
      ).filter((part) => !uploaded.has(part));
      const concurrency = this.setting(
        'MEETING_RECORDING_UPLOAD_CONCURRENCY',
        3,
        1,
        4,
      );
      for (let offset = 0; offset < pending.length; offset += concurrency) {
        options.signal?.throwIfAborted();
        const current = state;
        const results = await Promise.allSettled(
          pending
            .slice(offset, offset + concurrency)
            .map(async (partNumber) => {
              const position = (partNumber - 1) * partSize;
              const length = Math.min(partSize, stat.size - position);
              const buffer = Buffer.allocUnsafe(length);
              let read = 0;
              while (read < length) {
                const { bytesRead } = await file.read(
                  buffer,
                  read,
                  length - read,
                  position + read,
                );
                if (!bytesRead) throw new Error('Backup was truncated');
                read += bytesRead;
              }
              const part = await this.client.send(
                new UploadPartCommand({
                  Bucket: this.bucket,
                  Key: key,
                  UploadId: current.uploadId,
                  PartNumber: partNumber,
                  Body: buffer,
                  ChecksumAlgorithm: 'CRC32',
                }),
                { abortSignal: options.signal },
              );
              if (!part.ETag || !part.ChecksumCRC32)
                throw new Error('Upload part verification missing');
              return {
                PartNumber: partNumber,
                ETag: part.ETag,
                ChecksumCRC32: part.ChecksumCRC32,
              };
            }),
        );
        for (const result of results)
          if (result.status === 'fulfilled') state.parts.push(result.value);
        state.parts.sort((a, b) => a.PartNumber - b.PartNumber);
        await options.onCheckpoint?.(state);
        const failed = results.find((result) => result.status === 'rejected');
        if (failed?.status === 'rejected') throw failed.reason as unknown;
      }
      const finalStat = await file.stat();
      if (finalStat.size !== stat.size || finalStat.mtimeMs !== stat.mtimeMs)
        throw new Error('Backup changed during upload');
      options.signal?.throwIfAborted();
      await this.client.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.bucket,
          Key: key,
          UploadId: state.uploadId,
          MultipartUpload: { Parts: state.parts },
          IfNoneMatch: '*',
        }),
        { abortSignal: options.signal },
      );
      return BigInt(stat.size);
    } catch (error) {
      if (state && (!checkpointSaved || this.isInvalidUpload(error))) {
        await this.abort(key, state.uploadId).catch(() => undefined);
        await options.onCheckpoint?.(null);
      }
      throw error;
    } finally {
      await file.close();
    }
  }

  private async verifyParts(state: RecordingUploadState, signal?: AbortSignal) {
    const parts = new Map<
      number,
      { etag?: string; size?: number; checksum?: string }
    >();
    let marker: string | undefined;
    do {
      const result = await this.client.send(
        new ListPartsCommand({
          Bucket: this.bucket,
          Key: state.key,
          UploadId: state.uploadId,
          PartNumberMarker: marker,
        }),
        { abortSignal: signal },
      );
      for (const part of result.Parts ?? [])
        if (part.PartNumber != null)
          parts.set(part.PartNumber, {
            etag: part.ETag,
            size: part.Size,
            checksum: part.ChecksumCRC32,
          });
      marker = result.IsTruncated ? result.NextPartNumberMarker : undefined;
      if (result.IsTruncated && !marker)
        throw new Error('Invalid multipart pagination');
    } while (marker);
    return state.parts.filter((part) => {
      const remote = parts.get(part.PartNumber);
      const expectedSize = Math.min(
        state.partSize,
        state.sizeBytes - (part.PartNumber - 1) * state.partSize,
      );
      return (
        remote?.etag === part.ETag &&
        remote.size === expectedSize &&
        Boolean(part.ChecksumCRC32) &&
        remote.checksum === part.ChecksumCRC32
      );
    });
  }

  private async isCompleted(state: RecordingUploadState, signal?: AbortSignal) {
    try {
      const object = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: state.key }),
        { abortSignal: signal },
      );
      return (
        object.ContentLength === state.sizeBytes &&
        object.Metadata?.['recording-upload-token'] === state.uploadToken
      );
    } catch (error) {
      if (
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      )
        return false;
      throw error;
    }
  }

  private setting(name: string, fallback: number, min: number, max: number) {
    const value = Number(process.env[name]);
    return Number.isInteger(value) && value >= min && value <= max
      ? value
      : fallback;
  }

  private isMissingUpload(error: unknown) {
    return (error as { name?: string })?.name === 'NoSuchUpload';
  }
  private isInvalidUpload(error: unknown) {
    return (
      ['InvalidPart', 'InvalidPartOrder', 'EntityTooSmall'].includes(
        (error as { name?: string })?.name ?? '',
      ) ||
      (error instanceof Error &&
        [
          'Backup was truncated',
          'Backup changed during upload',
          'Invalid backup size',
        ].includes(error.message))
    );
  }
}
