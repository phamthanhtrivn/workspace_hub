import { IsIn } from 'class-validator';
import { SpaceRole } from '@prisma/client';

export class UpdateSpaceMemberRoleDto {
  @IsIn([SpaceRole.ADMIN, SpaceRole.MEMBER])
  role: SpaceRole;
}
