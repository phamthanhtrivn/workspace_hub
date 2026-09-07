import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectAccessService } from './project-access.service';
import { ProjectStatus, ProjectType, ProjectVisibility } from './project.enums';
import { ProjectService } from './project.service';
import { ProjectTemplateService } from './project-template.service';

describe('ProjectService date updates', () => {
  it('uses the creation time as the default project start date', async () => {
    const createdAt = new Date('2026-08-26T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(createdAt);
    const ownerId = crypto.randomUUID();
    const create = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({
        ...data,
        id: crypto.randomUUID(),
        version: 0n,
      }),
    );
    const transaction = jest.fn().mockImplementation((callback) =>
      callback({ project: { create } }),
    );
    const service = new ProjectService(
      { $transaction: transaction } as unknown as PrismaService,
      {} as ProjectAccessService,
      { initialize: jest.fn() } as unknown as ProjectTemplateService,
    );

    try {
      await service.create(ownerId, { name: 'Project' });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ startDate: createdAt }),
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('stores null when project dates are cleared', async () => {
    const projectId = crypto.randomUUID();
    const ownerId = crypto.randomUUID();
    const current = {
      id: projectId,
      name: 'Project',
      ownerId,
      status: ProjectStatus.ACTIVE,
      projectType: ProjectType.GENERAL,
      visibility: ProjectVisibility.MEMBERS_ONLY,
      archived: false,
      startDate: new Date('2026-08-01T00:00:00.000Z'),
      dueDate: new Date('2026-08-31T00:00:00.000Z'),
      version: 0n,
      setting: null,
    };
    const update = jest.fn().mockResolvedValue({
      ...current,
      startDate: null,
      dueDate: null,
    });
    const service = new ProjectService(
      { project: { update } } as unknown as PrismaService,
      {
        requireOwner: jest.fn().mockResolvedValue(current),
      } as unknown as ProjectAccessService,
      {} as ProjectTemplateService,
    );

    await service.update(ownerId, projectId, {
      startDate: null,
      dueDate: null,
    } as unknown as UpdateProjectDto);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ startDate: null, dueDate: null }),
      }),
    );
  });
});
