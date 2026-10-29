const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const dir = path.resolve(root, '../.tmp/ai-native-stack');
const state = JSON.parse(fs.readFileSync(path.join(dir, 'state.json')));
const { owner, reader } = JSON.parse(fs.readFileSync(path.join(dir, 'test-identities.json')));
const requireComm = createRequire(path.join(root, 'backend/communication-service/package.json'));
const { PrismaClient } = requireComm('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: `postgresql://qa:${state.keys.pg}@127.0.0.1:${state.ports.pg}/communication_db` } } });
const { S3Client, PutObjectCommand } = requireComm('@aws-sdk/client-s3');
const s3 = new S3Client({ region: 'us-east-1', endpoint: `http://127.0.0.1:${state.ports.s3}`, credentials: { accessKeyId: 'fixture', secretAccessKey: 'fixture' }, forcePathStyle: true });
const report = { runAt: new Date().toISOString(), scope: 'Fixture completed recording metadata; actual signed S3 HTTP, Communication permissions, queue, FFmpeg, local Whisper, LLM and SQL. LiveKit capture is outside this test.', checks: [] };
const save = () => fs.writeFileSync(path.join(root, 'docs/testing/ai-comprehensive/native-meeting.json'), JSON.stringify(report, null, 2) + '\n');
async function request(method, id, user, status = [200, 201]) {
  const res = await fetch(`http://127.0.0.1:${state.ports.kong}/api/meetings/recordings/${id}/summary`, { method, headers: { authorization: `Bearer ${user.accessToken}` }, signal: AbortSignal.timeout(25000) });
  const text = await res.text();
  assert.ok(status.includes(res.status), `${method} summary ${res.status}: ${text.slice(0, 250)}`);
  return JSON.parse(text).data;
}
(async () => {
  const recordingId = randomUUID();
  const key = `meeting-recordings/${recordingId}/public-speech-sample.mp4`;
  const body = fs.readFileSync(path.resolve(dir, '../meeting-local-speech/sample.mp4'));
  await s3.send(new PutObjectCommand({ Bucket: 'ai-qa-files', Key: key, Body: body, ContentType: 'video/mp4' }));
  const meeting = await prisma.meeting.create({ data: { roomName: `qa-${recordingId}`, joinToken: randomUUID(), title: 'Public speech fixture QA', type: 'INSTANT', status: 'ENDED', createdBy: owner.userId, hostId: owner.userId } });
  await prisma.meetingRecording.create({ data: { id: recordingId, meetingId: meeting.id, startedBy: owner.userId, ownerId: owner.userId, title: 'Public speech fixture', status: 'COMPLETED', s3Key: key, sizeBytes: BigInt(body.length), durationSeconds: 12, mimeType: 'video/mp4', completedAt: new Date() } });
  report.recordingId = recordingId;
  await request('GET', recordingId, reader, [403, 404]);
  await request('POST', recordingId, reader, [403, 404]);
  report.checks.push('Unshared reader cannot read or start summary'); save();
  const started = performance.now();
  await request('POST', recordingId, owner);
  for (let n = 0; n < 300; n++) {
    const current = await request('GET', recordingId, owner);
    if (current.status === 'FAILED') throw Error(`Meeting pipeline failed: ${current.error}`);
    if (current.status === 'COMPLETED') {
      assert.ok(current.content.length > 20 && current.transcribedChunks > 0);
      report.checks.push('Owner start and completed summary', 'Real FFmpeg and Whisper transcript checkpoint', 'Configured LLM summary persisted and readable');
      report.durationMs = Math.round(performance.now() - started);
      const repeated = await request('POST', recordingId, owner);
      assert.equal(repeated.status, 'COMPLETED');
      report.checks.push('Repeated start returns existing completion'); report.passed = true; save();
      console.log(JSON.stringify(report)); return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw Error('Meeting summary exceeded 300s');
})().catch(error => { report.passed = false; report.error = error.message; save(); console.error(error.message); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); s3.destroy(); });
