import { IsEnum } from 'class-validator';
import { ProjectRole } from '../../shared/project.enums';

export class UpdateMemberRoleDto {
  @IsEnum(ProjectRole)
  role!: ProjectRole;
}
