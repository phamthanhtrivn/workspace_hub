import { IsEnum, IsUUID } from "class-validator";

export enum ProjectInvitationResolution {
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
}

export class ResolveProjectInvitationDto {
  @IsUUID()
  recipientId: string;

  @IsEnum(ProjectInvitationResolution)
  status: ProjectInvitationResolution;
}
