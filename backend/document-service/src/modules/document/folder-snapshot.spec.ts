/* eslint-disable @typescript-eslint/require-await -- Promise-returning test doubles mirror storage and Prisma contracts without external I/O. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { randomBytes } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { zipSnapshot } from './folder-snapshot';
import type { S3Service } from '../../infrastructure/s3/s3.service';

function unpack(archive: Buffer) {
  const entries = new Map<string, Buffer>();
  for (let offset = 0; offset + 46 <= archive.length; offset++) {
    if (archive.readUInt32LE(offset) !== 0x02014b50) continue;
    const method = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const nameSize = archive.readUInt16LE(offset + 28);
    const name = archive
      .subarray(offset + 46, offset + 46 + nameSize)
      .toString();
    const local = archive.readUInt32LE(offset + 42);
    const start =
      local +
      30 +
      archive.readUInt16LE(local + 26) +
      archive.readUInt16LE(local + 28);
    const bytes = archive.subarray(start, start + compressedSize);
    entries.set(name, method === 8 ? inflateRawSync(bytes) : bytes);
  }

  return entries;
}

void test('ZIP streams retain every file byte and empty nested directory', async () => {
  const first = randomBytes(128 * 1024);
  const second = Buffer.from('second file');
  const storage = {
    getFileStream: async (key: string) =>
      Readable.from([key === 'one' ? first : second]),
  } as unknown as S3Service;
  const archive = await zipSnapshot(
    storage,
    [
      { s3Key: 'one', path: 'Folder/first.bin', sizeBytes: first.length },
      { s3Key: 'two', path: 'Folder/second.txt', sizeBytes: second.length },
    ],
    ['Folder/empty'],
  );
  const files = unpack(archive);
  assert.deepEqual(files.get('Folder/first.bin'), first);
  assert.deepEqual(files.get('Folder/second.txt'), second);
  assert.ok(files.has('Folder/empty/'));
  await assert.rejects(
    zipSnapshot(storage, [
      { s3Key: 'two', path: 'short.txt', sizeBytes: second.length + 1 },
    ]),
    /incomplete/,
  );
});
void test('folder attachments retain nested entry names and fail instead of publishing missing files', async () => {
  const storage = {
    getFileStream: async () => Readable.from([Buffer.from('content')]),
  } as unknown as S3Service;
  const archive = await zipSnapshot(storage, [
    { s3Key: 'one', path: 'Folder/sub/file.txt', sizeBytes: 7 },
  ]);
  assert.equal(archive.subarray(0, 2).toString(), 'PK');
  assert.ok(archive.includes(Buffer.from('Folder/sub/file.txt')));
  const broken = {
    getFileStream: async () => {
      throw Error('Missing object');
    },
  } as unknown as S3Service;
  await assert.rejects(
    zipSnapshot(broken, [{ s3Key: 'one', path: 'file.txt', sizeBytes: 7 }]),
    /Missing object/,
  );
});
void test('ZIP output over 10 MiB is rejected without returning a partial archive', async () => {
  const bytes = randomBytes(10 * 1024 * 1024 + 1024);
  const storage = {
    getFileStream: async () => Readable.from([bytes]),
  } as unknown as S3Service;
  await assert.rejects(
    zipSnapshot(storage, [
      { s3Key: 'one', path: 'large.bin', sizeBytes: bytes.length },
    ]),
    /exceeds 10 MiB/,
  );
});
