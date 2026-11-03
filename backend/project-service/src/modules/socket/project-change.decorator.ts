import { SetMetadata } from '@nestjs/common';
import { ProjectChangeAction, ProjectResource } from './project-socket.types';

export const PROJECT_CHANGE_METADATA = 'project:change';

export interface ProjectChangeMetadata {
  resource: ProjectResource;
  action: ProjectChangeAction;
}

export const ProjectChange = (resource: ProjectResource, action: ProjectChangeAction) =>
  SetMetadata(PROJECT_CHANGE_METADATA, { resource, action } satisfies ProjectChangeMetadata);
