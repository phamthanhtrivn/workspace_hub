/* eslint-disable @typescript-eslint/require-await -- Test doubles implement SDK async contracts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InternalServerErrorException } from '@nestjs/common';
import { S3Service } from './s3.service';
import type { UploadIntentService } from './upload-intent.service';

function providerError(name: string, status: number) {
  return Object.assign(new Error('private provider details and object path'), {
    name,
    $metadata: { httpStatusCode: status, requestId: 'request-id' },
  });
}

function setup(outcomes: Array<Error | object>) {
  const service = new S3Service({} as UploadIntentService);
  const commands: string[] = [];
  const logs: unknown[] = [];
  const internals = service as unknown as {
    s3Client: { send: (command: object) => Promise<unknown> };
    logger: { error: (message: unknown) => void };
  };
  internals.s3Client.send = async (command) => {
    commands.push(command.constructor.name);
    const outcome = outcomes.shift();
    assert.ok(outcome, 'unexpected S3 operation');
    if (outcome instanceof Error) throw outcome;

    return outcome;
  };
  internals.logger.error = (message) => logs.push(message);

  return { service, commands, logs };
}

void test('successful deletion does not require extra read permissions', async () => {
  const f = setup([{}]);
  await f.service.deleteFile('documents/test-only');
  assert.deepEqual(f.commands, ['DeleteObjectCommand']);
});

void test('an absent legacy object completes cleanup only after the bucket is verified', async () => {
  const f = setup([
    providerError('AccessDenied', 403),
    providerError('NotFound', 404),
    {},
  ]);
  await f.service.deleteFile('module-snapshots/test-only');
  assert.deepEqual(f.commands, [
    'DeleteObjectCommand',
    'HeadObjectCommand',
    'HeadBucketCommand',
  ]);
  assert.deepEqual(f.logs, []);
});

void test('a present object still fails when deletion is denied and logs only safe provider metadata', async () => {
  const failure = providerError('AccessDenied', 403);
  const f = setup([failure, {}]);
  await assert.rejects(f.service.deleteFile('test-only'), (error: unknown) => {
    assert.ok(error instanceof InternalServerErrorException);
    assert.equal(error.cause, failure);

    return true;
  });
  assert.deepEqual(f.logs, [
    {
      event: 's3_object_deletion_failed',
      providerCode: 'AccessDenied',
      httpStatus: 403,
      requestId: 'request-id',
    },
  ]);
  assert.ok(!JSON.stringify(f.logs).includes('private provider details'));
});

void test('a denied or failed object check cannot discard the cleanup job', async () => {
  for (const checkError of [
    providerError('AccessDenied', 403),
    providerError('TimeoutError', 500),
    providerError('NoSuchBucket', 404),
  ]) {
    const f = setup([providerError('AccessDenied', 403), checkError]);
    await assert.rejects(f.service.deleteFile('test-only'));
    assert.deepEqual(f.commands, ['DeleteObjectCommand', 'HeadObjectCommand']);
  }
});

void test('a missing or inaccessible bucket is never mistaken for a completed object cleanup', async () => {
  for (const bucketError of [
    providerError('NoSuchBucket', 404),
    providerError('AccessDenied', 403),
  ]) {
    const f = setup([
      providerError('AccessDenied', 403),
      providerError('NotFound', 404),
      bucketError,
    ]);
    await assert.rejects(f.service.deleteFile('test-only'));
    assert.equal(f.logs.length, 1);
  }
});
