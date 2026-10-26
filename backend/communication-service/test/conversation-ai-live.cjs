// Opt-in: creates synthetic chats, uses the configured model, and removes its fixtures.
if (!process.argv.includes('--run')) {
  console.log(
    'Run with --run; add --existing-server to test the normal server on port 8083.',
  );
  process.exit(0);
}
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID, createHmac } = require('node:crypto');
const { setTimeout: pause } = require('node:timers/promises');
const {
  loadServiceEnvironment,
} = require('../dist/common/config/load-service-env');
loadServiceEnvironment();
const { NestFactory } = require('@nestjs/core');
const { Module } = require('@nestjs/common');
const { PrismaClient } = require('@prisma/client');
const { MessageModule } = require('../dist/modules/message/message.module');
const {
  DirectMessageModule,
} = require('../dist/modules/direct-message/direct-message.module');
const {
  RuntimeConfigModule,
} = require('../dist/common/config/runtime-config.module');
const {
  ResponseInterceptor,
} = require('../dist/common/interceptors/response.interceptor');
const { io } = require('../../../frontend/web/node_modules/socket.io-client');
class LiveModule {}
Module({ imports: [RuntimeConfigModule, MessageModule, DirectMessageModule] })(
  LiveModule,
);
const prisma = new PrismaClient();
const actor = randomUUID(),
  recipient = randomUUID(),
  spaceId = randomUUID();
const channelId = randomUUID(),
  conversationId = randomUUID();
const base = 'http://127.0.0.1:8083';
const documentBacked = process.argv.includes('--document-attachment');
const attachmentRequested = process.argv.includes('--attachment') || documentBacked;
let attachmentFixture, attachmentStorage, attachmentKey, documentDb, documentItemId, tableMessageId;
const browserOnly = process.argv.includes('--browser-only');
const browserRequested = browserOnly || process.argv.includes('--browser');
let app,
  socket,
  stage = 'startup',
  created = false;
const received = [];
async function until(read, check, timeout = 150000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await read();
    if (check(value)) return value;
    await pause(250);
  }
  throw Error('Timed out at ' + stage);
}
async function send(scope, content, threadParentId, expectedStatus = 201) {
  const route =
    scope === 'CHANNEL'
      ? 'channels/' + channelId
      : 'direct-conversations/' + conversationId;
  const response = await fetch(base + '/api/' + route + '/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': actor },
    body: JSON.stringify({ content, type: 'TEXT', threadParentId }),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(
    response.status,
    expectedStatus,
    'Unexpected send status at ' + stage,
  );
  return (await response.json()).data?.id;
}
async function answer(
  requestId,
  expectedReplies,
  scope = 'CHANNEL',
  parent = null,
) {
  const rows = await until(
    () =>
      prisma.$queryRaw`SELECT status FROM conversation_ai_requests WHERE id=${requestId}::uuid`,
    (rows) =>
      rows[0] && ['COMPLETED', 'FAILED', 'CANCELLED'].includes(rows[0].status),
  );
  assert.equal(rows[0].status, 'COMPLETED', 'AI request failed at ' + stage);
  await until(
    async () => received,
    (messages) => messages.length >= expectedReplies,
    15000,
  );
  const message = received[expectedReplies - 1];
  assert.equal(
    message.chatId,
    scope === 'CHANNEL' ? channelId : conversationId,
  );
  assert.equal(message.threadParentId, parent);
  assert.equal(message.senderId, '00000000-0000-4000-8000-0000000000a1');
  if (parent)
    assert.ok(
      message.threadFollowers.includes(actor),
      'Missing thread follower metadata',
    );
  console.log(
    JSON.stringify({ stage, generation: true, socketDelivery: true }),
  );
  return message;
}
(async () => {
  assert.ok(
    process.env.JWT_SECRET_KEY,
    'Configure matching gateway JWT key before live test',
  );
  assert.ok(
    (
      await fetch('http://127.0.0.1:8087/health', {
        signal: AbortSignal.timeout(5000),
      })
    ).ok,
  );
  await until(
    async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    },
    (ready) => ready,
    60000,
  );
  await prisma.$transaction(async (tx) => {
    await tx.space.create({
      data: {
        id: spaceId,
        name: 'Synthetic AI verification',
        createdBy: actor,
      },
    });
    await tx.spaceMember.create({
      data: { spaceId, userId: actor, role: 'ADMIN' },
    });
    await tx.channel.create({
      data: {
        id: channelId,
        spaceId,
        name: 'ai-qa-' + channelId,
        createdBy: actor,
      },
    });
    await tx.channelMember.create({ data: { channelId, userId: actor } });
    await tx.userProfileSnapshot.createMany({
      data: [actor, recipient].map((userId) => ({
        userId,
        fullName: 'Synthetic QA',
        email: 'qa@example.test',
      })),
    });
    await tx.directConversation.create({
      data: {
        id: conversationId,
        participants: { create: [{ userId: actor }, { userId: recipient }] },
      },
    });
    await tx.directMessage.create({
      data: {
        conversationId,
        senderId: actor,
        content: 'Synthetic chat initialized.',
        type: 'TEXT',
      },
    });
  });
  created = true;
  if (process.argv.includes('--existing-server')) {
    await until(
      async () => {
        try {
          return (
            await fetch(base + '/health', { signal: AbortSignal.timeout(2000) })
          ).ok;
        } catch {
          return false;
        }
      },
      (ready) => ready,
      60000,
    );
  }
  if (!process.argv.includes('--existing-server')) {
    app = await NestFactory.create(LiveModule, { logger: false });
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.listen(8083, '0.0.0.0');
  }
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: actor,
      iss: process.env.JWT_ISSUER || 'workspace-hub',
      role: 'USER',
      exp: Math.floor(Date.now() / 1000) + 600,
    }),
  ).toString('base64url');
  const token = `${header}.${payload}.${createHmac('sha256', process.env.JWT_SECRET_KEY).update(`${header}.${payload}`).digest('base64url')}`;
  socket = io(base, {
    path: '/communication.io',
    transports: ['websocket'],
    auth: { token },
    reconnection: false,
    autoConnect: false,
  });
  socket.on('new_message', (message) => {
    if (
      [channelId, conversationId].includes(message.chatId) &&
      message.type === 'AI'
    )
      received.push(message);
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error('Socket authentication timeout')),
      10000,
    );
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', () => {
      clearTimeout(timer);
      reject(Error('Socket connection rejected'));
    });
    socket.connect();
  });
  await pause(200);
  if (!browserOnly) {
    stage = 'channel general question';
    const general = await send('CHANNEL', '@ai Trả lời đúng một từ: OK');
    assert.match((await answer(general, 1)).content, /OK/i);
    await pause(Number(process.env.AI_LIVE_GAP_MS || 35000));
    stage = 'channel summary of last 30 messages';
    for (let i = 0; i < 35; i++)
      await prisma.message.create({
        data: {
          channelId,
          senderId: actor,
          type: 'TEXT',
          content:
            i < 5
              ? 'SYNTHETIC_OLD_EXCLUDED'
              : 'Nhóm QA thống nhất họp lúc 09:00 và hoàn tất kiểm thử vào thứ Sáu.',
          createdAt: new Date(Date.now() - 80000 + i * 1000),
        },
      });
    const summary = await send('CHANNEL', '@ai tóm tắt hội thoại');
    const summaryReply = await answer(summary, 2);
    assert.ok(summaryReply.content.length > 20);
    assert.ok(!summaryReply.content.includes('SYNTHETIC_OLD_EXCLUDED'));
    await pause(Number(process.env.AI_LIVE_GAP_MS || 35000));
    stage = 'channel thread answer and followers';
    const root = await prisma.message.create({
      data: {
        channelId,
        senderId: actor,
        type: 'TEXT',
        content: 'Synthetic channel thread root',
      },
    });
    const thread = await send(
      'CHANNEL',
      '@ai Trả lời đúng một từ: OK',
      root.id,
    );
    await answer(thread, 3, 'CHANNEL', root.id);
    assert.equal(
      (await prisma.message.findUnique({ where: { id: root.id } }))
        .threadReplyCount,
      2,
    );
    await pause(Number(process.env.AI_LIVE_GAP_MS || 35000));
    stage = 'direct general question';
    const direct = await send('DIRECT_MESSAGE', '@ai Trả lời đúng một từ: OK');
    await answer(direct, 4, 'DIRECT_MESSAGE');
    await pause(Number(process.env.AI_LIVE_GAP_MS || 35000));
    stage = 'direct thread summary and followers';
    const directRoot = await prisma.directMessage.create({
      data: {
        conversationId,
        senderId: actor,
        type: 'TEXT',
        content: 'Nhóm QA chốt kiểm thử vào thứ Sáu lúc 09:00.',
      },
    });
    const directThread = await send(
      'DIRECT_MESSAGE',
      '@ai tóm tắt hội thoại',
      directRoot.id,
    );
    await answer(directThread, 5, 'DIRECT_MESSAGE', directRoot.id);
    assert.equal(
      (await prisma.directMessage.findUnique({ where: { id: directRoot.id } }))
        .threadReplyCount,
      2,
    );
    stage = 'completion idempotency';
    const [claimed] =
      await prisma.$queryRaw`SELECT token::text FROM conversation_ai_requests WHERE id=${general}::uuid`;
    const replay = await fetch(
      base + '/internal/conversation-ai/' + general + '/complete',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-service-key': process.env.AI_COMMUNICATION_SERVICE_KEY,
        },
        body: JSON.stringify({
          token: claimed.token,
          content: 'duplicate must not be inserted',
          failed: false,
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    assert.equal(replay.status, 201);
    await pause(500);
    assert.equal(
      await prisma.message.count({ where: { channelId, type: 'AI' } }),
      3,
    );
    assert.equal(
      await prisma.directMessage.count({
        where: { conversationId, type: 'AI' },
      }),
      2,
    );
    assert.equal(received.length, 5);
    console.log(
      JSON.stringify({ stage, duplicateRows: false, duplicateEvents: false }),
    );
  }
  if (attachmentRequested && browserRequested) {
    stage = 'create synthetic PDF attachment';
    const { S3Service } = require('../dist/infrastructure/s3/s3.service');
    attachmentStorage = new S3Service();
    const name = 'qa-summary.pdf';
    const stream = 'BT /F1 12 Tf 50 750 Td (Synthetic Workspace Hub document) Tj 0 -24 Td (Project Aurora launches on 12 November 2026.) Tj 0 -24 Td (Budget: 420 USD. Owner: Lan.) Tj ET';
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const data = Buffer.from(pdf);
    const upload = await attachmentStorage.generatePresignedUploadUrl(documentBacked ? 'documents' : 'chat-media', documentBacked ? actor : channelId, name, 'application/pdf');
    attachmentKey = upload.s3Key;
    const uploaded = await fetch(upload.presignedUrl, { method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: data, signal: AbortSignal.timeout(30000) });
    assert.ok(uploaded.ok, 'Synthetic S3 PDF upload failed');
    await uploaded.body?.cancel();
    if (documentBacked) {
      const fs = require('node:fs'), dotenv = require('dotenv');
      const documentEnv = { ...dotenv.parse(fs.readFileSync('../document-service/.env')), ...(fs.existsSync('../document-service/.env.local') ? dotenv.parse(fs.readFileSync('../document-service/.env.local')) : {}) };
      const { PrismaClient: DocumentPrisma } = require('../../document-service/node_modules/@prisma/client');
      const url = new URL(documentEnv.DATABASE_URL);
      if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
      documentDb = new DocumentPrisma({ datasources: { db: { url: url.toString() } } });
      documentItemId = randomUUID();
      await documentDb.userProfileSnapshot.create({ data: { userId: actor, email: 'qa@example.test', fullName: 'Synthetic QA' } });
      await documentDb.documentItem.create({ data: {
        id: documentItemId, ownerUserId: actor, ownerEmail: 'qa@example.test', name,
        type: 'FILE', s3Key: attachmentKey, sizeBytes: BigInt(data.length), mimeType: 'application/pdf',
        versions: { create: { versionNumber: 1, s3Key: attachmentKey, sizeBytes: BigInt(data.length), uploadedBy: actor } },
      } });
      const resolve = async (userId) => {
        const response = await fetch('http://127.0.0.1:8085/internal/notebook-documents/resolve-chat-attachment', {
          method: 'POST', headers: { 'content-type': 'application/json', 'x-internal-service-key': documentEnv.AI_DOCUMENT_SERVICE_KEY },
          body: JSON.stringify({ userId, s3Key: attachmentKey, download: false }), signal: AbortSignal.timeout(10000),
        });
        await response.body?.cancel(); return response.status;
      };
      assert.equal(await resolve(actor), 201, 'Document owner access failed');
      assert.equal(await resolve(recipient), 403, 'Private document leaked');
      await documentDb.documentItem.update({ where: { id: documentItemId }, data: { isArchived: true } });
      assert.equal(await resolve(actor), 403, 'Archived document was allowed');
      await documentDb.documentItem.update({ where: { id: documentItemId }, data: { isArchived: false, linkAccess: 'VIEWER' } });
      assert.equal(await resolve(recipient), 403, 'Public link improperly grants AI ingestion');
      await documentDb.documentShare.create({ data: { documentItemId, shareWithUserId: recipient, shareWithEmail: 'recipient@example.test', permission: 'VIEWER' } });
      assert.equal(await resolve(recipient), 201, 'Explicit share not respected');
      await documentDb.documentShare.deleteMany({ where: { documentItemId } });
      assert.equal(await resolve(recipient), 403, 'Revoked document share was allowed');
      console.log(JSON.stringify({ documentPermissionsPassed: true, owner: true, explicitShare: true, privateDenied: true, archivedDenied: true, publicLinkDenied: true, revokedDenied: true }));
    }
    const sent = await fetch(base + '/api/channels/' + channelId + '/messages', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-user-id': actor },
      body: JSON.stringify({ type: 'TEXT', content: 'Synthetic attachment for summary verification.', medias: [{ name, s3Key: attachmentKey, mimeType: 'application/pdf', sizeBytes: data.length }] }),
      signal: AbortSignal.timeout(10000),
    });
    assert.equal(sent.status, 201);
    const message = (await sent.json()).data;
    attachmentFixture = { messageId: message.id, name };
  }
  if (process.argv.includes('--markdown-table') && browserRequested) {
    tableMessageId = randomUUID();
    await prisma.message.create({ data: {
      id: tableMessageId, channelId, senderId: '00000000-0000-4000-8000-0000000000a1', type: 'AI',
      content: 'Hôm nay **24/10/2026**, đây là dữ liệu QA.\n\n| Công việc | Dự án | Hạn chót |\n|---|---|---|\n| Finish dashboard cards | [DEMO] Dashboard release | 05/10/2026 |\n| Finish dashboard cards | [DEMO] Mobile workspace | 05/10/2026 |\n| Write release checklist | [DEMO] Dashboard release | 07/10/2026 |\n| Write release checklist | [DEMO] Mobile workspace | 07/10/2026 |\n\nBảng mẫu để kiểm tra hiển thị.',
    } });
  }
  if (browserRequested) {
    stage = 'browser channel mention and answer';
    await pause(Number(process.env.AI_LIVE_GAP_MS || 35000));
    const { spawn } = require('node:child_process');
    await new Promise((resolve, reject) => {
      const child = spawn('python', ['test/conversation-ai-browser.py'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });
      child.stdout.on('data', (chunk) => process.stdout.write(chunk));
      // Do not relay a subprocess traceback containing fixture/session context.
      child.stderr.resume();
      child.once('error', reject);
      child.once('exit', (code) =>
        code === 0
          ? resolve()
          : reject(Error('Browser chat verification failed')),
      );
      child.stdin.end(JSON.stringify({ token, actor, spaceId, channelId, attachment: attachmentFixture, tableMessageId }));
    });
  }
  stage = 'rate limit rollback';
  for (let i = 0; i < 10; i++)
    await prisma.$executeRaw`INSERT INTO conversation_ai_requests(id,actor_id,chat_id,chat_type,status) VALUES(${randomUUID()}::uuid,${actor}::uuid,${channelId}::uuid,'CHANNEL','CANCELLED')`;
  const before = await prisma.message.count({ where: { channelId } });
  await send('CHANNEL', '@ai must be rate limited', undefined, 400);
  assert.equal(await prisma.message.count({ where: { channelId } }), before);
  console.log(JSON.stringify({ stage, rejected: true, rolledBack: true }));
  console.log(
    JSON.stringify({
      liveSmokePassed: true,
      apiScenarios: browserOnly ? 0 : 5,
      browserRequested,
    }),
  );
})()
  .catch((error) => {
    console.error(
      JSON.stringify({
        liveSmokePassed: false,
        stage,
        error: error.message,
        code: error.code,
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    socket?.disconnect();
    if (app) await app.close();
    if (attachmentKey) await attachmentStorage.deleteFile(attachmentKey).catch(() => { console.error('Synthetic attachment cleanup failed'); process.exitCode = 1; });
    if (documentDb) {
      if (documentItemId) await documentDb.documentItem.deleteMany({ where: { id: documentItemId, ownerUserId: actor } });
      await documentDb.userProfileSnapshot.deleteMany({ where: { userId: actor } });
      await documentDb.$disconnect();
    }
    if (created) {
      await prisma.$executeRaw`DELETE FROM conversation_ai_requests WHERE actor_id=${actor}::uuid AND chat_id IN (${channelId}::uuid,${conversationId}::uuid)`;
      await prisma.space.deleteMany({
        where: { id: spaceId, createdBy: actor },
      });
      await prisma.directConversation.deleteMany({
        where: { id: conversationId },
      });
      await prisma.userProfileSnapshot.deleteMany({
        where: { userId: { in: [actor, recipient] } },
      });
    }
    await prisma.$disconnect();
  });
