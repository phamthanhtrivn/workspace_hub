import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsString, MaxLength } from 'class-validator';
import { OptionalField } from '../../../common/decorators/optional-field.decorator';
import { Trim } from '../../../common/decorators/trim.decorator';
import { PaginationQueryDto } from '../../../common/utils/pagination';
import { TaskPriority, TaskStatus } from '../../project/project.enums';

function toQueryBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

export class GetProjectTasksQueryDto extends PaginationQueryDto {
  @OptionalField()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @OptionalField()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @OptionalField()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @OptionalField()
  @Trim()
  @IsString()
  @MaxLength(2000)
  assigneeUserIds?: string;

  @OptionalField()
  @Transform(({ value }) => toQueryBoolean(value))
  @IsBoolean()
  unassigned?: boolean;

  @OptionalField()
  @Transform(({ value }) => toQueryBoolean(value))
  @IsBoolean()
  onlyMine?: boolean;
}
