import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { SharePermission } from '@prisma/client';

export class AddShareDto {
  @IsEmail({}, { message: 'Địa chỉ email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsEnum(SharePermission, { message: 'Quyền chia sẻ không hợp lệ' })
  @IsNotEmpty({ message: 'Quyền chia sẻ không được để trống' })
  permission: SharePermission;
}
