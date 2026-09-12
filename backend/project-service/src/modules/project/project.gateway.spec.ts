import { Socket } from 'socket.io';
import { AccessTokenVerifier } from '../../common/auth/access-token-verifier';
import { ProjectAccessService } from './project-access.service';
import { ProjectGateway } from './project.gateway';
import { ProjectRealtimeService } from './project-realtime.service';

const USER_ID = '9d0deeb4-a868-45d9-923e-62feecde6a6e';
const PROJECT_ID = 'aa5658c8-24cd-42d8-8722-c3b7add9e50f';

function socket(): Socket {
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
  const access = { requireReadAccess: jest.fn() } as unknown as ProjectAccessService;
  const realtime = new ProjectRealtimeService();
  const gateway = new ProjectGateway(tokens, access, realtime);

  beforeEach(() => jest.clearAllMocks());

  it('authenticates a connection and joins its private user room', () => {
    const client = socket();
    gateway.handleConnection(client);

    expect(tokens.verify).toHaveBeenCalledWith('valid-token');
    expect(client.data.userId).toBe(USER_ID);
    expect(client.join).toHaveBeenCalledWith(`project:user:${USER_ID}`);
  });

  it('joins a project room only after access is verified', async () => {
    const client = socket();
    client.data.userId = USER_ID;

    await expect(gateway.joinProject({ projectId: PROJECT_ID }, client)).resolves.toEqual({
      success: true,
      projectId: PROJECT_ID,
    });
    expect(access.requireReadAccess).toHaveBeenCalledWith(USER_ID, PROJECT_ID);
    expect(client.join).toHaveBeenCalledWith(`project:${PROJECT_ID}`);
  });

  it('rejects a project room when the user has no access', async () => {
    jest.mocked(access.requireReadAccess).mockRejectedValueOnce(new Error('forbidden'));
    const client = socket();
    client.data.userId = USER_ID;

    await expect(gateway.joinProject({ projectId: PROJECT_ID }, client)).resolves.toEqual({
      success: false,
      message: 'Project access denied',
    });
    expect(client.join).not.toHaveBeenCalled();
  });
});
