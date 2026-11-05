import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { IsIn, IsUUID } from "class-validator";
import { Public } from "../../common/decorators/public.decorator";
import { isServiceKeyValid } from "../../common/auth/service-key";
import { ProjectAccessService } from "./project-access.service";

class ProjectAuthorizationRequest {
  @IsUUID() userId!: string;
  @IsUUID() projectId!: string;
  @IsIn(["READ", "EDIT_DOCUMENTS"]) operation!: "READ" | "EDIT_DOCUMENTS";
}

@Public()
@Controller("internal/project-access")
export class ProjectAuthorizationController {
  constructor(private readonly access: ProjectAccessService) {}
  @Post("authorize")
  async authorize(
    @Headers("x-internal-service-key") key: string,
    @Body() request: ProjectAuthorizationRequest,
  ) {
    const documentCaller = isServiceKeyValid(key, process.env.DOCUMENT_TO_PROJECT_KEY);
    const communicationCaller = request.operation === "READ" &&
      isServiceKeyValid(key, process.env.COMMUNICATION_TO_PROJECT_KEY);
    if (!documentCaller && !communicationCaller)
      throw new UnauthorizedException();
    return this.access.authorizeResource(
      request.userId,
      request.projectId,
      request.operation,
    );
  }
}
