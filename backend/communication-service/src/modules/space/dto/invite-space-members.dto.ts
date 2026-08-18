import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class InviteSpaceMemberDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  fullName?: string | null;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}

export class InviteSpaceMembersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InviteSpaceMemberDto)
  invitees: InviteSpaceMemberDto[];
}
