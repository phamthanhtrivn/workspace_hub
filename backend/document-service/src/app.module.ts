import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QuotaModule } from './modules/quota/quota.module';
import { DocumentModule } from './modules/document/document.module';

@Module({
  imports: [PrismaModule, QuotaModule, DocumentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
