import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { SharePermission } from '@prisma/client';

export class AddShareDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email: string;

  @IsEnum(SharePermission, { message: 'Invalid share permission' })
  @IsNotEmpty({ message: 'Share permission cannot be empty' })
  permission: SharePermission;
}
