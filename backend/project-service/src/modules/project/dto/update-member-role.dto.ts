import { IsEnum } from 'class-validator';
import { ProjectRole } from '../project.enums';

export class UpdateMemberRoleDto {
  @IsEnum(ProjectRole)
  role!: ProjectRole;
}
