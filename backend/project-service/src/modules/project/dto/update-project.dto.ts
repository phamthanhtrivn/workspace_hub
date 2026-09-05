import { OptionalField } from '../../../common/optional-field.decorator';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProjectStatus, ProjectType, ProjectVisibility } from '../project.enums';
import { Trim } from '../../../common/trim.decorator';

export class UpdateProjectDto {
  @OptionalField()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @OptionalField()
  @IsString()
  @MaxLength(20)
  color?: string;

  @OptionalField()
  @IsString()
  @MaxLength(10)
  icon?: string;

  @OptionalField()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @OptionalField()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @OptionalField()
  @IsEnum(ProjectType)
  projectType?: ProjectType;

  @OptionalField()
  @IsEnum(ProjectVisibility)
  visibility?: ProjectVisibility;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}
