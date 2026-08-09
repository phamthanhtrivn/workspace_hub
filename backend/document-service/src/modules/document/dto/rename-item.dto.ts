import { IsString, IsNotEmpty } from 'class-validator';

export class RenameItemDto {
  @IsString()
  @IsNotEmpty({ message: 'New name cannot be empty' })
  name: string;
}
