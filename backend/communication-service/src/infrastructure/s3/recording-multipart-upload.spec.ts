jest.mock('fs/promises', () => ({
  ...jest.requireActual<object>('fs/promises'),
  open: jest.fn(),
}));
import { open } from 'fs/promises';
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  ListPartsCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import {
  RecordingMultipartUploader,
  parseRecordingUploadState,
  RecordingUploadState,
} from './recording-multipart-upload';

describe('resumable recording upload', () => {
  const partSize = 16 * 1024 * 1024;
  const key = 'recordings/file.mp4';
  let fileSize: number;
  let send: jest.SpyInstance;
  let close: jest.Mock;
  let uploader: RecordingMultipartUploader;
  const partResult = (number: number) => ({
    ETag: `part-${number}`,
    ChecksumCRC32: `crc-${number}`,
  });
  const state = (): RecordingUploadState => ({
    key,
    uploadId: 'upload',
    uploadToken: 'token',
    sizeBytes: fileSize,
    modifiedAtMs: 100,
    partSize,
    parts: [{ PartNumber: 1, ...partResult(1) }],
  });
  const commands = () => send.mock.calls.map((call: unknown[]) => call[0]);
  beforeEach(() => {
    fileSize = partSize + 1024;
    process.env.MEETING_RECORDING_UPLOAD_CONCURRENCY = '3';
    close = jest.fn();
    jest.mocked(open).mockResolvedValue({
      stat: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ size: fileSize, mtimeMs: 100 }),
        ),
      read: jest
        .fn()
        .mockImplementation(
          (_buffer: Buffer, _offset: number, length: number) =>
            Promise.resolve({ bytesRead: length }),
        ),
      close,
    } as unknown as Awaited<ReturnType<typeof open>>);
    send = jest.spyOn(S3Client.prototype, 'send');
    send.mockImplementation((command: unknown) => {
      if (command instanceof CreateMultipartUploadCommand)
        return Promise.resolve({ UploadId: 'upload' });
      if (command instanceof UploadPartCommand)
        return Promise.resolve(partResult(command.input.PartNumber!));
      return Promise.resolve({});
    });
    uploader = new RecordingMultipartUploader(
      new S3Client({ region: 'us-east-1' }),
      'test-bucket',
    );
  });
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.MEETING_RECORDING_UPLOAD_CONCURRENCY;
  });

  it('uses bounded parallel buffers and completes with ordered part checksums', async () => {
    fileSize = partSize * 8;
    let active = 0;
    let peak = 0;
    send.mockImplementation((command: unknown) => {
      if (command instanceof CreateMultipartUploadCommand)
        return Promise.resolve({ UploadId: 'upload' });
      if (command instanceof UploadPartCommand) {
        active += 1;
        peak = Math.max(peak, active);
        return new Promise((resolve) =>
          setImmediate(() => {
            active -= 1;
            resolve(partResult(command.input.PartNumber!));
          }),
        );
      }
      return Promise.resolve({});
    });
    await uploader.upload('backup.mp4', key);
    expect(peak).toBe(3);
    const uploads = commands().filter(
      (command): command is UploadPartCommand =>
        command instanceof UploadPartCommand,
    );
    expect(uploads).toHaveLength(8);
    for (const command of uploads)
      expect(command.input.Body).toHaveLength(partSize);
    const complete = commands().find(
      (command): command is CompleteMultipartUploadCommand =>
        command instanceof CompleteMultipartUploadCommand,
    )!;
    expect(complete.input.MultipartUpload?.Parts).toEqual(
      Array.from({ length: 8 }, (_, index) => ({
        PartNumber: index + 1,
        ...partResult(index + 1),
      })),
    );
    expect(complete.input.IfNoneMatch).toBe('*');
  });
  it('preserves successful parts in a failed batch and resumes only missing parts', async () => {
    let saved: RecordingUploadState | undefined;
    let fail = true;
    const checkpoint = jest
      .fn()
      .mockImplementation((value: RecordingUploadState | null) => {
        saved = value
          ? (JSON.parse(JSON.stringify(value)) as RecordingUploadState)
          : undefined;
        return Promise.resolve();
      });
    send.mockImplementation((command: unknown) => {
      if (command instanceof CreateMultipartUploadCommand)
        return Promise.resolve({ UploadId: 'upload' });
      if (command instanceof ListPartsCommand)
        return Promise.resolve({
          Parts: [{ PartNumber: 1, Size: partSize, ...partResult(1) }],
        });
      if (command instanceof UploadPartCommand)
        return fail && command.input.PartNumber === 2
          ? Promise.reject(new Error('network'))
          : Promise.resolve(partResult(command.input.PartNumber!));
      return Promise.resolve({});
    });
    await expect(
      uploader.upload('backup.mp4', key, { onCheckpoint: checkpoint }),
    ).rejects.toThrow('network');
    expect(saved?.parts.map((part) => part.PartNumber)).toEqual([1]);
    expect(
      commands().some(
        (command) => command instanceof AbortMultipartUploadCommand,
      ),
    ).toBe(false);
    fail = false;
    await uploader.upload('backup.mp4', key, {
      state: saved,
      onCheckpoint: checkpoint,
    });
    const uploads = commands().filter(
      (command): command is UploadPartCommand =>
        command instanceof UploadPartCommand,
    );
    expect(uploads.map((command) => command.input.PartNumber)).toEqual([
      1, 2, 2,
    ]);
    expect(
      commands().filter(
        (command) => command instanceof CreateMultipartUploadCommand,
      ),
    ).toHaveLength(1);
  });
  it('recognizes completion after losing the response without uploading again', async () => {
    send.mockImplementation((command: unknown) => {
      if (command instanceof ListPartsCommand)
        return Promise.reject(
          Object.assign(new Error('gone'), { name: 'NoSuchUpload' }),
        );
      if (command instanceof HeadObjectCommand)
        return Promise.resolve({
          ContentLength: fileSize,
          Metadata: { 'recording-upload-token': 'token' },
        });
      throw new Error('must not upload again');
    });
    await expect(
      uploader.upload('backup.mp4', key, {
        state: state(),
        onCheckpoint: async () => {},
      }),
    ).resolves.toBe(BigInt(fileSize));
    expect(commands()).toHaveLength(2);
  });
  it('does not trust an existing object with the wrong upload identity', async () => {
    send.mockImplementation((command: unknown) => {
      if (command instanceof ListPartsCommand)
        return Promise.reject(
          Object.assign(new Error('gone'), { name: 'NoSuchUpload' }),
        );
      if (command instanceof HeadObjectCommand)
        return Promise.resolve({
          ContentLength: fileSize,
          Metadata: { 'recording-upload-token': 'other' },
        });
      if (command instanceof CreateMultipartUploadCommand)
        return Promise.resolve({ UploadId: 'new' });
      if (command instanceof UploadPartCommand)
        return Promise.resolve(partResult(command.input.PartNumber!));
      return Promise.resolve({});
    });
    await uploader.upload('backup.mp4', key, {
      state: state(),
      onCheckpoint: async () => {},
    });
    expect(
      commands().filter((command) => command instanceof UploadPartCommand),
    ).toHaveLength(2);
  });
  it('reuploads persisted parts when remote size/checksum verification fails', async () => {
    send.mockImplementation((command: unknown) =>
      command instanceof ListPartsCommand
        ? Promise.resolve({
            Parts: [{ PartNumber: 1, Size: 10, ...partResult(1) }],
          })
        : command instanceof UploadPartCommand
          ? Promise.resolve(partResult(command.input.PartNumber!))
          : Promise.resolve({}),
    );
    await uploader.upload('backup.mp4', key, {
      state: state(),
      onCheckpoint: async () => {},
    });
    expect(
      commands().filter((command) => command instanceof UploadPartCommand),
    ).toHaveLength(2);
  });
  it('aborts and clears invalid backup data even with durable state', async () => {
    jest.mocked(open).mockResolvedValue({
      stat: jest.fn().mockResolvedValue({ size: fileSize, mtimeMs: 100 }),
      read: jest.fn().mockResolvedValue({ bytesRead: 0 }),
      close,
    } as unknown as Awaited<ReturnType<typeof open>>);
    const checkpoint = jest.fn().mockResolvedValue(undefined);
    await expect(
      uploader.upload('backup.mp4', key, { onCheckpoint: checkpoint }),
    ).rejects.toThrow('Backup was truncated');
    expect(
      commands().some(
        (command) => command instanceof AbortMultipartUploadCommand,
      ),
    ).toBe(true);
    expect(checkpoint).toHaveBeenLastCalledWith(null);
  });
  it('stops an aborted operation before dispatching to S3', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      uploader.upload('backup.mp4', key, { signal: controller.signal }),
    ).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
  it('rejects corrupt and duplicate part checkpoints', () => {
    expect(parseRecordingUploadState(state())).toEqual(state());
    expect(
      parseRecordingUploadState({
        ...state(),
        parts: [state().parts[0], state().parts[0]],
      }),
    ).toBeUndefined();
    expect(
      parseRecordingUploadState({ ...state(), partSize: 1 }),
    ).toBeUndefined();
    expect(
      parseRecordingUploadState({ uploadId: 'incomplete' }),
    ).toBeUndefined();
  });
});
