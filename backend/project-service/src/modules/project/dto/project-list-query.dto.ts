import { IsEnum, IsString, MaxLength } from 'class-validator';
import { OptionalField } from '../../../common/decorators/optional-field.decorator';
import { Trim } from '../../../common/decorators/trim.decorator';
import { PaginationQueryDto } from '../../../common/utils/pagination';
import { PROJECT_LIST_PAGE_SIZE } from '../project.constants';
import { ProjectStatus } from '../project.enums';

export class ProjectListQueryDto extends PaginationQueryDto {
  limit = PROJECT_LIST_PAGE_SIZE;

  @OptionalField()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @OptionalField()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
