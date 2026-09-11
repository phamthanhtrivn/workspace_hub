import { OptionalField } from '../../../common/optional-field.decorator';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { TaskPriority, TaskStatus, TaskType } from '../project.enums';
import { Trim } from '../../../common/trim.decorator';

export class UpdateTaskDto {
  @IsOptional()
  @IsUUID()
  assigneeUserId?: string | null;

  @OptionalField()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @OptionalField()
  @IsString()
  description?: string;

  @OptionalField()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @OptionalField()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @OptionalField()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @OptionalField()
  @IsBoolean()
  allDay?: boolean;

  @OptionalField()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;

  @OptionalField()
  @IsString()
  @MaxLength(100)
  rank?: string;

  @OptionalField()
  @IsBoolean()
  archived?: boolean;

  @OptionalField()
  @IsUUID()
  parentTaskId?: string;

  @OptionalField()
  @IsBoolean()
  clearParent?: boolean;

  @OptionalField()
  @IsBoolean()
  isParentTask?: boolean;

  @OptionalField()
  @IsBoolean()
  autoCompleteSprint?: boolean;
}
