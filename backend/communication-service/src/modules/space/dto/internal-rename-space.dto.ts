import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class InternalRenameSpaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsUUID()
  actorId!: string;
}
