import { IsIn } from 'class-validator';
import { SpaceRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsIn(['ADMIN', 'MEMBER'])
  role: SpaceRole;
}
