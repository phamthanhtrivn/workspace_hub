import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { mkdir, lstat, writeFile, link, rm, statfs } from 'fs/promises';
import { randomUUID } from 'crypto';
import { resolve, sep, join } from 'path';
import { tmpdir } from 'os';
import type { MeetingRecordingSegment } from '@prisma/client';
import { S3Service } from '../../../infrastructure/s3/s3.service';

@Injectable()
export class MeetingRecordingMediaService implements OnModuleInit {
  private readonly logger = new Logger(MeetingRecordingMediaService.name);
  private available = false;
  private readonly binary = process.env.RECORDING_FFMPEG_PATH || 'ffmpeg';
  private readonly root = resolve(
    process.env.RECORDING_WORK_ROOT || join(tmpdir(), 'workspace-recordings'),
  );

  constructor(private readonly s3: S3Service) {}

  async onModuleInit() {
    if (process.env.MEETING_RECORDING_PAUSE_ENABLED === 'false') return;
    try {
      await promisify(execFile)(this.binary, ['-version'], {
        timeout: 5000,
        windowsHide: true,
      });
      this.available = true;
    } catch {
      this.logger.warn(
        'Pause/Resume unavailable: configure FFmpeg on control and upload workers',
      );
    }
  }

  isAvailable() {
    return this.available;
  }

  async assemble(
    id: string,
    segments: MeetingRecordingSegment[],
    signal: AbortSignal,
  ) {
    if (!this.available)
      throw new Error('Recording media worker is unavailable');
    signal.throwIfAborted();
    const attempt = randomUUID();
    const directory = this.directory(id);
    await mkdir(directory, { recursive: true });
    const final = join(directory, 'recording.mp4');
    if (await this.validFile(final)) return final;
    const total = segments.reduce((size, part) => size + part.sizeBytes, 0n);
    let remaining = 0n;
    for (const part of segments) {
      if (
        !(await this.validFile(
          join(directory, `part-${part.index}.mp4`),
          part.sizeBytes,
        ))
      )
        remaining += part.sizeBytes;
    }
    const disk = await statfs(directory, { bigint: true });
    if (disk.bavail * disk.bsize < total + remaining + 256n * 1024n * 1024n)
      throw new Error('Insufficient recording work space');
    for (const part of segments) {
      signal.throwIfAborted();
      const path = join(directory, `part-${part.index}.mp4`);
      if (await this.validFile(path, part.sizeBytes)) continue;
      const temporary = `${path}.${attempt}.downloading`;
      try {
        await this.s3.downloadRecording(
          part.s3Key,
          temporary,
          part.sizeBytes,
          signal,
        );
        if (!(await this.validFile(temporary, part.sizeBytes)))
          throw new Error('Segment download incomplete');
        signal.throwIfAborted();
        await this.publishFile(temporary, path, part.sizeBytes);
      } finally {
        await rm(temporary, { force: true });
      }
    }
    const manifest = `segments-${attempt}.txt`;
    await writeFile(
      join(directory, manifest),
      segments.map((part) => `file 'part-${part.index}.mp4'`).join('\n'),
    );
    const temporary = join(directory, `recording-${attempt}.building.mp4`);
    try {
      await this.concat(directory, manifest, temporary, signal);
      signal.throwIfAborted();
      if (!(await this.validFile(temporary)))
        throw new Error('Recording assembly is empty');
      await this.publishFile(temporary, final);
    } finally {
      await rm(temporary, { force: true });
      await rm(join(directory, manifest), { force: true });
    }
    return final;
  }

  async cleanup(id: string) {
    await rm(this.directory(id), { recursive: true, force: true });
  }

  private directory(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id))
      throw new Error('Invalid recording work id');
    const directory = resolve(this.root, id);
    if (!directory.startsWith(this.root + sep))
      throw new Error('Invalid recording work path');
    return directory;
  }

  private async validFile(path: string, size?: bigint) {
    try {
      const stat = await lstat(path, { bigint: true });
      return (
        stat.isFile() &&
        !stat.isSymbolicLink() &&
        stat.size > 0n &&
        (size === undefined || stat.size === size)
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  private async publishFile(source: string, target: string, size?: bigint) {
    try {
      await link(source, target);
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code !== 'EEXIST' ||
        !(await this.validFile(target, size))
      )
        throw error;
    }
  }

  private async concat(
    directory: string,
    manifest: string,
    output: string,
    signal: AbortSignal,
  ) {
    signal.throwIfAborted();
    await new Promise<void>((resolve, reject) => {
      const process = spawn(
        this.binary,
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-nostdin',
          '-y',
          '-f',
          'concat',
          '-safe',
          '1',
          '-i',
          manifest,
          '-map',
          '0:v:0',
          '-map',
          '0:a:0?',
          '-c',
          'copy',
          '-movflags',
          '+faststart',
          output,
        ],
        {
          cwd: directory,
          windowsHide: true,
          signal,
          timeout: 10 * 60_000,
          stdio: ['ignore', 'ignore', 'pipe'],
        },
      );
      let message = '';
      process.stderr.on('data', (chunk: Buffer) => {
        message = (message + chunk.toString()).slice(-4096);
      });
      process.on('error', reject);
      process.on('close', (code) =>
        code === 0
          ? resolve()
          : reject(
              new Error(`Recording assembly failed (${code}): ${message}`),
            ),
      );
    });
  }
}
