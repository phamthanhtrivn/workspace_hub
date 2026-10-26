import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import { RuntimeConfigModule } from '../../common/config/runtime-config.module';
import { Test } from '@nestjs/testing';
import { MessageModule } from '../message/message.module';
import { DirectMessageModule } from '../direct-message/direct-message.module';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { ConversationAiService } from './conversation-ai.service';
describe('conversation AI module wiring', () => {
  it('resolves channel, direct and socket dependencies together', async () => {
    const module = await Test.createTestingModule({
      imports: [RuntimeConfigModule, MessageModule, DirectMessageModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(S3Service)
      .useValue({})
      .overrideProvider('KAFKA_PRODUCER')
      .useValue({})
      .compile();
    expect(module.get(ConversationAiService)).toBeDefined();
    expect(() => module.get(ChatSocketPublisher).assertReady()).toThrow(
      'Socket server not initialized',
    );
    await module.close();
  });
});
