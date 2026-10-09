jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

import {
  S3Client,
  CopyObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { mkdtemp, readFile, rm, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { S3Service } from './s3.service';

describe('recording segment S3 transfers', () => {
  let directory: string;
  let send: jest.SpyInstance;
  let service: S3Service;
  beforeEach(async () => {
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_S3_BUCKET_NAME = 'private-test-bucket';
    process.env.AWS_ACCESS_KEY = 'test-key';
    process.env.AWS_SECRET_KEY = 'test-secret';
    directory = await mkdtemp(join(tmpdir(), 'recording-download-'));
    send = jest.spyOn(S3Client.prototype, 'send');
    service = new S3Service();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    if (directory.startsWith(join(tmpdir(), 'recording-download-')))
      await rm(directory, { recursive: true, force: true });
  });
  it('streams SDK response chunks to disk without buffering the complete object', async () => {
    let chunk = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(1024 * 1024).fill(++chunk));
        if (chunk === 4) controller.close();
      },
    });
    const toBytes = jest.fn(() => {
      throw new Error('Whole-file buffering is forbidden');
    });
    send.mockResolvedValue({
      ContentLength: 4 * 1024 * 1024,
      Body: { transformToWebStream: () => body, transformToByteArray: toBytes },
    });
    const target = join(directory, 'segment.mp4');
    await service.downloadRecording(
      'recordings/part.mp4',
      target,
      4n * 1024n ** 2n,
      new AbortController().signal,
    );
    expect((await stat(target)).size).toBe(4 * 1024 * 1024);
    const bytes = await readFile(target);
    for (let index = 0; index < 4; index++)
      expect(bytes[index * 1024 * 1024]).toBe(index + 1);
    expect(toBytes).not.toHaveBeenCalled();
    const [command] = send.mock.calls[0] as unknown[];
    expect(command).toBeInstanceOf(GetObjectCommand);
  });
  it('closes a mismatched S3 response before creating a destination file', async () => {
    const cancel = jest.fn();
    const body = new ReadableStream({ cancel });
    send.mockResolvedValue({
      ContentLength: 99,
      Body: { transformToWebStream: () => body },
    });
    const target = join(directory, 'segment.mp4');
    await expect(
      service.downloadRecording(
        'recordings/part.mp4',
        target,
        100n,
        new AbortController().signal,
      ),
    ).rejects.toThrow('size mismatch');
    expect(cancel).toHaveBeenCalled();
    await expect(stat(target)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('copies private source data with an encoded key and MP4 metadata', async () => {
    send.mockResolvedValue({});
    await service.copyRecording(
      'recordings/a b/part.mp4',
      'recordings/final.mp4',
    );
    const [command] = send.mock.calls[0] as [CopyObjectCommand];
    expect(command).toBeInstanceOf(CopyObjectCommand);
    expect(command.input).toMatchObject({
      CopySource: 'private-test-bucket/recordings/a%20b/part.mp4',
      Key: 'recordings/final.mp4',
      ContentType: 'video/mp4',
    });
    expect(command.input).not.toHaveProperty('ACL');
  });
});
