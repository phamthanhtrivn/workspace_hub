import { DirectConversationService } from './direct-conversation.service';

jest.mock('src/infrastructure/s3/s3.service', () => ({ S3Service: class {} }));

describe('DirectConversationService draft visibility', () => {
  function createService() {
    const participants = [
      { userId: 'alice', draftOpenedAt: null },
      { userId: 'bob', draftOpenedAt: null },
    ];
    const prisma = {
      directConversation: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'dm', participants, messages: [] }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      directConversationParticipant: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const profiles = {
      attachProfilesToMembers: jest
        .fn()
        .mockImplementation((members) => members),
      attachSenderProfilesToMessages: jest
        .fn()
        .mockImplementation((messages) => messages),
    };
    return {
      prisma,
      participants,
      service: new DirectConversationService(
        prisma as any,
        {} as any,
        profiles as any,
      ),
    };
  }

  it('marks only the person who opens an existing empty DM', async () => {
    const { prisma, service, participants } = createService();
    await service.createDirectConversation('alice', 'bob');
    expect(
      prisma.directConversationParticipant.updateMany,
    ).toHaveBeenCalledWith({
      where: { conversationId: 'dm', userId: 'alice', draftOpenedAt: null },
      data: { draftOpenedAt: expect.any(Date) },
    });
    expect(participants[1].draftOpenedAt).toBeNull();

    await service.createDirectConversation('bob', 'alice');
    expect(
      prisma.directConversationParticipant.updateMany,
    ).toHaveBeenCalledWith({
      where: { conversationId: 'dm', userId: 'bob', draftOpenedAt: null },
      data: { draftOpenedAt: expect.any(Date) },
    });
  });

  it('creates a draft marker only for the initiator', async () => {
    const { prisma, service } = createService();
    prisma.directConversation.findFirst.mockResolvedValue(null);
    prisma.directConversation.create.mockResolvedValue({
      id: 'new-dm',
      participants: [{ userId: 'alice' }, { userId: 'bob' }],
      messages: [],
    });

    await service.createDirectConversation('alice', 'bob');

    expect(prisma.directConversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          participants: {
            create: [
              { userId: 'alice', draftOpenedAt: expect.any(Date) },
              { userId: 'bob' },
            ],
          },
        },
      }),
    );
  });

  it('lists a DM only for an opener or when it has a stored message', async () => {
    const { prisma, service } = createService();
    await service.getUserDirectConversations('bob');
    expect(prisma.directConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          participants: { some: { userId: 'bob' } },
          OR: [
            { messages: { some: {} } },
            {
              participants: {
                some: { userId: 'bob', draftOpenedAt: { not: null } },
              },
            },
          ],
        }),
      }),
    );
  });
});
