import { APP_GUARD } from "@nestjs/core";
import { JwtIdentityGuard } from "./common/guards/jwt-identity.guard";
import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { HealthController } from "./common/health.controller";

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtIdentityGuard }],
})
export class AppModule {}
