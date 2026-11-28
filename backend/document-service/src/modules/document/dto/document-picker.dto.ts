import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CopyDocumentDto } from './copy-document.dto';
export class ImportProjectFilesDto {
  @IsUUID() projectId!: string;
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CopyDocumentDto)
  refs!: CopyDocumentDto[];
}
export class DocumentPickerQuery {
  @IsIn(['personal', 'shared', 'project']) scope!:
    'personal' | 'shared' | 'project';
  @IsOptional() @IsUUID() folderId?: string;
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 12;
}
