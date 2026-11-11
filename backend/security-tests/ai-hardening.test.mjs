import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire, Module } from 'node:module';
const tooling = createRequire(new URL('../communication-service/package.json', import.meta.url));
tooling('ts-node').register({transpileOnly:true,skipProject:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',target:'ES2023',esModuleInterop:true}});
const require = createRequire(new URL('../ai-service/api/package.json', import.meta.url));
function stub(file, exports) { const id=require.resolve(file), entry=new Module(id);entry.filename=id;entry.loaded=true;entry.exports=exports;require.cache[id]=entry; }
const config={LLM_MODEL:'synthetic',LLM_BASE_URL:'https://example.invalid',LLM_MAX_TOKENS:10000,LLM_TIMEOUT_MS:90000,LLM_REQUESTS_PER_DAY:500,LLM_REQUESTS_PER_MINUTE:100,LLM_TOKENS_PER_MINUTE:70000,LLM_INTERACTIVE_RESERVE_PER_DAY:50};
stub('./src/config/env.config.ts',{config});
let usage={daily:0,rpm:0,tokens:0,retry_after_ms:1000}, inserted=0;
stub('./src/infrastructure/database/database.ts',{transaction:async run=>run({query:async sql=>{
  if(sql.includes('INSERT INTO'))inserted++;
  return {rows:[usage]};
}})});
const {admitModel}=require('./src/infrastructure/integrations/llm.client.ts');
const {ModelDailyQuotaException,ModelInputBudgetException,ModelMinuteQuotaException}=require('./src/common/errors/model-quota.exception.ts');
const {notebookFailureMessage}=require('./src/modules/chat/notebook-failure.ts');
const {pollUntilAborted}=require('./src/common/abort-polling.ts');
const {synthesizeDocument}=require('./src/jobs/summary-synthesis.ts');
const {checkHttpDependencies}=require('./src/common/health/http-dependencies.ts');

test('daily quota reserves interactive capacity without exceeding the configured total',async()=>{
  usage={daily:450,rpm:0,tokens:0};inserted=0;
  await assert.rejects(admitModel(100,'synthetic','vision'),ModelDailyQuotaException);
  await admitModel(100);
  assert.equal(inserted,1);
  usage.daily=500;
  await assert.rejects(admitModel(100),ModelDailyQuotaException);
  assert.equal(inserted,1);
});
test('oversized input and minute quota have distinct safe classifications',async()=>{
  await assert.rejects(admitModel(70001),ModelInputBudgetException);
  await assert.rejects(admitModel(-1),ModelInputBudgetException);
  usage={daily:1,rpm:100,tokens:100,retry_after_ms:1234};
  await assert.rejects(admitModel(100),error=>error instanceof ModelMinuteQuotaException&&error.retryAfterMs===1234);
  assert.match(notebookFailureMessage(new ModelDailyQuotaException(1234)),/07:00/);
  assert.doesNotMatch(notebookFailureMessage(new ModelDailyQuotaException(1234)),/Wait a minute/);
});
test('speech outage does not hide a healthy Notebook and mandatory failures still fail readiness',async()=>{
  const original=globalThis.fetch;
  Object.assign(config,{MEETING_SUMMARY_ENABLED:'true',VOICE_TRANSCRIPTION_ENABLED:'false',RAG_WORKER_URL:'https://rag.invalid',MEETING_STT_URL:'https://speech.invalid',DOCUMENT_SERVICE_URL:'https://document.invalid'});
  globalThis.fetch=async url=>{if(String(url).includes('speech.invalid'))throw Error('synthetic speech outage');return new Response('',{status:String(url).includes('document.invalid')?400:200});};
  try{
    assert.deepEqual(await checkHttpDependencies(),{notebook:true,speech:false});
    globalThis.fetch=async()=>new Response('',{status:503});
    await assert.rejects(checkHttpDependencies());
  }finally{globalThis.fetch=original;}
});
test('permission polling retains the dependency error instead of reporting user cancellation',async()=>{
  const controller=new AbortController(),reason=new Error('synthetic dependency failure');
  const stop=pollUntilAborted(controller,1,async()=>{throw reason});
  await new Promise(resolve=>controller.signal.addEventListener('abort',resolve,{once:true}));stop();
  assert.equal(controller.signal.reason,reason);
});
test('summary synthesis keeps source references and reuses the saved checkpoint',async()=>{
  const citation=label=>({label,sourceId:'source',id:label,text:'original evidence',position:0});
  const notes=[{sourceId:'source',content:'First note [[S1]]',citations:[citation('S1')]},{sourceId:'source',content:'Second note [[S2]]',citations:[citation('S2')]}];
  const saved=[],calls=[];let checkpoints=0;
  const generate=async(_q,evidence)=>{calls.push(evidence);return 'Unified summary [[S1]] [[S2]]';};
  const result=await synthesizeDocument('source',notes,saved,generate,async()=>{checkpoints++});
  assert.equal(result.sourceId,'source');assert.equal(result.citations.length,2);assert.equal(checkpoints,1);
  await synthesizeDocument('source',notes,saved,generate,async()=>{checkpoints++});
  assert.equal(calls.length,1);assert.equal(checkpoints,1);
});
