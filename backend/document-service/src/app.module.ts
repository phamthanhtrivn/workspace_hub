import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QuotaModule } from './modules/quota/quota.module';
import { DocumentModule } from './modules/document/document.module';
import { UserProfileSnapshotModule } from './modules/user-profile-snapshot/user-profile-snapshot.module';

@Module({
  imports: [
    PrismaModule,
    QuotaModule,
    DocumentModule,
    UserProfileSnapshotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
