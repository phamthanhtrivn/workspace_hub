import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { projectRequire, webRequire, load, until, json } from './support.mjs';
import { login, signTestToken } from './user-auth.mjs';
import { withPrisma, seedProject } from './resource-access.mjs';

export function registerGatewayAndSocketTests(state) {
  test('isolated Kong blocks internal and encoded paths and preserves authenticated identity', async () => {
    const f = state.infrastructure;
    await f.startGateway();
    for (const path of ['/api/users/me/profile', '/api/users/me/profile/avatar/presigned-url']) {
      assert.equal((await json(f.gatewayUrl, path, { headers: { 'x-user-id': state.actorB.id, 'x-user-role': 'ADMIN' } })).status, 401);
    }
    const result = await json(f.gatewayUrl, '/api/users/me/profile', { token: state.actorA.token, headers: { 'x-user-id': state.actorB.id, 'x-user-role': 'ADMIN' } });
    assert.equal(result.status, 200, 'gateway can reach the isolated User backend');
    assert.equal(result.data.data.fullName, state.actorA.fullName);
    for (const path of ['/api/users/internal/sessions/authorize', '/api/users/%69nternal/sessions/authorize', '/api/users/%2569nternal/sessions/authorize', '/api/users//internal/sessions/authorize']) {
      assert.equal((await json(f.gatewayUrl, path, { method: 'POST', token: state.actorA.token,
        headers: { 'x-internal-service-key': f.keys.PROJECT_TO_USER_KEY }, body: { userId: state.actorA.id, sessionId: state.actorA.sid } })).status, 404, path);
    }
    assert.equal((await json(f.gatewayUrl, '/api/users/me/profile', { token: signTestToken(state, { token_use: 'password_reset' }) })).status, 401);
  });

  test('real sockets reject anonymous and revoked sessions and stop delivery to removed project members', async () => {
    await withPrisma(state, ['project'], async ({ project }) => {
      const { Server } = projectRequire('socket.io');
      const { io } = webRequire('socket.io-client');
      const { ProjectGateway } = load('project-service', 'modules/socket/project.gateway.js');
      const { SocketRoomService } = load('project-service', 'modules/socket/socket-room.service.js');
      const { ProjectAccessService } = load('project-service', 'modules/project/project-access.service.js');
      const { emitWithActiveSessions } = load('project-service', 'common/auth/socket-session.js');
      const { socketCorsOptions, allowSocketRequest } = load('project-service', 'common/auth/socket-origin.js');
      const owned = await seedProject(project, state.actorA.id);
      await project.projectMember.create({ data: { projectId: owned.id, userId: state.actorB.id, role: 'MEMBER', status: 'ACTIVE', joinedAt: new Date(), updatedAt: new Date() } });
      const rooms = new SocketRoomService(), access = new ProjectAccessService(project);
      const http = createServer();
      const server = new Server(http, { path: '/project.io', cors: socketCorsOptions, allowRequest: allowSocketRequest });
      const gateway = new ProjectGateway(project, { bindServer() {} }, rooms);
      gateway.afterInit(server);
      server.on('connection', (socket) => { void gateway.handleConnection(socket); });
      await new Promise((done) => http.listen(0, '127.0.0.1', done));
      const url = `http://127.0.0.1:${http.address().port}`, clients = [];
      const connect = async (token) => {
        const client = io(url, { path: '/project.io', transports: ['websocket'], reconnection: false, autoConnect: false, timeout: 5000, auth: { token } });
        clients.push(client);
        await new Promise((done, fail) => { client.once('connect', done); client.once('connect_error', fail); client.connect(); });
        return client;
      };
      try {
        await assert.rejects(connect(undefined));
        await assert.rejects(connect(signTestToken(state, { exp: 1 })));
        const disposable = await login(state, state.actorA);
        const a = await connect(state.actorA.token), b = await connect(state.actorB.token), c = await connect(disposable.token);
        const received = { a: 0, b: 0, c: 0 };
        for (const [name, client] of [['a', a], ['b', b], ['c', c]]) client.on('security:delivery', () => received[name]++);
        await until(async () => (await server.in(rooms.project(owned.id)).fetchSockets()).length === 3, 'project gateway room joins');
        const socketA = server.sockets.sockets.get(a.id);
        const deniedJoin = await gateway.joinProject({ projectId: randomUUID(), userId: state.actorB.id }, socketA);
        assert.equal(deniedJoin.success, false);
        await project.projectMember.deleteMany({ where: { projectId: owned.id, userId: state.actorB.id } });
        await emitWithActiveSessions(server, rooms.project(owned.id), 'security:delivery', {}, (userId) => access.requireReadAccess(userId, owned.id));
        await until(() => received.a === 1 && received.c === 1, 'authorized socket delivery');
        assert.equal(received.b, 0, 'removed member receives no new event despite stale room');
        await json(state.infrastructure.userUrl, '/api/auth/logout', { method: 'POST', cookie: disposable.cookie });
        await emitWithActiveSessions(server, rooms.project(owned.id), 'security:delivery', {}, (userId) => access.requireReadAccess(userId, owned.id));
        await until(() => received.a === 2 && !c.connected, 'revoked socket disconnected');
        assert.equal(received.b, 0); assert.equal(received.c, 1);
        await assert.rejects(connect(disposable.token));
      } finally {
        for (const client of clients) client.close();
        await new Promise((done) => server.close(done));
        if (http.listening) await new Promise((done) => http.close(done));
      }
    });
  });
}
