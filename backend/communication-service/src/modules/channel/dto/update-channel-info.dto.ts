import { IsString, Length } from 'class-validator';

export class UpdateChannelInfoDto {
  @IsString()
  @Length(1, 80)
  name!: string;
}
