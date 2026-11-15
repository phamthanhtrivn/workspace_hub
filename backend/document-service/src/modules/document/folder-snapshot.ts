import { BadRequestException } from '@nestjs/common';
import * as archiver from 'archiver';
import { Transform } from 'node:stream';
import { FILE_COPY, FILE_COPY_MESSAGES } from './file-copy.constants';
import type { S3Service } from '../../infrastructure/s3/s3.service';

/** Unlike an interactive download, an attachment must never contain a partial ZIP. */
export async function zipSnapshot(
  s3: S3Service,
  files: { s3Key: string; path: string; sizeBytes: number }[],
  directories: string[] = [],
): Promise<Buffer> {
  if (
    files.length + directories.length > FILE_COPY.ZIP_FILES ||
    files.reduce((sum, file) => sum + file.sizeBytes, 0) >
      FILE_COPY.ZIP_INPUT_BYTES
  )
    throw new BadRequestException(
      'Folder is too large to prepare as an attachment.',
    );
  const archive = new archiver.ZipArchive({ zlib: { level: 6 } });
  const chunks: Buffer[] = [];
  let bytes = 0;
  const streams: Awaited<ReturnType<S3Service['getFileStream']>>[] = [];
  const abort = new AbortController();
  const timer = setTimeout(() => {
    abort.abort();
    archive.destroy(new Error('Folder export timed out.'));
  }, FILE_COPY.LEASE_MS - 10_000);
  const result = new Promise<Buffer>((resolve, reject) => {
    archive.on('error', reject);
    archive.on('warning', reject);
    archive.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > FILE_COPY.CHAT_BYTES)
        archive.destroy(new BadRequestException(FILE_COPY_MESSAGES.tooLarge));
      else chunks.push(chunk);
    });
    archive.on('end', () => resolve(Buffer.concat(chunks)));
  });
  // Install the rejection handler before opening the input streams.
  result.catch(() => {});
  try {
    for (const directory of directories) {
      if (directory.split('/').some((part) => part === '..' || part === '.'))
        throw new BadRequestException('Invalid folder entry.');
      archive.append(Buffer.alloc(0), { name: `${directory}/` });
    }
    for (const file of files) {
      if (archive.destroyed) throw new Error('Folder export was interrupted.');
      if (file.path.split('/').some((part) => part === '..' || part === '.'))
        throw new BadRequestException('Invalid folder entry.');
      const stream = await s3.getFileStream(file.s3Key, abort.signal);
      streams.push(stream);
      let readBytes = 0;
      const checked = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          readBytes += chunk.length;
          callback(
            readBytes > file.sizeBytes
              ? new BadRequestException('Folder entry size changed.')
              : null,
            chunk,
          );
        },
        flush(callback) {
          callback(
            readBytes !== file.sizeBytes
              ? new BadRequestException('Folder entry is incomplete.')
              : null,
          );
        },
      });
      streams.push(checked);
      stream.on('error', (error) => archive.destroy(error));
      checked.on('error', (error) => archive.destroy(error));
      archive.append(stream.pipe(checked), { name: file.path });
    }
    const [, bytes] = await Promise.all([archive.finalize(), result]);

    return bytes;
  } finally {
    clearTimeout(timer);
    abort.abort();
    archive.abort();
    streams.forEach((stream) => stream.destroy());
  }
}
