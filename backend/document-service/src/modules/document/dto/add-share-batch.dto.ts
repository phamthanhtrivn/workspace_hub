import { IsArray, IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { SharePermission } from '@prisma/client';

export class AddShareBatchDto {
  @IsArray({ message: 'Emails must be an array' })
  @IsEmail({}, { each: true, message: 'Each email must be a valid email address' })
  @IsNotEmpty({ each: true, message: 'Emails cannot be empty' })
  emails: string[];

  @IsEnum(SharePermission, { message: 'Invalid share permission' })
  @IsNotEmpty({ message: 'Share permission cannot be empty' })
  permission: SharePermission;
}
