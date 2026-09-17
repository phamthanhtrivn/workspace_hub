import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CommentService } from './comment.service';
import { ProjectAccessService } from '../project/project-access.service';
import { ActivityService } from '../activity/activity.service';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';

describe('CommentService', () => {
  let service: CommentService;
  let prisma: {
    task: { findFirst: jest.Mock };
    taskComment: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let access: {
    requireReadAccess: jest.Mock;
    requireWriteAccess: jest.Mock;
    findProject: jest.Mock;
  };
  let activities: {
    record: jest.Mock;
  };
  let userProfiles: {
    getProfileByUserId: jest.Mock;
    getProfilesByUserIds: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      task: { findFirst: jest.fn() },
      taskComment: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    access = {
      requireReadAccess: jest.fn(),
      requireWriteAccess: jest.fn(),
      findProject: jest.fn(),
    };
    activities = {
      record: jest.fn(),
    };
    userProfiles = {
      getProfileByUserId: jest.fn().mockResolvedValue(null),
      getProfilesByUserIds: jest.fn().mockResolvedValue(new Map()),
    };

    service = new CommentService(
      prisma as unknown as PrismaService,
      access as unknown as ProjectAccessService,
      activities as unknown as ActivityService,
      userProfiles as unknown as UserProfileSnapshotService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws NotFoundException when task is missing in findAll', async () => {
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(
      service.findAll('user-1', 'task-1', { page: 1, limit: 10 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
