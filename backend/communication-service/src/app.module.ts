import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConversationModule } from './modules/conversation/conversation.module';
import { MessageModule } from './modules/message/message.module';
import { PollModule } from './modules/poll/poll.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConversationModule, 
    MessageModule, 
    PollModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
