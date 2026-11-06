import { after, before, describe } from 'node:test';
import { IsolatedInfrastructure } from './support.mjs';
import { registerAuthTests } from './user-auth.mjs';
import { registerTransportTests } from './http-boundaries.mjs';
import { registerAsyncTests } from './async-delivery.mjs';
import { registerResourceTests } from './resource-access.mjs';
import { registerGatewayAndSocketTests } from './gateway-and-sockets.mjs';

describe('WorkspaceHub isolated security integration', { skip: process.env.WORKSPACEHUB_SECURITY_INTEGRATION !== '1', timeout: 600000 }, () => {
  const state = { infrastructure: new IsolatedInfrastructure() };
  const previous = { ...process.env };
  before(async () => {
    await state.infrastructure.start();
    await state.infrastructure.migrate();
    await state.infrastructure.startUser();
    Object.assign(process.env, state.infrastructure.keys, { USER_SERVICE_URL: state.infrastructure.userUrl });
    state.userDb = await state.infrastructure.db('user');
  }, { timeout: 240000 });
  after(async () => {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
    await state.infrastructure.close();
  }, { timeout: 60000 });
  registerAuthTests(state);
  registerTransportTests(state);
  registerResourceTests(state);
  registerGatewayAndSocketTests(state);
  registerAsyncTests(state);
});
