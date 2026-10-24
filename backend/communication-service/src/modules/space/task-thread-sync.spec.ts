import { ClientKafka } from '@nestjs/microservices';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { ProjectNameClient } from './project-name.client';
import { PrivateChannelService } from '../channel/private-channel.service';
import { SpaceService } from './space.service';

function fixture() {
  const tx = {
    $executeRaw: jest.fn(),
    projectTaskSnapshot: {
      findUnique: jest.fn().mockResolvedValue({
        projectId: 'project',
        version: 4n,
        payload: {
          type: 'TASK',
          taskId: 'task',
          title: 'Latest',
          taskVersion: '4',
        },
      }),
    },
    message: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn((args: { data: { content: string } }) =>
        Promise.resolve({ id: 'root', content: args.data.content }),
      ),
    },
  };
  const prisma = {
    space: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'space', createdBy: 'space-owner' }),
    },
    channel: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'private',
        name: 'private',
        visibility: 'PRIVATE',
        ownerId: 'channel-owner',
        members: [{ userId: 'channel-owner' }],
        setting: { allowSendMessage: true },
      }),
    },
    spaceMember: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { userId: 'channel-owner' },
          { userId: 'outsider' },
        ]),
      findUnique: jest.fn().mockResolvedValue({ role: 'ADMIN' }),
    },
    channelMember: { createMany: jest.fn() },
    $transaction: jest
      .fn()
      .mockImplementation((fn: (db: typeof tx) => unknown) => fn(tx)),
  };
  const service = new SpaceService(
    prisma as unknown as PrismaService,
    {} as ClientKafka,
    {} as ChatSocketPublisher,
    {} as UserProfileSnapshotService,
    {} as ProjectNameClient,
    {} as PrivateChannelService,
  );
  return { prisma, tx, service };
}
describe('opening synchronized task threads', () => {
  it('uses a newer Kafka snapshot when opening a private thread and does not add outsiders', async () => {
    const { service, prisma, tx } = fixture();
    await service.ensureTaskThread(
      'project',
      'task',
      'Stale title',
      'channel-owner',
      'private',
      'TODO',
      'LOW',
      undefined,
      '3',
    );
    expect(
      JSON.parse(tx.message.create.mock.calls[0][0].data.content),
    ).toMatchObject({ title: 'Latest', taskVersion: '4' });
    expect(prisma.channelMember.createMany).not.toHaveBeenCalled();
  });
  it('keeps a newer Project read when the Kafka snapshot has not caught up yet', async () => {
    const { service, tx } = fixture();
    await service.ensureTaskThread(
      'project',
      'task',
      'Newest title',
      'channel-owner',
      'private',
      'IN_REVIEW',
      'HIGH',
      undefined,
      '5',
    );
    expect(
      JSON.parse(tx.message.create.mock.calls[0][0].data.content),
    ).toMatchObject({
      title: 'Newest title',
      taskVersion: '5',
      status: 'IN_REVIEW',
    });
  });
  it('does not fall back to a public channel when a private channel was explicitly requested without access', async () => {
    const { service, prisma } = fixture();
    await expect(
      service.ensureTaskThread(
        'project',
        'task',
        'Title',
        'space-owner',
        'private',
      ),
    ).rejects.toThrow('You cannot open');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.channelMember.createMany).not.toHaveBeenCalled();
  });
  it('keeps private owner-only posting restrictions even for a space admin', async () => {
    const { service, prisma } = fixture();
    prisma.channel.findFirst.mockResolvedValue({
      id: 'private',
      name: 'private',
      visibility: 'PRIVATE',
      ownerId: 'channel-owner',
      members: [{ userId: 'space-owner' }],
      setting: { allowSendMessage: false },
    });
    await expect(
      service.ensureTaskThread(
        'project',
        'task',
        'Title',
        'space-owner',
        'private',
      ),
    ).rejects.toThrow('You cannot open');
  });
});
