import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import type { Server } from 'socket.io';
import { emitWithActiveSessions } from './socket-session';

test('delivery refuses revoked sessions and stale resource rooms independently', async () => {
  const originalFetch = globalThis.fetch;
  const previousUrl = process.env.USER_SERVICE_URL, previousKey = process.env.PROJECT_TO_USER_KEY;
  process.env.USER_SERVICE_URL = 'https://user-service.invalid'; process.env.PROJECT_TO_USER_KEY = 'test-only-key';
  const received: string[] = [], disconnected: string[] = [];
  const sockets = ['allowed', 'removed', 'revoked'].map(userId => ({
    data: { sessionIdentity: { sub: userId, sid: userId, exp: Math.floor(Date.now() / 1000) + 60 } },
    emit: () => received.push(userId), disconnect: () => disconnected.push(userId),
  }));
  const server = { in: () => ({ fetchSockets: () => Promise.resolve(sockets) }) } as unknown as Server;
  globalThis.fetch = (_url, options) => {
    const request = JSON.parse(options?.body as string) as { sessionId: string };
    return Promise.resolve(new Response(JSON.stringify({ active: request.sessionId !== 'revoked' })));
  };
  try {
    await emitWithActiveSessions(server, ['project-room', 'user-room'], 'project:changed', {}, userId =>
      userId === 'removed' ? Promise.reject(new Error('Membership removed')) : Promise.resolve());
    assert.deepEqual(received, ['allowed']);
    assert.deepEqual(disconnected, ['revoked']);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.USER_SERVICE_URL; else process.env.USER_SERVICE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.PROJECT_TO_USER_KEY; else process.env.PROJECT_TO_USER_KEY = previousKey;
  }
});
