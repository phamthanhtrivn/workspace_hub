import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module';
import { ProjectModule } from './modules/project/project.module';
import { ProjectKafkaModule } from './infrastructure/kafka/project-kafka.module';

@Module({
  imports: [PrismaModule, ProjectKafkaModule, ProjectModule],
})
export class AppModule {}
