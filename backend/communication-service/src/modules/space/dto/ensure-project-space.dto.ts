import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsNumberString,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { SpaceRole } from '@prisma/client';

export class ProjectSpaceMemberDto {
  @IsUUID()
  userId: string;

  @IsIn([SpaceRole.ADMIN, SpaceRole.MEMBER])
  role: SpaceRole;
}

export class EnsureProjectSpaceDto {
  @IsOptional()
  @IsNumberString({ no_symbols: true })
  syncRevision?: string;
  @IsUUID()
  projectId: string;

  @IsString()
  name: string;

  @IsUUID()
  ownerId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectSpaceMemberDto)
  members: ProjectSpaceMemberDto[];
}
