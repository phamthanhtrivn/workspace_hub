import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire, Module } from 'node:module';

const require = createRequire(new URL('../project-service/package.json', import.meta.url));
require('ts-node').register({ transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', esModuleInterop: true, experimentalDecorators: true } });
const aiRequire = createRequire(new URL('../ai-service/api/package.json', import.meta.url));
const communicationRequire = createRequire(new URL('../communication-service/package.json', import.meta.url));
const config = { CONVERSATION_AI_ENABLED: 'true', CONVERSATION_AI_MODEL: 'test-model', CONVERSATION_AI_MAX_TOKENS: 1536, COMMUNICATION_SERVICE_URL: 'http://communication.invalid', AI_TO_COMMUNICATION_KEY: 'test-only' };

function stub(file, exports) {
  const id = aiRequire.resolve(file), module = new Module(id);
  module.filename = id; module.loaded = true; module.exports = exports;
  aiRequire.cache[id] = module;
}

let modelContent = '', capturedMessages = [], invocations = 0, extraction;
const model = {
  async invoke(messages) {
    invocations++; capturedMessages = [...messages];
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
    const result = await conversationAnswer(question, async () => [], new AbortController().signal);
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

test('every ordinary question receives the latest 30 shared messages including prior AI answers once', async () => {
  const history = Array.from({ length: 30 }, (_, index) => ({
    content: `Message ${index}`, senderName: index % 2 ? 'AI Bot' : `Participant ${index}`,
    role: index % 2 ? 'assistant' : 'user', createdAt: '2026-11-11T00:00:00Z',
  }));
  let reads = 0, authorizations = 0;
  modelContent = 'A follow-up answer.'; invocations = 0;
  const result = await conversationAnswer('Explain that further.', async () => { reads++; return history; },
    new AbortController().signal, async () => { authorizations++; });
  assert.equal(result, modelContent);
  assert.equal(reads, 1);
  assert.equal(invocations, 1);
  assert.ok(authorizations >= 2);
  assert.equal(capturedMessages[1].content, 'Explain that further.');
  assert.deepEqual(JSON.parse(capturedMessages[3].content), history);
  assert.ok(capturedMessages[0].content.includes('Earlier AI answers are conversation context'));
});

test('history access failure prevents model generation', async () => {
  invocations = 0;
  await assert.rejects(conversationAnswer('Continue.', async () => { throw Error('Access revoked'); }, new AbortController().signal), /Access revoked/);
  assert.equal(invocations, 0);
});

for (const file of ['./src/prisma/prisma.service.ts', './src/modules/socket/chat/chat-socket.publisher.ts', './src/infrastructure/s3/s3.service.ts']) {
  const id = communicationRequire.resolve(file), entry = new Module(id);
  entry.filename = id; entry.loaded = true; entry.exports = {};
  communicationRequire.cache[id] = entry;
}
const { ConversationAiService } = communicationRequire('./src/modules/conversation-ai/conversation-ai.service.ts');
const { historyContent } = communicationRequire('./src/modules/conversation-ai/conversation-history-content.ts');

test('task cards expose only shared snapshot fields and distinguish deleted tasks', () => {
  const task = JSON.parse(historyContent({type:'TASK',content:JSON.stringify({taskId:'task',projectId:'project',title:'Release',status:'TODO',priority:'HIGH',dueDate:'2026-12-01',secret:'not shared'})}));
  assert.equal(task.title,'Release');assert.equal(task.status,'TODO');assert.ok(!('secret' in task));
  assert.match(historyContent({type:'TASK',content:'{"deleted":true}'}),/deleted/);
  assert.match(historyContent({type:'TASK',content:'Legacy task card'}),/Legacy task card/);
});

test('notes and polls enter bounded context without raw resource fields or voter identities', async () => {
  const service=Object.create(ConversationAiService.prototype);
  service.request=async()=>({chat_id:'channel',chat_type:'CHANNEL',status:'RUNNING'});
  service.authorized=async()=>({id:'question',threadParentId:'thread'});
  let query;
  service.prisma={$queryRaw:async sql=>{query=sql;return [
    {type:'NOTE',content:null,noteTitle:'Plan',noteContent:'Ship on Friday',role:'user',senderName:'Participant',createdAt:new Date()},
    {type:'POLL',content:null,poll:{title:'Choose date',multipleChoice:true,anonymous:true,isLocked:false,expiresAt:null,optionCount:2,options:[{text:'Friday',votes:3},{text:'Monday',votes:1}]},role:'user',senderName:'Participant',createdAt:new Date()},
  ];}};
  const history=await service.history('question','token');
  assert.match(history[0].content,/Friday: 3 votes/);
  assert.match(history[0].content,/not necessarily unique voters/);
  assert.match(history[1].content,/Plan\nShip on Friday/);
  assert.ok(history.every(item=>!('poll' in item)&&!('noteContent' in item)));
  assert.match(query.text,/WITH recent AS/);assert.match(query.text,/m.type='TASK'/);
  assert.match(query.text,/LEFT JOIN notes/);assert.match(query.text,/LEFT JOIN polls/);
  assert.doesNotMatch(query.text,/v\.user_id/);
});

test('shared context preserves chat/thread boundaries, chronological order and the 24k byte cap', async () => {
  for (const chatType of ['CHANNEL', 'DIRECT_MESSAGE']) for (const threadParentId of [null, 'thread-id']) {
    const service = Object.create(ConversationAiService.prototype);
    const request = { chat_id: 'chat-id', actor_id: 'actor-id', chat_type: chatType, status: 'RUNNING' };
    let checks = 0, query;
    service.request = async () => request;
    service.authorized = async () => { checks++; return { id: 'current-id', threadParentId }; };
    service.prisma = { $queryRaw: async sql => {
      query = sql;
      return Array.from({ length: 30 }, (_, index) => ({
        content: `${29 - index}:` + 'Tiếng Việt 😀'.repeat(200), role: index % 2 ? 'assistant' : 'user',
        senderName: index % 2 ? 'AI Bot' : 'Participant', createdAt: '2026-11-11T00:00:00Z',
      }));
    } };
    const history = await service.history('current-id', 'token');
    assert.equal(checks, 2);
    assert.equal(history.length, 30);
    assert.ok(history[0].content.startsWith('0:'));
    assert.ok(history.at(-1).content.startsWith('29:'));
    assert.ok(history.every(message => !message.content.includes('\uFFFD')));
    assert.ok(Buffer.byteLength(history.map(message => message.content).join('')) <= 24000);
    assert.match(query.text, /LIMIT 30/);
    assert.match(query.text, /m.type='TEXT' OR \(m.type='AI' AND m.sender_id=/);
    assert.match(query.text, /m.deleted_at IS NULL AND NOT m.recalled/);
    assert.match(query.text, /\(m.created_at,m.id\)</);
    assert.ok(query.values.includes('chat-id'));
    if (threadParentId) {
      assert.ok(query.values.includes(threadParentId));
      assert.match(query.text, /m.thread_parent_id=\$\d+::uuid/);
      assert.doesNotMatch(query.text, /OR m.id=/);
      assert.doesNotMatch(query.text, /thread_parent_id IS NULL/);
    }
    else assert.match(query.text, /thread_parent_id IS NULL/);
    assert.ok(query.text.includes(chatType === 'CHANNEL' ? 'channel_id' : 'conversation_id'));
  }
});
