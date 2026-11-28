import { Module } from "@nestjs/common";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { ProjectAccessModule } from "../project/project-access.module";
import { TaskPolicyService } from "./task-policy.service";
@Module({
  imports: [PrismaModule, ProjectAccessModule],
  providers: [TaskPolicyService],
  exports: [TaskPolicyService],
})
export class TaskPolicyModule {}
