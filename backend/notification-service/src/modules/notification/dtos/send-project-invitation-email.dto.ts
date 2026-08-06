import {
  IsEmail,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from "class-validator";

export class SendProjectInvitationEmailDto {
  @IsEmail()
  recipientEmail: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsNotEmpty()
  @IsString()
  projectName: string;

  @IsOptional()
  @IsString()
  inviterName?: string;

  @IsNotEmpty()
  @IsString()
  invitationId: string;

  @IsNotEmpty()
  @IsUrl({
    protocols: ["http", "https"],
    require_protocol: true,
    require_tld: false,
  })
  acceptUrl: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
