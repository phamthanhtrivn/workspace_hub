import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { SharePermission } from '@prisma/client';

export class EnsureProjectRootFolderMemberDto {
  @IsUUID(4, { message: 'Invalid member user ID' })
  userId: string;

  @IsEmail({}, { message: 'Invalid member email' })
  email: string;

  @IsEnum(SharePermission, { message: 'Invalid member document permission' })
  permission: SharePermission;
}

export class EnsureProjectRootFolderDto {
  @IsString()
  @IsNotEmpty({ message: 'Folder name cannot be empty' })
  name: string;

  @IsUUID(4, { message: 'Invalid owner ID' })
  ownerId: string;

  @IsEmail({}, { message: 'Invalid owner email' })
  ownerEmail: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnsureProjectRootFolderMemberDto)
  @IsOptional()
  members?: EnsureProjectRootFolderMemberDto[];
}
