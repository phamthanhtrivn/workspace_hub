import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { createHmac, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';

const projectRequire = createRequire(new URL('../project-service/package.json', import.meta.url));
const webRequire = createRequire(new URL('../../frontend/web/package.json', import.meta.url));
projectRequire('ts-node').register({
  transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', esModuleInterop: true },
});
const { io } = webRequire('socket.io-client');
const { SocketRecovery } = projectRequire('../../frontend/web/lib/socket-recovery.ts');
const secret = 'socket-recovery-test-only-secret-at-least-32-bytes';
const subject = randomUUID(), sessionId = randomUUID();
function token(overrides = {}, signingSecret = secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ sub: subject, sid: sessionId, role: 'USER', iss: 'workspace-hub', email_verified: true, token_use: 'access', exp: Math.floor(Date.now() / 1000) + 60, ...overrides })).toString('base64url');
  const signature = createHmac('sha256', signingSecret).update(`${header}.${claims}`).digest('base64url');
  return `${header}.${claims}.${signature}`;
}

for (const service of ['notification-service', 'communication-service', 'project-service']) {
  test(`${service}: session codes and real Socket.IO recovery contract`, async t => {
    const serviceRequire = createRequire(new URL(`../${service}/package.json`, import.meta.url));
    const { verifyAccessClaims } = serviceRequire('./src/common/auth/access-token.ts');
    const { assertActiveSession } = serviceRequire('./src/common/auth/session-authorization.ts');
    const { installSocketSessions, emitWithActiveSessions } = serviceRequire('./src/common/auth/socket-session.ts');
    const { Server } = serviceRequire('socket.io');
    const keyName = `${service.split('-')[0].toUpperCase()}_TO_USER_KEY`;
    const names = ['JWT_SECRET_KEY', 'JWT_ISSUER', 'USER_SERVICE_URL', keyName];
    const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
    const originalFetch = globalThis.fetch;
    Object.assign(process.env, { JWT_SECRET_KEY: secret, JWT_ISSUER: 'workspace-hub', USER_SERVICE_URL: 'http://user-service.invalid', [keyName]: secret });
    const identity = { sub: subject, sid: sessionId, exp: Math.floor(Date.now() / 1000) + 60 };
    const codeIs = code => error => error.code === code;
    try {
      await t.test('expiration is classified only after signature and all other claims', () => {
        assert.throws(() => verifyAccessClaims(token({ exp: 1 })), codeIs('TOKEN_EXPIRED'));
        assert.throws(() => verifyAccessClaims(token({ exp: 1 }, 'wrong-secret')), codeIs('TOKEN_INVALID'));
        assert.throws(() => verifyAccessClaims(token({ exp: 1, role: 'OWNER' })), codeIs('TOKEN_INVALID'));
        assert.equal(verifyAccessClaims(token()).sub, subject);
        delete process.env.JWT_SECRET_KEY;
        assert.throws(() => verifyAccessClaims(token()), codeIs('AUTH_CONFIGURATION_ERROR'));
        process.env.JWT_SECRET_KEY = secret;
      });
      await t.test('revocation differs from transport/configuration/malformed responses', async () => {
        for (const [body, status, expected] of [
          [{ active: false }, 200, 'SESSION_REVOKED'],
          [{}, 200, 'AUTH_SERVICE_UNAVAILABLE'],
          [{ active: 'false' }, 200, 'AUTH_SERVICE_UNAVAILABLE'],
          [null, 200, 'AUTH_SERVICE_UNAVAILABLE'],
          [{}, 503, 'AUTH_SERVICE_UNAVAILABLE'],
          [{}, 403, 'AUTH_CONFIGURATION_ERROR'],
        ]) {
          globalThis.fetch = async () => new Response(JSON.stringify(body), { status });
          await assert.rejects(assertActiveSession(identity), codeIs(expected));
        }
        globalThis.fetch = async () => { throw new DOMException('timeout', 'TimeoutError'); };
        await assert.rejects(assertActiveSession(identity), codeIs('AUTH_SERVICE_UNAVAILABLE'));
        globalThis.fetch = async () => new Response('invalid JSON');
        await assert.rejects(assertActiveSession(identity), codeIs('AUTH_SERVICE_UNAVAILABLE'));
        delete process.env[keyName];
        await assert.rejects(assertActiveSession(identity), codeIs('AUTH_CONFIGURATION_ERROR'));
        process.env[keyName] = secret;
      });
      await t.test('handshake data.code, post-connect revocation, and fail-closed delivery', async () => {
        let active = true;
        globalThis.fetch = async () => new Response(JSON.stringify({ active }));
        const http = createServer();
        const server = new Server(http);
        installSocketSessions(server);
        await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
        const clients = [];
        const client = accessToken => {
          const socket = io(`http://127.0.0.1:${http.address().port}`, { autoConnect: false, reconnection: false, transports: ['websocket'], auth: { token: accessToken } });
          clients.push(socket);
          return socket;
        };
        try {
          for (const [accessToken, code] of [[token({ exp: 1 }), 'TOKEN_EXPIRED'], ['invalid', 'TOKEN_INVALID']]) {
            const socket = client(accessToken);
            const failed = once(socket, 'connect_error', { signal: AbortSignal.timeout(3000) });
            socket.connect();
            const [error] = await failed;
            assert.equal(error.data.code, code);
          }
          const connected = client(token());
          const ready = once(connected, 'connect', { signal: AbortSignal.timeout(3000) });
          connected.connect(); await ready;
          let deliveries = 0;
          connected.on('test:delivery', () => deliveries++);
          const denied = once(connected, 'session:error', { signal: AbortSignal.timeout(3000) });
          const disconnected = once(connected, 'disconnect', { signal: AbortSignal.timeout(3000) });
          active = false;
          await emitWithActiveSessions(server, `session:${sessionId}`, 'test:delivery', {});
          const [error] = await denied;
          assert.equal(error.code, 'SESSION_REVOKED');
          await disconnected;
          assert.equal(deliveries, 0);
          // A subsequent handshake also supplies the cause if the event was missed.
          const failed = once(connected, 'connect_error', { signal: AbortSignal.timeout(3000) });
          connected.connect();
          assert.equal((await failed)[0].data.code, 'SESSION_REVOKED');
        } finally {
          for (const socket of clients) socket.disconnect();
          await new Promise(resolve => server.close(resolve));
        }
      });
      await t.test('a connected token expires, refreshes once, and reconnects through the real transport', async () => {
        globalThis.fetch = async () => new Response(JSON.stringify({ active: true }));
        const http = createServer();
        const server = new Server(http);
        installSocketSessions(server);
        await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
        const socket = io(`http://127.0.0.1:${http.address().port}`, {
          autoConnect: false, reconnection: false, transports: ['websocket'],
        });
        let refreshes = 0;
        const recovery = new SocketRecovery(socket, token({ exp: Math.floor(Date.now() / 1000) + 2 }), {
          refresh: async () => { refreshes++; return token(); },
          terminate: async () => { assert.fail('active session must not terminate'); },
          isOnline: () => true,
          schedule: setTimeout, cancel: clearTimeout, random: () => 0, warn: () => {},
        });
        try {
          const connected = once(socket, 'connect', { signal: AbortSignal.timeout(3000) });
          recovery.start(); await connected;
          assert.equal(refreshes, 0);
          const expired = once(socket, 'session:error', { signal: AbortSignal.timeout(4000) });
          const reconnected = once(socket, 'connect', { signal: AbortSignal.timeout(4000) });
          assert.equal((await expired)[0].code, 'TOKEN_EXPIRED');
          await reconnected;
          assert.equal(refreshes, 1);
          assert.equal(socket.connected, true);
        } finally {
          recovery.dispose();
          await new Promise(resolve => server.close(resolve));
        }
      });
    } finally {
      globalThis.fetch = originalFetch;
      for (const name of names) {
        if (previous[name] === undefined) delete process.env[name];
        else process.env[name] = previous[name];
      }
    }
  });
}
