jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
jest.mock('fs/promises', () => ({
  ...jest.requireActual<object>('fs/promises'),
  open: jest.fn(),
}));

import { open } from 'fs/promises';
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { S3Service } from './s3.service';

describe('recording backup multipart upload', () => {
  const partSize = 16 * 1024 * 1024;
  let send: jest.SpyInstance;
  let close: jest.Mock;
  let service: S3Service;

  beforeEach(() => {
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_S3_BUCKET_NAME = 'private-test-bucket';
    process.env.AWS_ACCESS_KEY = 'test-key';
    process.env.AWS_SECRET_KEY = 'test-secret';
    process.env.MEETING_RECORDING_UPLOAD_CONCURRENCY = '1';
    close = jest.fn();
    jest.mocked(open).mockResolvedValue({
      stat: jest.fn().mockResolvedValue({ size: partSize + 1024 }),
      read: jest
        .fn()
        .mockImplementation(
          (_buffer: Buffer, _offset: number, length: number) =>
            Promise.resolve({ bytesRead: length }),
        ),
      close,
    } as unknown as Awaited<ReturnType<typeof open>>);
    send = jest.spyOn(S3Client.prototype, 'send');
    service = new S3Service();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.MEETING_RECORDING_UPLOAD_CONCURRENCY;
  });

  it('uploads bounded parts and completes only after all ETags are returned', async () => {
    send
      .mockResolvedValueOnce({ UploadId: 'upload' })
      .mockResolvedValueOnce({ ETag: 'part-1', ChecksumCRC32: 'crc-1' })
      .mockResolvedValueOnce({ ETag: 'part-2', ChecksumCRC32: 'crc-2' })
      .mockResolvedValueOnce({});
    await expect(
      service.uploadRecordingBackup('backup.mp4', 'recordings/file.mp4'),
    ).resolves.toBe(BigInt(partSize + 1024));
    const commands = send.mock.calls.map((call: unknown[]) => call[0]);
    expect(commands[0]).toBeInstanceOf(CreateMultipartUploadCommand);
    expect(commands[1]).toBeInstanceOf(UploadPartCommand);
    expect((commands[1] as UploadPartCommand).input.Body).toHaveLength(
      partSize,
    );
    expect((commands[2] as UploadPartCommand).input.Body).toHaveLength(1024);
    expect(commands[3]).toBeInstanceOf(CompleteMultipartUploadCommand);
    expect(
      (commands[3] as CompleteMultipartUploadCommand).input.MultipartUpload
        ?.Parts,
    ).toEqual([
      { PartNumber: 1, ETag: 'part-1', ChecksumCRC32: 'crc-1' },
      { PartNumber: 2, ETag: 'part-2', ChecksumCRC32: 'crc-2' },
    ]);
    expect(close).toHaveBeenCalled();
  });
  it('aborts an incomplete upload on failure and closes the file', async () => {
    send
      .mockResolvedValueOnce({ UploadId: 'upload' })
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({});
    await expect(
      service.uploadRecordingBackup('backup.mp4', 'recordings/file.mp4'),
    ).rejects.toThrow('network unavailable');
    const commands = send.mock.calls.map((call: unknown[]) => call[0]);
    expect(commands[2]).toBeInstanceOf(AbortMultipartUploadCommand);
    expect(
      send.mock.calls.some(
        (call: unknown[]) => call[0] instanceof CompleteMultipartUploadCommand,
      ),
    ).toBe(false);
    expect(close).toHaveBeenCalled();
  });
  it('does not silently upload a truncated file', async () => {
    jest.mocked(open).mockResolvedValue({
      stat: jest.fn().mockResolvedValue({ size: 100 }),
      read: jest.fn().mockResolvedValue({ bytesRead: 0 }),
      close,
    } as unknown as Awaited<ReturnType<typeof open>>);
    send
      .mockResolvedValueOnce({ UploadId: 'upload' })
      .mockResolvedValueOnce({});
    await expect(
      service.uploadRecordingBackup('backup.mp4', 'recordings/file.mp4'),
    ).rejects.toThrow('Backup was truncated');
    const commands = send.mock.calls.map((call: unknown[]) => call[0]);
    expect(commands[1]).toBeInstanceOf(AbortMultipartUploadCommand);
  });
});
