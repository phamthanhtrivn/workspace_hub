import { ConversationAiService, aiQuestion } from './conversation-ai.service';
describe('conversation AI authorization and scope', () => {
  it('recognizes only a leading @ai mention', () => {
    expect(aiQuestion('@AI tóm tắt hội thoại')).toBe('tóm tắt hội thoại');
    expect(aiQuestion('email@ai.com')).toBeNull();
    expect(aiQuestion('hello @alice')).toBeNull();
  });
  const request = {
    id: '11111111-1111-4111-8111-111111111111',
    actor_id: 'actor',
    chat_id: 'channel',
    chat_type: 'CHANNEL',
    status: 'RUNNING',
    token: 'secret',
  };
  function harness() {
    const message = {
      id: request.id,
      senderId: 'actor',
      channelId: 'channel',
      content: '@ai summary',
      type: 'TEXT',
      createdAt: new Date(),
      threadParentId: null as string | null,
      recalled: false,
      deletedAt: null,
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
    };
    return {
      prisma,
      message,
      service: new ConversationAiService(
        prisma,
        {} as import('../socket/chat/chat-socket.publisher').ChatSocketPublisher,
      ),
    };
  }
  it('denies nonmembers before querying history', async () => {
    const { service, prisma } = harness();
    prisma.channelMember.findUnique.mockResolvedValue(null);
    await expect(service.history(request.id, 'secret')).rejects.toThrow();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
  it('denies wrong claim token and recalled trigger', async () => {
    const { service, message } = harness();
    await expect(service.history(request.id, 'wrong')).rejects.toThrow();
    message.recalled = true;
    await expect(service.history(request.id, 'secret')).rejects.toThrow();
  });
  it('queries exact chat, preceding text only, bounded and chronological', async () => {
    const { service, prisma, message } = harness();
    prisma.$queryRaw
      .mockResolvedValueOnce([request])
      .mockResolvedValueOnce([{ content: 'new' }, { content: 'old' }]);
    expect(await service.history(request.id, 'secret')).toEqual([
      { content: 'old' },
      { content: 'new' },
    ]);
    const sql = (
      prisma.$queryRaw.mock.calls as unknown[][]
    )[1][0] as import('@prisma/client').Prisma.Sql;
    expect(sql.sql).toMatch(/LIMIT 30/);
    expect(sql.sql).toMatch(/deleted_at IS NULL AND NOT m.recalled/);
    expect(sql.sql).toMatch(/thread_parent_id IS NULL/);
    expect(sql.values).toContain('channel');
    expect(sql.values).toContain(message.id);
  });
  it('thread reads include only root and its replies', async () => {
    const { service, prisma, message } = harness();
    message.threadParentId = 'root';
    prisma.message.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === 'root'
            ? { ...message, id: 'root', threadParentId: null }
            : message,
        ),
    );
    prisma.$queryRaw.mockResolvedValueOnce([request]).mockResolvedValueOnce([]);
    await service.history(request.id, 'secret');
    const sql = (
      prisma.$queryRaw.mock.calls as unknown[][]
    )[1][0] as import('@prisma/client').Prisma.Sql;
    expect(sql.sql).toMatch(/thread_parent_id=\?::uuid OR m.id=\?::uuid/);
    expect(sql.values.filter((v: string) => v === 'root')).toHaveLength(2);
  });
  it('wakes dispatch after commit without waiting for the recovery interval', () => {
    const previous = process.env.CONVERSATION_AI_ENABLED;
    process.env.CONVERSATION_AI_ENABLED = 'true';
    jest.useFakeTimers();
    try {
      const { service } = harness();
      const dispatch = jest.spyOn(service, 'dispatch').mockResolvedValue();
      service.notify({ type: 'TEXT', content: 'ordinary text' });
      jest.runOnlyPendingTimers();
      expect(dispatch).not.toHaveBeenCalled();
      service.notify({ type: 'TEXT', content: '@ai hello' });
      service.notify({ type: 'TEXT', content: '@ai another' });
      expect(dispatch).not.toHaveBeenCalled();
      jest.runOnlyPendingTimers();
      expect(dispatch).toHaveBeenCalledTimes(1);
      service.onModuleDestroy();
      service.notify({ type: 'TEXT', content: '@ai ignored after shutdown' });
      jest.runOnlyPendingTimers();
      expect(dispatch).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
      if (previous === undefined) delete process.env.CONVERSATION_AI_ENABLED;
      else process.env.CONVERSATION_AI_ENABLED = previous;
    }
  });
  it('continues dispatch and outbox recovery after one request fails', async () => {
    const previous = process.env.CONVERSATION_AI_ENABLED;
    process.env.CONVERSATION_AI_ENABLED = 'true';
    const { service, prisma } = harness();
    prisma.$queryRaw
      .mockResolvedValueOnce([request, { ...request, id: 'second' }])
      .mockResolvedValueOnce([]);
    const flush = jest.spyOn(service, 'flushOutbox').mockResolvedValue();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    const warn = jest
      .spyOn(
        (service as unknown as { logger: { warn: (message: string) => void } })
          .logger,
        'warn',
      )
      .mockImplementation(() => {});
    try {
      await service.dispatch();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(flush).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      fetchMock.mockRestore();
      warn.mockRestore();
      if (previous === undefined) delete process.env.CONVERSATION_AI_ENABLED;
      else process.env.CONVERSATION_AI_ENABLED = previous;
    }
  });
  it('rejects an edited question against the original prompt snapshot', async () => {
    const { service, prisma, message } = harness();
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256').update('summary').digest('hex');
    prisma.$queryRaw.mockResolvedValue([{ ...request, question_hash: hash }]);
    message.content = '@ai a changed question';
    await expect(service.validate(request.id, 'secret')).rejects.toThrow();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
  it('renews only a running request with valid membership and token', async () => {
    const { service, prisma } = harness();
    await expect(service.validate(request.id, 'secret')).resolves.toEqual({
      valid: true,
    });
    prisma.$queryRaw.mockResolvedValue([{ ...request, status: 'COMPLETED' }]);
    await expect(service.validate(request.id, 'secret')).rejects.toThrow();
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
