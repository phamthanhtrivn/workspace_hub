import { IsEnum, IsNotEmpty } from 'class-validator';
import { LinkAccess } from '@prisma/client';

export class UpdateLinkAccessDto {
  @IsEnum(LinkAccess, { message: 'Quyền truy cập liên kết không hợp lệ' })
  @IsNotEmpty({ message: 'Quyền truy cập liên kết không được để trống' })
  linkAccess: LinkAccess;
}
