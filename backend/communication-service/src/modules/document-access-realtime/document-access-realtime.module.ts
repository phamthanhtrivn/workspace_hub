import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SocketPublishingModule } from '../socket/socket-publishing.module';
import { DocumentAccessRealtimeConsumer } from './document-access-realtime.consumer';

@Module({
  imports: [PrismaModule, SocketPublishingModule],
  controllers: [DocumentAccessRealtimeConsumer],
})
export class DocumentAccessRealtimeModule {}
