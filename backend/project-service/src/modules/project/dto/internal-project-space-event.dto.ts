import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProjectChangeAction } from '../../socket/project-socket.types';

export class InternalProjectSpaceEventDto {
  @IsIn(['CREATED', 'UPDATED', 'DELETED'])
  action!: ProjectChangeAction;

  @IsUUID(4, { message: 'Invalid actor ID' })
  actorId!: string;

  @IsUUID(4, { message: 'Invalid space ID' })
  @IsOptional()
  entityId?: string;

  @IsUUID(4, { message: 'Invalid space ID' })
  @IsOptional()
  spaceId?: string | null;

  @IsUUID(4, { message: 'Invalid channel ID' })
  @IsOptional()
  channelId?: string | null;

  @IsBoolean()
  @IsOptional()
  exists?: boolean;

  @IsString()
  @IsOptional()
  reason?: string;
}
