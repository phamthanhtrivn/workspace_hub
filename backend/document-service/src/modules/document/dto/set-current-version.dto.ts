import { IsUUID } from 'class-validator';

export class SetCurrentVersionDto {
  @IsUUID()
  versionId!: string;
}
