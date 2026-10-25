import { Test } from '@nestjs/testing';
import { ConversationAiController } from './conversation-ai.controller';
import { ConversationAiService } from './conversation-ai.service';
describe('conversation AI internal HTTP authentication', () => {
  it('requires the dedicated key and valid claim UUID before invoking history tools', async () => {
    const previous = process.env.AI_COMMUNICATION_SERVICE_KEY;
    const key = 'fixture-communication-key-not-production-000';
    process.env.AI_COMMUNICATION_SERVICE_KEY = key;
    const ai = {
      enabled: () => true,
      validate: jest.fn().mockResolvedValue({ valid: true }),
      history: jest.fn(),
    };
    const module = await Test.createTestingModule({
      controllers: [ConversationAiController],
      providers: [{ provide: ConversationAiService, useValue: ai }],
    }).compile();
    const app = module.createNestApplication();
    try {
      await app.listen(0, '127.0.0.1');
      const base = await app.getUrl();
      const url =
        base +
        '/internal/conversation-ai/11111111-1111-4111-8111-111111111111/validate';
      expect(
        (
          await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}',
          })
        ).status,
      ).toBe(401);
      expect(
        (
          await fetch(url, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-internal-service-key': key,
            },
            body: JSON.stringify({
              token: '------------------------------------',
            }),
          })
        ).status,
      ).toBe(400);
      expect(ai.validate).not.toHaveBeenCalled();
      const token = '22222222-2222-4222-8222-222222222222';
      expect(
        (
          await fetch(url, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-internal-service-key': key,
            },
            body: JSON.stringify({ token }),
          })
        ).status,
      ).toBe(201);
      expect(ai.validate).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
        token,
      );
    } finally {
      await app.close();
      if (previous === undefined)
        delete process.env.AI_COMMUNICATION_SERVICE_KEY;
      else process.env.AI_COMMUNICATION_SERVICE_KEY = previous;
    }
  });
});
