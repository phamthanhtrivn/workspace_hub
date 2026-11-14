import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire, Module } from 'node:module';

const require = createRequire(new URL('../../backend/project-service/package.json', import.meta.url));
const aiRequire = createRequire(new URL('../../backend/ai-service/api/package.json', import.meta.url));
const communicationRequire = createRequire(new URL('../../backend/communication-service/package.json', import.meta.url));
const config = { CONVERSATION_AI_ENABLED: 'true', CONVERSATION_AI_MODEL: 'test-model', CONVERSATION_AI_MAX_TOKENS: 1536, COMMUNICATION_SERVICE_URL: 'http://communication.invalid', AI_TO_COMMUNICATION_KEY: 'test-only' };

function stub(file, exports) {
  const id = aiRequire.resolve(file), module = new Module(id);
  module.filename = id; module.loaded = true; module.exports = exports;
  aiRequire.cache[id] = module;
}

let modelContent = '', capturedMessages = [], invocations = 0, extraction;
const model = {
  async invoke(messages) {
    invocations++; capturedMessages = messages;
    return { content: modelContent, response_metadata: { finish_reason: 'stop' }, tool_calls: [], invalid_tool_calls: [] };
  },
  bindTools() { return this; },
};
stub('./src/config/env.config.ts', { config });
stub('./src/infrastructure/integrations/chat-model.ts', { createChatModel: () => model });
stub('./src/infrastructure/integrations/ai-model.provider.ts', { aiModels: { createChatModel: () => model } });
stub('./src/modules/conversation-ai/model-admission.ts', { admitConversationModel: async () => {} });
stub('./src/infrastructure/integrations/rag.client.ts', { rag: async () => extraction });
stub('./src/modules/sources/upload-validation.ts', { downloadSource: async () => Buffer.from('test document') });
stub('./src/infrastructure/integrations/document.client.ts', { resolveChatAttachment: async () => { throw Error('Unexpected document lookup'); } });
stub('./src/common/abort-polling.ts', { pollUntilAborted: () => () => {} });

const { processConversation } = aiRequire('./src/jobs/conversation.processor.ts');
const { conversationAnswer } = aiRequire('./src/modules/conversation-ai/conversation-agent.ts');
const { CONVERSATION_AI_MESSAGES } = aiRequire('./src/modules/conversation-ai/conversation-ai.messages.ts');
const { CONVERSATION_LANGUAGE_POLICY } = aiRequire('./src/modules/conversation-ai/conversation-language.ts');
const { CONVERSATION_AI_MESSAGES: communicationMessages } = communicationRequire('./src/modules/conversation-ai/conversation-ai.messages.ts');
const { aiQuestion } = communicationRequire('./src/modules/conversation-ai/conversation-ai-mention.ts');
const { attachmentSummaryPrompt } = require('../../frontend/web/features/chat/utils/attachment-summary.ts');


async function runWorker(question, answer, extracted = { pages: [{ page: 1, text: 'Original source text.' }], images: [] }) {
  const previousFetch = globalThis.fetch;
  const deliveries = []; let validations = 0;
  modelContent = answer; extraction = extracted; invocations = 0;
  globalThis.fetch = async (url, options) => {
    const action = String(url).split('/').at(-1);
    const body = JSON.parse(options.body);
    let data;
    if (action === 'claim') data = { token: 'test-claim', question, attachmentSummary: true };
    else if (action === 'validate') { validations++; data = { valid: true }; }
    else if (action === 'attachment') data = { name: 'Báo cáo.pdf', sizeBytes: 13, downloadUrl: 'http://files.invalid/report.pdf' };
    else if (action === 'complete') { deliveries.push(body); data = {}; }
    else throw Error(`Unexpected action: ${action}`);
    return new Response(JSON.stringify({ data }), { status: 200 });
  };
  try { await processConversation('test-request'); }
  finally { globalThis.fetch = previousFetch; }
  assert.equal(deliveries.length, 1);
  return { delivery: deliveries[0], validations };
}

test('system feedback is English and an empty bot mention defaults to an English question', () => {
  for (const message of [...Object.values(CONVERSATION_AI_MESSAGES), ...Object.values(communicationMessages)]) {
    assert.doesNotMatch(message, /[^\x00-\x7f]/);
    assert.ok(!message.includes('@ai '));
  }
  assert.equal(aiQuestion('@AI Bot'), 'How can you help?');
});

test('attachment worker passes the original question and keeps answer language and notes together', async () => {
  const cases = [
    [aiQuestion(attachmentSummaryPrompt('Báo cáo.pdf')), 'en', 'The document describes the project.'],
    ['Tóm tắt tài liệu này giúp tôi.', 'vi', 'Tài liệu mô tả dự án.'],
    ['Summarize this document in Vietnamese.', 'vi', 'Đây là bản tóm tắt bằng tiếng Việt.'],
    ['Tóm tắt bằng tiếng Anh giúp tôi.', 'en', 'This is the requested English summary.'],
    ['Summary please, tóm tắt giúp?', 'en', 'A summary in the default language.'],
  ];
  for (const [question, language, content] of cases) {
    const { delivery, validations } = await runWorker(question, JSON.stringify({ language, content }), { pages: [{ page: 1, text: 'x'.repeat(25000) }], images: [{}] });
    assert.equal(delivery.failed, false);
    assert.ok(delivery.content.includes(content));
    assert.ok(delivery.content.startsWith(language === 'vi' ? 'Tóm tắt tài liệu:' : 'Document summary:'));
    assert.ok(delivery.content.includes(language === 'vi' ? 'Lưu ý:' : 'Note:'));
    assert.equal(JSON.parse(capturedMessages[1].content).question, question);
    assert.ok(capturedMessages[0].content.includes(CONVERSATION_LANGUAGE_POLICY));
    assert.ok(capturedMessages[0].content.includes('untrusted data'));
    assert.ok(validations >= 2, 'authorization remains required before and after generation');
    assert.equal(invocations, 1, 'language selection must not add a model call');
  }
});

test('ordinary AI answers are passed through in English or Vietnamese without translation', async () => {
  for (const [question, content] of [['Explain this concept.', 'An English answer.'], ['Giải thích khái niệm này.', 'Câu trả lời bằng tiếng Việt.'], ['Giải thích bằng tiếng Anh.', 'An explicitly requested English answer.']]) {
    modelContent = content; invocations = 0;
    const result = await conversationAnswer(question, async () => { assert.fail('general questions do not require history'); }, new AbortController().signal);
    assert.equal(result, content);
    assert.ok(capturedMessages[0].content.includes(CONVERSATION_LANGUAGE_POLICY));
    assert.equal(capturedMessages[1].content, question);
    assert.equal(invocations, 1);
  }
});

test('empty history and document validation failures remain English even for Vietnamese questions', async () => {
  assert.equal(await conversationAnswer('Tóm tắt hội thoại', async () => [], new AbortController().signal), CONVERSATION_AI_MESSAGES.noEligibleHistory);
  const { delivery } = await runWorker('Tóm tắt tài liệu.', '', { pages: [], images: [] });
  assert.equal(delivery.failed, true);
  assert.equal(delivery.content, CONVERSATION_AI_MESSAGES.noReadableText);
  assert.equal(invocations, 0);
});

test('malformed generated summaries produce English feedback rather than leaking model protocol text', async () => {
  const { delivery } = await runWorker('Tóm tắt tài liệu.', 'invalid model JSON');
  assert.equal(delivery.failed, true);
  assert.equal(delivery.content, CONVERSATION_AI_MESSAGES.failed);
  assert.ok(!delivery.content.includes('invalid model JSON'));
});

test('interrupted delivery emits English feedback without replaying generation', async () => {
  const previousFetch = globalThis.fetch;
  let deliveries = 0, saved;
  globalThis.fetch = async (_url, options) => {
    deliveries++;
    assert.equal(JSON.parse(options.body).content, CONVERSATION_AI_MESSAGES.interrupted);
    return new Response(JSON.stringify({ data: {} }));
  };
  invocations = 0;
  try {
    await processConversation('interrupted-request', { claimToken: 'old-claim', save: async answer => { saved = answer; } });
    assert.equal(saved.content, CONVERSATION_AI_MESSAGES.interrupted);
    assert.equal(deliveries, 1);
    assert.equal(invocations, 0);
  } finally { globalThis.fetch = previousFetch; }
});
