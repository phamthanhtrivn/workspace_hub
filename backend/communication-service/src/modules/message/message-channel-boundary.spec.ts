import { MessageType } from '@prisma/client';
import { MessageService } from './message.service';
import { MESSAGE_DIRECTION } from './types/message.enums';

describe('Message channel boundaries', () => {
  it('does not return a private message using an around cursor in another channel', async () => {
    const prisma = {
      message: {
        findUnique: jest
          .fn()
          .mockImplementation(
            ({ where }: { where: { id: string; channelId?: string } }) =>
              where.channelId === 'public'
                ? null
                : {
                    id: 'secret',
                    channelId: 'private',
                    content: 'confidential',
                    medias: [],
                  },
          ),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    type Dependencies = ConstructorParameters<typeof MessageService>;
    const service = new MessageService(
      {} as Dependencies[0],
      prisma as unknown as Dependencies[1],
      {} as Dependencies[2],
      {
        attachSenderProfilesToMessages: jest.fn(
          (messages: unknown) => messages,
        ),
      } as unknown as Dependencies[3],
      {} as Dependencies[4],
    );
    const result = await service.getConversationMessages(
      'public',
      'secret',
      20,
      MESSAGE_DIRECTION.AROUND,
    );
    expect(result.messages).toEqual([]);
  });

  it('rejects replies to a thread parent in another channel before updating or creating messages', async () => {
    const tx = {
      message: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'parent',
          channelId: 'private',
          senderId: 'owner',
        }),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    };
    type Dependencies = ConstructorParameters<typeof MessageService>;
    const service = new MessageService(
      {} as Dependencies[0],
      prisma as unknown as Dependencies[1],
      {} as Dependencies[2],
      {} as Dependencies[3],
      {} as Dependencies[4],
    );
    await expect(
      service.createMessage(
        'public',
        'user',
        'reply',
        MessageType.SYSTEM,
        undefined,
        undefined,
        undefined,
        'parent',
      ),
    ).rejects.toThrow('Thread parent message does not exist');
    expect(tx.message.update).not.toHaveBeenCalled();
    expect(tx.message.create).not.toHaveBeenCalled();
  });
});
