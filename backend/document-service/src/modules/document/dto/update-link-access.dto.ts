import { IsEnum, IsNotEmpty } from 'class-validator';
import { LinkAccess } from '@prisma/client';

export class UpdateLinkAccessDto {
  @IsEnum(LinkAccess, { message: 'Invalid link access' })
  @IsNotEmpty({ message: 'Link access cannot be empty' })
  linkAccess: LinkAccess;
}
