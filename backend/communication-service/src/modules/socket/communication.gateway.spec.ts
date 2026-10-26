import { createHmac, randomUUID } from 'node:crypto';
import { CommunicationGateway } from './communication.gateway';
import type { Socket } from 'socket.io';
describe('socket identity verification', () => {
  const actor = randomUUID();
  const secret = 'fixture-jwt-secret-not-production-000';
  const token = () => {
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: actor,
        iss: 'workspace-hub',
        exp: Math.floor(Date.now() / 1000) + 60,
        role: 'USER',
      }),
    ).toString('base64url');
    return `${header}.${payload}.${createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')}`;
  };
  it('disconnects forged tokens and missing JWT configuration', async () => {
    const old = process.env.JWT_SECRET_KEY;
    delete process.env.JWT_SECRET_KEY;
    const gateway = new CommunicationGateway(
      {} as never,
      {} as never,
      { user: (id: string) => id } as never,
      {} as never,
    );
    const socket = {
      handshake: { auth: { token: token() }, query: {} },
      data: {},
      join: jest.fn(),
      disconnect: jest.fn(),
    };
    try {
      await gateway.handleConnection(socket as unknown as Socket);
      expect(socket.disconnect).toHaveBeenCalled();
      expect(socket.join).not.toHaveBeenCalled();
      process.env.JWT_SECRET_KEY = secret;
      socket.handshake.auth.token = token().replace(/.$/, '!');
      socket.disconnect.mockClear();
      await gateway.handleConnection(socket as unknown as Socket);
      expect(socket.disconnect).toHaveBeenCalled();
      expect(socket.join).not.toHaveBeenCalled();
    } finally {
      if (old === undefined) delete process.env.JWT_SECRET_KEY;
      else process.env.JWT_SECRET_KEY = old;
    }
  });
  it('joins user rooms only after signature verification', async () => {
    const old = process.env.JWT_SECRET_KEY;
    process.env.JWT_SECRET_KEY = secret;
    const gateway = new CommunicationGateway(
      {} as never,
      {} as never,
      { user: (id: string) => `user:${id}` } as never,
      {} as never,
    );
    const socket = {
      handshake: { auth: { token: token() }, query: {} },
      data: {} as { userId?: string },
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
    };
    try {
      await gateway.handleConnection(socket as unknown as Socket);
      expect(socket.data.userId).toBe(actor);
      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith(actor);
    } finally {
      if (old === undefined) delete process.env.JWT_SECRET_KEY;
      else process.env.JWT_SECRET_KEY = old;
    }
  });
});
