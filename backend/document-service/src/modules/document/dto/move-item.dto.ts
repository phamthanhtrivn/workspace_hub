import { IsUUID, IsOptional, ValidateIf } from 'class-validator';

export class MoveItemDto {
  @IsUUID(4, { message: 'ID thư mục đích không hợp lệ' })
  @IsOptional()
  @ValidateIf((object, value) => value !== null)
  parentFolderId?: string | null;
}
