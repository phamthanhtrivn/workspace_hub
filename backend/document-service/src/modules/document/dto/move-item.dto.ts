import { IsUUID, IsOptional, ValidateIf } from 'class-validator';

export class MoveItemDto {
  @IsUUID(4, { message: 'Invalid target folder ID' })
  @IsOptional()
  @ValidateIf((object, value) => value !== null)
  parentFolderId?: string | null;
}
