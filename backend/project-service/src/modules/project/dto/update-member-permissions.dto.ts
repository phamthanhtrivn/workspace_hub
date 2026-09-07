import { IsBoolean } from 'class-validator';

export class UpdateMemberPermissionsDto {
  @IsBoolean()
  canCreateTask!: boolean;

  @IsBoolean()
  canEditOwnTask!: boolean;

  @IsBoolean()
  canEditOthersTask!: boolean;

  @IsBoolean()
  canManageSprints!: boolean;

  @IsBoolean()
  canManageMembers!: boolean;

  @IsBoolean()
  canManageLabels!: boolean;
}
