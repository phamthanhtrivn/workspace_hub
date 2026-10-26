import { ConversationAiService } from './conversation-ai.service';

const request = {
  id: 'request',
  actor_id: 'current-sender',
  chat_id: 'channel',
  chat_type: 'CHANNEL',
  status: 'RUNNING',
  token: 'claim',
};
describe('conversation project task bridge', () => {
  const oldKey = process.env.AI_PROJECT_SERVICE_KEY;
  beforeEach(() => {
    process.env.AI_PROJECT_SERVICE_KEY =
      'fixture-project-key-not-production-000000';
  });
  afterEach(() => {
    jest.restoreAllMocks();
    if (oldKey === undefined) delete process.env.AI_PROJECT_SERVICE_KEY;
    else process.env.AI_PROJECT_SERVICE_KEY = oldKey;
  });
  function setup() {
    const message = {
      id: request.id,
      senderId: request.actor_id,
      channelId: request.chat_id,
      type: 'TEXT',
      content: '@ai my tasks',
      deletedAt: null,
      recalled: false,
    };
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([request]),
      $executeRaw: jest.fn().mockResolvedValue(1),
      channelMember: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ channel: { spaceId: 'space' } }),
      },
      spaceMember: { findUnique: jest.fn().mockResolvedValue({}) },
      message: { findUnique: jest.fn().mockResolvedValue(message) },
      channel: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ space: { projectId: 'linked-project' } }),
      },
    };
    const service = new ConversationAiService(prisma as never, {} as never);
    return { service, prisma, message };
  }
  it('binds the user and linked project on the server, then revalidates chat permission', async () => {
    const { service, prisma } = setup();
    const fetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        Response.json({ data: { available: true, tasks: [] } }),
      );
    await expect(service.tasks('request', 'claim', 'today')).resolves.toEqual({
      available: true,
      tasks: [],
    });
    const options = fetch.mock.calls[0][1]!;
    expect(JSON.parse(options.body as string)).toEqual({
      userId: 'current-sender',
      scope: 'today',
      projectId: 'linked-project',
    });
    expect(options.redirect).toBe('error');
    expect(prisma.channelMember.findUnique).toHaveBeenCalledTimes(2);
  });
  it('denies a different claim or revoked membership before calling Project', async () => {
    const { service, prisma } = setup();
    const fetch = jest.spyOn(global, 'fetch');
    await expect(service.tasks('request', 'other', 'today')).rejects.toThrow();
    prisma.channelMember.findUnique.mockResolvedValue(null);
    await expect(service.tasks('request', 'claim', 'today')).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not return fetched task data after access is revoked', async () => {
    const { service, prisma } = setup();
    prisma.channelMember.findUnique
      .mockResolvedValueOnce({ channel: { spaceId: 'space' } })
      .mockResolvedValue(null);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        Response.json({ data: { available: true, tasks: [] } }),
      );
    await expect(service.tasks('request', 'claim', 'today')).rejects.toThrow();
  });
  it('does not disguise upstream failure or malformed data as an empty task list', async () => {
    const { service } = setup();
    const fetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 503 }));
    await expect(
      service.tasks('request', 'claim', 'open'),
    ).rejects.toMatchObject({ status: 503 });
    fetch.mockResolvedValue(Response.json({ data: {} }));
    await expect(
      service.tasks('request', 'claim', 'open'),
    ).rejects.toMatchObject({ status: 503 });
  });
});
