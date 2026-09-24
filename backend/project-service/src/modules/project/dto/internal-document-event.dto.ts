import { IsIn, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProjectChangeAction } from '../../socket/project-socket.types';

export class InternalDocumentEventDto {
  @IsIn(['CREATED', 'UPDATED', 'DELETED'])
  action!: ProjectChangeAction;

  @IsUUID(4, { message: 'Invalid actor ID' })
  actorId!: string;

  @IsUUID(4, { message: 'Invalid document ID' })
  entityId!: string;

  @IsUUID(4, { message: 'Invalid parent folder ID' })
  @IsOptional()
  parentFolderId?: string | null;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}
