import { IsBoolean } from 'class-validator';

export class UpdateChecklistDto {
  @IsBoolean()
  completed!: boolean;
}
