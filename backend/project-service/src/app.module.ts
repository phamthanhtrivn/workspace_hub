import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectModule } from './modules/project/project.module';

@Module({
  imports: [PrismaModule, ProjectModule],
})
export class AppModule {}
