jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, copyFile, stat, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import type { MeetingRecordingSegment } from '@prisma/client';
import type { S3Service } from '../../../infrastructure/s3/s3.service';
import { MeetingRecordingMediaService } from './meeting-recording-media.service';

// CI and local verification supply a real FFmpeg binary; no AWS is required.
const mediaTests = process.env.RECORDING_FFMPEG_PATH ? describe : describe.skip;
mediaTests('real MP4 segment assembly', () => {
  const exec = promisify(execFile);
  const binary = process.env.RECORDING_FFMPEG_PATH!;
  let root: string;
  let service: MeetingRecordingMediaService;
  let segments: MeetingRecordingSegment[];
  let download: jest.Mock;
  let previousRoot: string | undefined;
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'recording-assembly-'));
    previousRoot = process.env.RECORDING_WORK_ROOT;
    process.env.RECORDING_WORK_ROOT = join(root, 'work');
    const clips = [join(root, 'red.mp4'), join(root, 'blue.mp4')];
    for (const [index, color] of ['red', 'blue'].entries()) {
      await exec(
        binary,
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-y',
          '-f',
          'lavfi',
          '-i',
          `color=c=${color}:s=320x180:r=30:d=1`,
          '-f',
          'lavfi',
          '-i',
          `sine=frequency=${440 + index * 440}:sample_rate=48000:duration=1`,
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-shortest',
          clips[index],
        ],
        { windowsHide: true },
      );
    }
    segments = await Promise.all(
      clips.map(
        async (path, index) =>
          ({
            index,
            s3Key: path,
            sizeBytes: (await stat(path, { bigint: true })).size,
            startedAt: new Date(index * 60_000),
            stoppedAt: new Date(index * 60_000 + 1000),
            durationSeconds: 1,
          }) as MeetingRecordingSegment,
      ),
    );
    download = jest.fn(async (key: string, target: string) => {
      await copyFile(key, target);
    });
    service = new MeetingRecordingMediaService({
      downloadRecording: download,
    } as unknown as S3Service);
    await service.onModuleInit();
    expect(service.isAvailable()).toBe(true);
  }, 30_000);
  afterAll(async () => {
    if (previousRoot === undefined) delete process.env.RECORDING_WORK_ROOT;
    else process.env.RECORDING_WORK_ROOT = previousRoot;
    if (root && root.startsWith(join(tmpdir(), 'recording-assembly-')))
      await rm(root, { recursive: true, force: true });
  });
  it('creates a playable MP4 with both colors and audio, excluding the 59-second pause gap', async () => {
    const output = await service.assemble(
      randomUUID(),
      segments,
      new AbortController().signal,
    );
    const { stderr } = await exec(
      binary,
      ['-hide_banner', '-i', output, '-f', 'null', '-'],
      { windowsHide: true },
    );
    expect(stderr).toContain('Video: h264');
    expect(stderr).toContain('Audio: aac');
    const duration = /Duration: (\d+):(\d+):([\d.]+)/.exec(stderr)!;
    const seconds =
      Number(duration[1]) * 3600 +
      Number(duration[2]) * 60 +
      Number(duration[3]);
    expect(seconds).toBeGreaterThan(1.9);
    expect(seconds).toBeLessThan(2.2);
    for (const [index, time] of [0.4, 1.4].entries()) {
      const { stdout } = await exec(
        binary,
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-ss',
          String(time),
          '-i',
          output,
          '-frames:v',
          '1',
          '-vf',
          'scale=1:1',
          '-f',
          'rawvideo',
          '-pix_fmt',
          'rgb24',
          '-',
        ],
        { encoding: 'buffer', windowsHide: true },
      );
      const dominant = index === 0 ? 0 : 2;
      expect(stdout[dominant]).toBeGreaterThan(200);
      expect(stdout[index === 0 ? 2 : 0]).toBeLessThan(30);
    }
    const bytes = await readFile(output);
    expect(bytes.indexOf(Buffer.from('moov'))).toBeLessThan(
      bytes.indexOf(Buffer.from('mdat')),
    );
  }, 30_000);
  it('reuses verified output on upload retry instead of downloading and merging again', async () => {
    const id = randomUUID();
    const first = await service.assemble(
      id,
      segments,
      new AbortController().signal,
    );
    download.mockClear();
    expect(
      await service.assemble(id, segments, new AbortController().signal),
    ).toBe(first);
    expect(download).not.toHaveBeenCalled();
  });
  it('rejects aborted work and traversal before downloading media', async () => {
    download.mockClear();
    const controller = new AbortController();
    controller.abort();
    await expect(
      service.assemble(randomUUID(), segments, controller.signal),
    ).rejects.toThrow();
    await expect(
      service.assemble('../other', segments, new AbortController().signal),
    ).rejects.toThrow('Invalid recording work id');
    expect(download).not.toHaveBeenCalled();
  });
  it('publishes one immutable output even when two lease attempts overlap', async () => {
    const id = randomUUID();
    const paths = await Promise.all([
      service.assemble(id, segments, new AbortController().signal),
      service.assemble(id, segments, new AbortController().signal),
    ]);
    expect(paths[0]).toBe(paths[1]);
    const before = await readFile(paths[0]);
    await service.assemble(id, segments, new AbortController().signal);
    expect(await readFile(paths[0])).toEqual(before);
  });
});
