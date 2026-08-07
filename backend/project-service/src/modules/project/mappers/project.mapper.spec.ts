import { ProjectStatus, ProjectType, ProjectVisibility } from '../project.enums';
import { toProjectResponse } from './project.mapper';

describe('project mapper', () => {
  it('keeps the project type and metadata in the public response', () => {
    const project = {
      id: 'project-id',
      name: 'WorkspaceHub',
      color: '#6366f1',
      icon: '📁',
      description: 'Project description',
      ownerId: 'owner-id',
      status: ProjectStatus.ACTIVE,
      projectType: ProjectType.SOFTWARE_DEVELOPMENT,
      visibility: ProjectVisibility.MEMBERS_ONLY,
      startDate: null,
      dueDate: null,
      archived: false,
      version: BigInt(0),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };

    expect(toProjectResponse(project)).toMatchObject({
      id: 'project-id',
      projectType: ProjectType.SOFTWARE_DEVELOPMENT,
      visibility: ProjectVisibility.MEMBERS_ONLY,
      description: 'Project description',
    });
  });
});
