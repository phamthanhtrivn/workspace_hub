import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtIdentityGuard } from "./common/auth/jwt-identity.guard";
import { RuntimeConfigModule } from "./common/config/runtime-config.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { ProjectModule } from "./modules/project/project.module";
import { ProjectKafkaModule } from "./infrastructure/kafka/project-kafka.module";
import { HealthController } from "./common/health.controller";

@Module({
  imports: [
    RuntimeConfigModule,
    PrismaModule,
    ProjectKafkaModule,
    ProjectModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtIdentityGuard }],
})
export class AppModule {}
