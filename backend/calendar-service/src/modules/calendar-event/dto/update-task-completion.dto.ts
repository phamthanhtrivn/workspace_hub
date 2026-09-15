import { IsBoolean } from 'class-validator';

export class UpdateTaskCompletionDto {
  @IsBoolean()
  completed: boolean;
}
