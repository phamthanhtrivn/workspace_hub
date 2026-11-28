import { APP_GUARD } from '@nestjs/core';
import { JwtIdentityGuard } from './common/guards/jwt-identity.guard';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QuotaModule } from './modules/quota/quota.module';
import { DocumentModule } from './modules/document/document.module';
import { UserProfileSnapshotModule } from './modules/user-profile-snapshot/user-profile-snapshot.module';
import { HealthController } from './common/health.controller';
import { NotebookBridgeModule } from './modules/notebook-bridge/notebook-bridge.module';

@Module({
  imports: [
    PrismaModule,
    QuotaModule,
    DocumentModule,
    UserProfileSnapshotModule,
    NotebookBridgeModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtIdentityGuard }],
})
export class AppModule {}
