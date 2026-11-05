import 'reflect-metadata';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PomodoroAudioAccessService } from './pomodoro-audio-access.service';
import { POMODORO_AUDIO_URL_TTL_SECONDS } from './constants/pomodoro-audio.constants';

const names = ['AWS_REGION', 'AWS_S3_BUCKET_NAME', 'AWS_ACCESS_KEY', 'AWS_SECRET_KEY'] as const;
const previous = names.map((name) => process.env[name]);
process.env.AWS_REGION = 'ap-southeast-1';
process.env.AWS_S3_BUCKET_NAME = 'private-audio-test';
process.env.AWS_ACCESS_KEY = 'test-access-key';
process.env.AWS_SECRET_KEY = 'test-secret-key';
after(() => names.forEach((name, index) => {
  if (previous[index] === undefined) delete process.env[name];
  else process.env[name] = previous[index];
}));

function fixture(s3Key: string | null) {
  const prisma = { pomodoroAudio: { findFirst: async () => s3Key === null ? null : { s3Key } } };
  return new PomodoroAudioAccessService(prisma as never);
}

test('inactive audio and keys outside the audio prefix cannot receive signed URLs', async () => {
  for (const key of [null, 'documents/user/file', 'pomodoro-audio/../documents/file']) {
    const service = fixture(key);
    try { await assert.rejects(service.getAccessUrl('audio-id'), NotFoundException); }
    finally { service.onModuleDestroy(); }
  }
});

test('audio signing requires configured storage and fails before looking up content', async () => {
  const service = fixture('pomodoro-audio/rain.mp3');
  delete process.env.AWS_S3_BUCKET_NAME;
  try { await assert.rejects(service.getAccessUrl('audio-id'), ServiceUnavailableException); }
  finally {
    process.env.AWS_S3_BUCKET_NAME = 'private-audio-test';
    service.onModuleDestroy();
  }
});

test('active library audio receives a time limited S3 URL without a public fallback', async () => {
  const service = fixture('pomodoro-audio/rain.mp3');
  try {
    const { data } = await service.getAccessUrl('audio-id');
    const url = new URL(data.url);
    assert.equal(url.hostname, 'private-audio-test.s3.ap-southeast-1.amazonaws.com');
    assert.equal(url.pathname, '/pomodoro-audio/rain.mp3');
    assert.equal(url.searchParams.get('X-Amz-Expires'), String(POMODORO_AUDIO_URL_TTL_SECONDS));
    assert.ok(url.searchParams.has('X-Amz-Signature'));
    assert.ok(Date.parse(data.expiresAt) > Date.now());
  } finally { service.onModuleDestroy(); }
});
