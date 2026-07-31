import { IsString, IsNotEmpty } from 'class-validator';

export class RenameItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên mới không được trống' })
  name: string;
}
