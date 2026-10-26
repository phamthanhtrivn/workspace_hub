// Opt-in real DB/API checks; --model additionally makes a real @ai request.
if (!process.argv.includes('--run')) {
  console.log(
    'Use --run with Project/Communication running; add --model after deploying AI. Synthetic fixtures are removed afterward.',
  );
  process.exit(0);
}
require('../dist/common/config/load-service-env').loadServiceEnvironment();
const assert = require('node:assert/strict');
const { randomUUID, createHmac } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { setTimeout: pause } = require('node:timers/promises');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const {
  PrismaClient: ProjectClient,
} = require('../../project-service/node_modules/@prisma/client');
const { io } = require('../../../frontend/web/node_modules/socket.io-client');
const projectEnv = dotenv.parse(
  readFileSync(resolve(__dirname, '../../project-service/.env')),
);
const project = new ProjectClient({ datasourceUrl: projectEnv.DATABASE_URL });
const comm = new PrismaClient();
const actor = randomUUID(),
  other = randomUUID(),
  spaceId = randomUUID(),
  channelId = randomUUID();
const projectIds = Array.from({ length: 4 }, () => randomUUID());
const numbers = [0, 0, 0, 0],
  taskIds = {};
const suffix = randomUUID().slice(0, 8);
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const start = new Date(today + 'T00:00:00+07:00').getTime();
const at = (hours) => new Date(start + hours * 3600000);
let socket;
const events = [];
async function api(
  path,
  body,
  key = process.env.AI_PROJECT_SERVICE_KEY,
  origin = 'http://127.0.0.1:8082',
) {
  const r = await fetch(origin + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-service-key': key,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  assert.equal(r.status, 201, path + ' returned ' + r.status);
  return (await r.json()).data;
}
async function tasks(scope, projectId) {
  return api('/internal/conversation-tasks', {
    userId: actor,
    scope,
    ...(projectId ? { projectId } : {}),
  });
}
(async () => {
  const now = new Date();
  await project.$transaction(
    async (tx) => {
      for (let i = 0; i < projectIds.length; i++)
        await tx.project.create({
          data: {
            id: projectIds[i],
            name: 'QA project ' + i + ' ' + suffix,
            ownerId: i === 1 || i === 2 ? other : actor,
            status: 'ACTIVE',
            archived: i === 3,
            createdAt: now,
            ...(i === 1 || i === 2
              ? {
                  members: {
                    create: {
                      userId: actor,
                      role: 'MEMBER',
                      status: i === 1 ? 'ACTIVE' : 'REMOVED',
                      joinedAt: now,
                      updatedAt: now,
                    },
                  },
                }
              : {}),
          },
        });
      async function task(label, index = 0, extra = {}, assignee = actor) {
        const id = randomUUID();
        taskIds[label] = id;
        await tx.task.create({
          data: {
            id,
            projectId: projectIds[index],
            taskNumber: ++numbers[index],
            title: label + '_' + suffix,
            priority: 'HIGH',
            status: 'TODO',
            createdBy: actor,
            reporterId: actor,
            createdAt: now,
            dueDate: at(23),
            ...extra,
            assignees: {
              create: {
                userId: assignee,
                assignedAt: now,
              },
            },
          },
        });
      }
      await task('QA_TODAY');
      await task('QA_OVERDUE', 0, { dueDate: at(-1) });
      await task('QA_ONGOING', 0, { startDate: at(-2), dueDate: at(30) });
      await task('QA_ALL_DAY', 0, {
        dueDate: new Date(today + 'T00:00:00Z'),
        allDay: true,
      });
      await task('QA_FUTURE', 0, { dueDate: at(30) });
      await task('QA_UNDATED', 0, { dueDate: null });
      await task('QA_OTHER_ASSIGNEE', 0, {}, other);
      await task('QA_DONE', 0, { status: 'DONE', completedAt: now });
      await task('QA_CANCELLED', 0, { status: 'CANCELLED', completedAt: now });
      await task('QA_ARCHIVED_TASK', 0, { archived: true });
      await task('QA_DELETED_TASK', 0, { deletedAt: now });
      await task('QA_ACTIVE_MEMBER', 1);
      await task('QA_REMOVED_MEMBER', 2);
      await task('QA_ARCHIVED_PROJECT', 3);
    },
    { timeout: 20000 },
  );
  const mine = await tasks('today');
  assert.deepEqual(
    new Set(mine.tasks.map((t) => t.id)),
    new Set(
      [
        'QA_TODAY',
        'QA_OVERDUE',
        'QA_ONGOING',
        'QA_ALL_DAY',
        'QA_ACTIVE_MEMBER',
      ].map((k) => taskIds[k]),
    ),
  );
  assert.equal(
    mine.tasks.find((t) => t.id === taskIds.QA_ALL_DAY).timing,
    'DUE_TODAY',
  );
  assert.equal((await tasks('overdue')).tasks.length, 1);
  assert.equal((await tasks('open')).tasks.length, 7);
  assert.equal((await tasks('today', projectIds[0])).tasks.length, 4);
  const wrong = await fetch(
    'http://127.0.0.1:8082/internal/conversation-tasks',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-service-key': 'wrong',
        'x-user-id': actor,
      },
      body: JSON.stringify({ userId: actor, scope: 'today' }),
    },
  );
  assert.equal(wrong.status, 401);
  console.log(
    JSON.stringify({
      projectQueryPassed: true,
      privacyFiltersPassed: true,
      vietnamDayPassed: true,
      allDayDeadlinePassed: true,
    }),
  );
  const readId = randomUUID(),
    readToken = randomUUID();
  await comm.$transaction(async (tx) => {
    await tx.space.create({
      data: {
        id: spaceId,
        name: 'Temporary Project task QA',
        projectId: projectIds[0],
        createdBy: actor,
        members: { create: { userId: actor, role: 'ADMIN' } },
        channels: {
          create: {
            id: channelId,
            name: 'project-tasks-qa',
            createdBy: actor,
            members: { create: { userId: actor } },
          },
        },
      },
    });
    await tx.userProfileSnapshot.create({
      data: {
        userId: actor,
        fullName: 'Project QA',
        email: 'project-qa@example.test',
      },
    });
    await tx.message.create({
      data: {
        id: readId,
        channelId,
        senderId: actor,
        content: '@ai Kiểm tra task của tôi',
        type: 'TEXT',
      },
    });
    await tx.$executeRaw`INSERT INTO conversation_ai_requests(id,actor_id,chat_id,chat_type,status,token) VALUES(${readId}::uuid,${actor}::uuid,${channelId}::uuid,'CHANNEL','RUNNING',${readToken}::uuid)`;
  });
  const bridged = await api(
    '/internal/conversation-ai/' + readId + '/tasks',
    {
      token: readToken,
      scope: 'today',
      userId: other,
      projectId: projectIds[2],
    },
    process.env.AI_COMMUNICATION_SERVICE_KEY,
    'http://127.0.0.1:8083',
  );
  assert.deepEqual(
    new Set(bridged.tasks.map((t) => t.id)),
    new Set(
      ['QA_TODAY', 'QA_OVERDUE', 'QA_ONGOING', 'QA_ALL_DAY'].map(
        (k) => taskIds[k],
      ),
    ),
  );
  console.log(
    JSON.stringify({ chatIdentityBound: true, linkedProjectScopePassed: true }),
  );
  if (!process.argv.includes('--model')) return;
  const enc = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned =
    enc({ alg: 'HS256', typ: 'JWT' }) +
    '.' +
    enc({
      sub: actor,
      iss: process.env.JWT_ISSUER || 'workspace-hub',
      role: 'USER',
      exp: Math.floor(Date.now() / 1000) + 300,
    });
  const token =
    unsigned +
    '.' +
    createHmac('sha256', process.env.JWT_SECRET_KEY)
      .update(unsigned)
      .digest('base64url');
  socket = io('http://127.0.0.1:8083', {
    path: '/communication.io',
    transports: ['websocket'],
    auth: { token },
    autoConnect: false,
    reconnection: false,
  });
  socket.on('new_message', (message) => {
    if (message.chatId === channelId && message.type === 'AI')
      events.push(message);
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Socket timeout')), 10000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', () => {
      clearTimeout(timer);
      reject(Error('Socket rejected'));
    });
    socket.connect();
  });
  const response = await fetch(
    'http://127.0.0.1:8083/api/channels/' + channelId + '/messages',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': actor },
      body: JSON.stringify({
        content: '@ai hôm nay task của tôi là gì',
        type: 'TEXT',
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  assert.equal(response.status, 201);
  const requestId = (await response.json()).data.id;
  let status;
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline) {
    const [request] =
      await comm.$queryRaw`SELECT status FROM conversation_ai_requests WHERE id=${requestId}::uuid`;
    status = request?.status;
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) break;
    await pause(400);
  }
  assert.equal(status, 'COMPLETED');
  const reply = await comm.message.findFirst({
    where: { channelId, type: 'AI' },
  });
  assert.ok(reply.content.includes('QA_TODAY_' + suffix));
  assert.ok(reply.content.includes('QA_OVERDUE_' + suffix));
  for (const excluded of [
    'QA_OTHER_ASSIGNEE',
    'QA_REMOVED_MEMBER',
    'QA_ACTIVE_MEMBER',
    'QA_ARCHIVED_PROJECT',
  ])
    assert.ok(!reply.content.includes(excluded));
  for (let i = 0; i < 30 && !events.length; i++) await pause(200);
  assert.equal(events.length, 1);
  console.log(
    JSON.stringify({
      realProjectToolReplyPassed: true,
      socketDeliveryPassed: true,
      answer: reply.content,
    }),
  );
})()
  .catch((error) => {
    console.error(
      JSON.stringify({
        projectTaskLivePassed: false,
        error: error.name,
        code: error.code,
        message: String(error.message)
          .replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[database URL]')
          .slice(-300),
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    socket?.disconnect();
    await comm.$executeRaw`DELETE FROM conversation_ai_requests WHERE actor_id=${actor}::uuid AND chat_id=${channelId}::uuid`;
    await comm.space.deleteMany({ where: { id: spaceId, createdBy: actor } });
    await comm.userProfileSnapshot.deleteMany({ where: { userId: actor } });
    await project.project.deleteMany({ where: { id: { in: projectIds } } });
    await Promise.all([comm.$disconnect(), project.$disconnect()]);
  });
