import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { ChannelVisibility } from '@prisma/client';

export class CreateChannelDto {
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsOptional()
  @IsEnum(ChannelVisibility)
  visibility?: ChannelVisibility;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  memberUserIds?: string[];
}
