import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { TaskPriority, TaskStatus } from '../../project/project.enums';
import { Trim } from '../../../common/decorators/trim.decorator';

export class CreateTaskDto {
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  rank?: string;

  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @IsOptional()
  @IsUUID()
  assigneeUserId?: string;
}
