import { IsArray, IsEmail, IsNotEmpty } from 'class-validator';

export class CheckPermissionsDto {
  @IsArray({ message: 'Emails must be an array' })
  @IsEmail(
    {},
    { each: true, message: 'Each email must be a valid email address' },
  )
  @IsNotEmpty({ each: true, message: 'Emails cannot be empty' })
  emails: string[];
}
