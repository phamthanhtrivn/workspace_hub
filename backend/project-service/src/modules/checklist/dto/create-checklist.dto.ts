import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChecklistDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;
}
