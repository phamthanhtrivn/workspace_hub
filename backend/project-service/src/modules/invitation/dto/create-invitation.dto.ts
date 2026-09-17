import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateInvitationDto {
  @IsNotEmpty()
  @IsUUID()
  invitedUserId!: string;
}
