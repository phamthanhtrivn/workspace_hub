import { IsEnum } from 'class-validator';
import { SpaceRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsEnum(SpaceRole)
  role: SpaceRole;
}
