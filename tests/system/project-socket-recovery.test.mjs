import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { once } from 'node:events';

const require = createRequire(new URL('../../backend/project-service/package.json', import.meta.url));
const { Server } = require('socket.io');
const { projectSocketService } = require('../../frontend/web/features/project/api/project-socket.service.ts');
const { store } = require('../../frontend/web/store/store.ts');
const { setCredentials, clearCredentials } = require('../../frontend/web/store/auth/auth-slice.ts');

test('project subscriptions survive token rotation, remove stale list rooms, and clear on logout', async () => {
  const previousUrl = process.env.NEXT_PUBLIC_API_URL;
  const http = createServer(), server = new Server(http, { path: '/project.io' });
  const joins = [], leaves = [];
  server.on('connection', socket => {
    socket.on('project:join', request => joins.push([socket.handshake.auth.token, request.projectId]));
    socket.on('project:leave', request => leaves.push(request.projectId));
  });
  const until = async predicate => {
    const deadline = Date.now() + 3000;
    while (!predicate()) {
      assert.ok(Date.now() < deadline, 'project room operation completed');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  };
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  process.env.NEXT_PUBLIC_API_URL = `http://127.0.0.1:${http.address().port}`;
  const credentials = accessToken => ({ userId: 'test-user', accessToken, email: 'test@example.invalid', role: 'USER' });
  try {
    store.dispatch(setCredentials(credentials('old')));
    projectSocketService.joinProject('detail');
    projectSocketService.syncProjects(['list']);
    const socket = projectSocketService.connect('old');
    await once(socket, 'connect', { signal: AbortSignal.timeout(3000) });
    await until(() => joins.length === 2);
    projectSocketService.syncProjects([]);
    await until(() => leaves.includes('list'));
    const reconnected = once(socket, 'connect', { signal: AbortSignal.timeout(3000) });
    store.dispatch(setCredentials(credentials('new')));
    assert.equal(projectSocketService.getSocket(), socket);
    await reconnected;
    await until(() => joins.some(([token, project]) => token === 'new' && project === 'detail'));
    assert.equal(joins.filter(([token]) => token === 'new').length, 1);
    store.dispatch(clearCredentials());
    projectSocketService.disconnect();
    joins.length = 0;
    store.dispatch(setCredentials(credentials('another-login')));
    const next = projectSocketService.connect('another-login');
    await once(next, 'connect', { signal: AbortSignal.timeout(3000) });
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.deepEqual(joins, []);
  } finally {
    projectSocketService.disconnect(); store.dispatch(clearCredentials());
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previousUrl;
    await new Promise(resolve => server.close(resolve));
  }
});
