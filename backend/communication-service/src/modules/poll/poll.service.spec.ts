import { PollService } from './poll.service';
describe('Poll vote consistency', () => {
  function setup(multipleChoice = false) {
    const votes = new Map<string, string[]>();
    const tx = { $queryRaw: jest.fn(), channelMember: { findUnique: jest.fn().mockResolvedValue({}) },
      poll: { findUnique: jest.fn(async () => ({ id: 'poll', createdBy: 'owner', multipleChoice, isLocked: false,
        message: { channelId: 'channel' }, options: ['a', 'b'].map(id => ({ id, votes: (votes.get(id) ?? []).map(userId => ({ userId })) })) })), update: jest.fn() },
      pollVote: { deleteMany: jest.fn(async ({ where }) => {
        const keys = typeof where.pollOptionId === 'string' ? [where.pollOptionId] : where.pollOptionId.in;
        for (const id of keys) votes.set(id, (votes.get(id) ?? []).filter(userId => userId !== where.userId));
      }), upsert: jest.fn(async ({ create }) => votes.set(create.pollOptionId, [...new Set([...(votes.get(create.pollOptionId) ?? []), create.userId])])) },
      message: { update: jest.fn().mockResolvedValue({ senderId: 'owner', medias: [] }) },
    };
    let tail = Promise.resolve();
    const prisma = { $transaction: jest.fn(callback => { const next = tail.then(() => callback(tx)); tail = next.catch(() => undefined); return next; }) };
    const service = new PollService(prisma as any, { attachSenderProfileToMessage: jest.fn(value => value) } as any, {} as any);
    return { service, votes, tx };
  }
  it('repeated selected=true requests retain the same vote', async () => {
    const { service, votes } = setup();
    await service.votePoll('channel', 'message', 'a', 'user', true);
    await service.votePoll('channel', 'message', 'a', 'user', true);
    expect(votes.get('a')).toEqual(['user']);
  });
  it('serializes changes to different options into one single-choice vote', async () => {
    const { service, votes, tx } = setup();
    await Promise.all(['a', 'b'].map(option => service.votePoll('channel', 'message', option, 'user', true)));
    expect([...votes.values()].flat()).toEqual(['user']); expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it('rejects conversion without deleting existing multiple votes', async () => {
    const { service, votes, tx } = setup(true); votes.set('a', ['user']); votes.set('b', ['user']);
    await expect(service.updatePoll('channel', 'message', 'Title', false, true, 'owner')).rejects.toThrow('Some participants selected multiple options');
    expect(tx.poll.update).not.toHaveBeenCalled(); expect(tx.pollVote.deleteMany).not.toHaveBeenCalled();
  });
});
