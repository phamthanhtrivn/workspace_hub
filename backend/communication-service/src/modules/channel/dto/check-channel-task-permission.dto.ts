import { IsUUID } from 'class-validator';

export class CheckChannelTaskPermissionDto {
  @IsUUID()
  projectId!: string;

  @IsUUID()
  userId!: string;
}
