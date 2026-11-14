import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { serviceRequire, load, json } from './support.mjs';
import { signTestToken } from './user-auth.mjs';

export async function mount(service, controller, { probe = false, guard = true, values = {} } = {}) {
  const require = serviceRequire(service);
  require('reflect-metadata');
  const common = require('@nestjs/common'), { NestFactory, Reflector } = require('@nestjs/core');
  let calls = 0;
  const providers = [];
  if (probe) {
    controller = class IdentityProbe { identity(request) { return { userId: request.headers['x-user-id'], role: request.headers['x-user-role'], actor: request.actor }; } };
    common.Controller('__security_test__')(controller);
    common.Get('identity')(controller.prototype, 'identity', Object.getOwnPropertyDescriptor(controller.prototype, 'identity'));
    common.Req()(controller.prototype, 'identity', 0);
  } else {
    const types = Reflect.getMetadata('design:paramtypes', controller) ?? [];
    for (const { index, param } of Reflect.getMetadata('self:paramtypes', controller) ?? []) types[index] = param;
    for (const token of new Set(types)) {
      const value = values[token.name] ?? (token.name === 'RuntimeConfigService' ? new token() : new Proxy({}, { get(_target, name) {
        if (name === 'then' || String(name).startsWith('onModule') || String(name).startsWith('onApplication')) return undefined;
        if (name === 'enabled') return () => true;
        return async () => { calls++; return { id: randomUUID(), name: 'Security test' }; };
      } }));
      providers.push({ provide: token, useValue: value });
    }
  }
  class BoundaryModule {}
  common.Module({ controllers: [controller], providers })(BoundaryModule);
  const app = await NestFactory.create(BoundaryModule, { logger: false, abortOnError: false });
  if (guard) {
    const Guard = service === 'ai-service/api' ? load(service, 'common/auth/auth.guard.js').AuthGuard
      : load(service, 'common/guards/jwt-identity.guard.js').JwtIdentityGuard;
    app.useGlobalGuards(new Guard(new Reflector()));
  }
  // AI validates its public contracts with Zod and does not install class-validator.
  if (service !== 'ai-service/api') app.useGlobalPipes(new common.ValidationPipe({ transform: true, whitelist: true }));
  await app.listen(0, '127.0.0.1');
  return { app, url: await app.getUrl(), calls: () => calls };
}

export function registerTransportTests(state) {
  test('all five Nest identity guards reject forged headers and recheck the real User session endpoint', async () => {
    for (const service of ['project-service', 'communication-service', 'document-service', 'calendar-service', 'notification-service']) {
      const endpoint = await mount(service, null, { probe: true });
      try {
        const path = '/__security_test__/identity';
        const forged = { 'x-user-id': state.actorB.id, 'x-user-role': 'ADMIN' };
        assert.equal((await json(endpoint.url, path, { headers: forged })).status, 401, `${service}: unsigned headers refused`);
        for (const token of [signTestToken(state, { exp: 1 }), signTestToken(state, { token_use: 'password_reset' }), signTestToken(state, { email_verified: false })])
          assert.equal((await json(endpoint.url, path, { token })).status, 401, `${service}: invalid claims refused`);
        const accepted = await json(endpoint.url, path, { token: state.actorA.token, headers: forged });
        assert.equal(accepted.status, 200, `${service}: active session accepted`);
        assert.equal(accepted.data.userId, state.actorA.id, `${service}: caller cannot replace actor`);
        assert.equal(accepted.data.role, 'USER');
        const previousUrl = process.env.USER_SERVICE_URL;
        process.env.USER_SERVICE_URL = 'http://127.0.0.1:1';
        try { assert.equal((await json(endpoint.url, path, { token: state.actorA.token })).status, 503, `${service}: dependency outage refused`); }
        finally { process.env.USER_SERVICE_URL = previousUrl; }
        const revoked = signTestToken(state, { sid: randomUUID() });
        assert.equal((await json(endpoint.url, path, { token: revoked })).status, 401, `${service}: nonexistent session refused`);
      } finally { await endpoint.app.close(); }
    }
  });

  test('all sixteen caller edges enforce receiver credentials over HTTP before business dispatch', async () => {
    const keys = state.infrastructure.keys;
    const sessionKeys = Object.keys(keys).filter((name) => name.endsWith('_TO_USER_KEY'));
    const sessionPath = '/api/users/internal/sessions/authorize';
    for (const name of sessionKeys) {
      const result = await json(state.infrastructure.userUrl, sessionPath, { method: 'POST', headers: { 'x-internal-service-key': keys[name] }, body: { userId: state.actorA.id, sessionId: state.actorA.sid } });
      assert.equal(result.status, 200, name); assert.equal(result.data.active, true);
    }
    for (const [name, key] of Object.entries(keys).filter(([name]) => !sessionKeys.includes(name))) {
      assert.equal((await json(state.infrastructure.userUrl, sessionPath, { method: 'POST', headers: { 'x-internal-service-key': key }, body: { userId: state.actorA.id, sessionId: state.actorA.sid } })).status, 403, name);
    }
    const id = randomUUID(), now = new Date().toISOString();
    Object.assign(process.env, { AI_ENABLED: 'true', CONVERSATION_AI_ENABLED: 'true', MEETING_SUMMARY_ENABLED: 'false', VISUAL_ENABLED: 'false', WORK_ASSISTANT_ENABLED: 'false', AI_GATEWAY_KEY_PREVIOUS: '',
      DATABASE_URL: state.infrastructure.dbUrl('ai'), REDIS_URL: `redis://127.0.0.1:${state.infrastructure.redisPort}`,
      DOCUMENT_SERVICE_URL: 'http://127.0.0.1:1', RAG_WORKER_URL: 'http://127.0.0.1:1',
      LLM_BASE_URL: 'http://127.0.0.1:1', LLM_API_KEY: 'test-only', LLM_MODEL: 'test-only',
      AI_GATEWAY_KEY: randomBytes(32).toString('hex'), AI_DOCUMENT_SERVICE_KEY: randomBytes(32).toString('hex'), RAG_SERVICE_KEY: randomBytes(32).toString('hex') });
    const cases = [
      ['COMMUNICATION_TO_PROJECT_KEY', 'project-service', 'modules/project/project-authorization.controller.js', 'ProjectAuthorizationController', '/internal/project-access/authorize', { userId: state.actorA.id, projectId: id, operation: 'READ' }],
      ['DOCUMENT_TO_PROJECT_KEY', 'project-service', 'modules/project/project-authorization.controller.js', 'ProjectAuthorizationController', '/internal/project-access/authorize', { userId: state.actorA.id, projectId: id, operation: 'EDIT_DOCUMENTS' }],
      ['AI_TO_PROJECT_KEY', 'project-service', 'modules/work-assistant/work-assistant.controller.js', 'WorkAssistantController', '/internal/work-assistant/authorize', { userId: state.actorA.id, projectIds: [id] }],
      ['PROJECT_TO_COMMUNICATION_KEY', 'communication-service', 'modules/space/space.controller.js', 'SpaceController', `/api/spaces/internal/project/${id}`, undefined, 'GET'],
      ['CALENDAR_TO_COMMUNICATION_KEY', 'communication-service', 'modules/meeting/calendar-meeting-sync.controller.js', 'CalendarMeetingSyncController', '/api/meetings/internal/calendar-source/test-token', undefined, 'GET'],
      ['AI_TO_COMMUNICATION_KEY', 'communication-service', 'modules/conversation-ai/conversation-ai.controller.js', 'ConversationAiController', `/internal/conversation-ai/${id}/claim`, {}],
      ['PROJECT_TO_DOCUMENT_KEY', 'document-service', 'modules/document/document.controller.js', 'DocumentController', `/api/documents/internal/projects/${id}/root-folder`, { name: 'Security test', ownerId: state.actorA.id, ownerEmail: state.actorA.email }],
      ['PROJECT_TO_NOTIFICATION_KEY', 'notification-service', 'modules/notification/notification.controller.js', 'NotificationController', '/api/notifications/internal', { recipientId: state.actorA.id, type: 'PROJECT_TASK_ASSIGNED', title: 'Security test', content: 'Security test' }],
      ['AI_TO_CALENDAR_KEY', 'calendar-service', 'modules/work-assistant/work-assistant.controller.js', 'WorkAssistantController', '/internal/work-assistant/context', { userId: state.actorA.id, from: now, to: now, windowStart: now, windowEnd: now, todayEnd: now }],
      ['COMMUNICATION_TO_AI_KEY', 'ai-service/api', 'modules/conversation-ai/conversation.controller.js', 'ConversationController', `/internal/conversation-ai/${id}`, undefined],
    ];
    const tested = new Set(sessionKeys);
    let aiQueue;
    try {
      for (const [name, service, file, className, path, body, method = 'POST'] of cases) {
        console.log(`# Checking receiver scope: ${name}`);
        const Controller = load(service, file)[className];
        if (service === 'ai-service/api') aiQueue = load(service, 'infrastructure/queue/notebook.queue.js');
        const endpoint = await mount(service, Controller, { guard: service !== 'ai-service/api' });
        try {
          // The session-authorize route intentionally accepts all six session callers.
          const allowed = name === 'DOCUMENT_TO_PROJECT_KEY' ? [name] : name === 'COMMUNICATION_TO_PROJECT_KEY' ? [name, 'DOCUMENT_TO_PROJECT_KEY'] : [name];
          for (const [wrongName, key] of [...Object.entries(keys), ['missing', ''], ['invalid', 'invalid'], ['legacy', 'legacy'.repeat(12)]].filter(([keyName]) => !allowed.includes(keyName))) {
            const before = endpoint.calls();
            const result = await json(endpoint.url, path, { method, body, headers: { 'x-internal-service-key': key } });
            assert.ok([401, 403].includes(result.status), `${name} refuses ${wrongName}; actual status ${result.status}`);
            assert.equal(endpoint.calls(), before, 'denial precedes business dispatch');
          }
          const valid = await json(endpoint.url, path, { method, body, headers: { 'x-internal-service-key': keys[name] } });
          assert.ok([200, 201].includes(valid.status), `${name}: permitted route status ${valid.status}; ${JSON.stringify(valid.data)}`);
          if (name === 'COMMUNICATION_TO_PROJECT_KEY') {
            assert.equal((await json(endpoint.url, path, { method, body: { ...body, operation: 'EDIT_DOCUMENTS' }, headers: { 'x-internal-service-key': keys[name] } })).status, 401);
          }
          tested.add(name);
        } finally { await endpoint.app.close(); }
      }
      assert.equal(tested.size, 16);
      const ai = await mount('ai-service/api', null, { probe: true });
      try {
        assert.equal((await json(ai.url, '/__security_test__/identity', { token: state.actorA.token, headers: { 'x-user-id': state.actorA.id, 'x-user-email': state.actorA.email } })).status, 401);
        const proof = { 'x-workspace-gateway-key': process.env.AI_GATEWAY_KEY, 'x-user-id': state.actorA.id, 'x-user-email': state.actorA.email };
        assert.equal((await json(ai.url, '/__security_test__/identity', { token: state.actorA.token, headers: proof })).status, 200);
        assert.equal((await json(ai.url, '/__security_test__/identity', { token: state.actorA.token, headers: { ...proof, 'x-user-id': state.actorB.id } })).status, 401);
      } finally { await ai.app.close(); }
    } finally {
      await aiQueue?.closeQueues();
    }
  });
}
