import { Socket } from 'socket.io';
import { AccessTokenVerifier } from '../../common/auth/access-token-verifier';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectGateway } from './project.gateway';
import { SocketEventEmitter } from './socket-event-emitter';
import { SocketRoomService } from './socket-room.service';

const USER_ID = '9d0deeb4-a868-45d9-923e-62feecde6a6e';
const PROJECT_ID = 'aa5658c8-24cd-42d8-8722-c3b7add9e50f';

function createSocket(): Socket {
  return {
    data: {},
    handshake: { auth: { token: 'valid-token' }, headers: {} },
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
  } as unknown as Socket;
}

describe('ProjectGateway', () => {
  const tokens = { verify: jest.fn().mockReturnValue(USER_ID) } as unknown as AccessTokenVerifier;
  const prisma = { project: { findFirst: jest.fn(), findMany: jest.fn() } } as unknown as PrismaService;
  const events = { bindServer: jest.fn() } as unknown as SocketEventEmitter;
  const rooms = new SocketRoomService();
  const gateway = new ProjectGateway(tokens, prisma, events, rooms);

  beforeEach(() => jest.clearAllMocks());

  it('authenticates a connection and automatically joins every accessible project room', async () => {
    const client = createSocket();
    jest.mocked(prisma.project.findMany).mockResolvedValueOnce([{ id: PROJECT_ID }] as never);

    await gateway.handleConnection(client);

    expect(tokens.verify).toHaveBeenCalledWith('valid-token');
    expect(client.data.userId).toBe(USER_ID);
    expect(client.join).toHaveBeenCalledWith([
      `project:user:${USER_ID}`,
      `project:${PROJECT_ID}`,
    ]);
  });

  it('joins a project room only after membership is verified', async () => {
    jest.mocked(prisma.project.findFirst).mockResolvedValueOnce({ id: PROJECT_ID } as never);
    const client = createSocket();
    client.data.userId = USER_ID;

    await expect(gateway.joinProject({ projectId: PROJECT_ID }, client)).resolves.toEqual({ success: true, projectId: PROJECT_ID });
    expect(client.join).toHaveBeenCalledWith(`project:${PROJECT_ID}`);
  });

  it('rejects users without project access', async () => {
    jest.mocked(prisma.project.findFirst).mockResolvedValueOnce(null);
    const client = createSocket();
    client.data.userId = USER_ID;

    await expect(gateway.joinProject({ projectId: PROJECT_ID }, client)).resolves.toEqual({ success: false, message: 'Project access denied' });
    expect(client.join).not.toHaveBeenCalled();
  });
});
