import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const source=readFileSync(new URL('../features/work-assistant/api/work-assistant.api.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
const fakeApi={};
vm.runInNewContext(compiled,{exports,TextDecoder,require:name=>name==='@/lib/axios'?{api:fakeApi}:require(name)});
const stream=(text,size)=>{const bytes=new TextEncoder().encode(text);return new ReadableStream({
 start(controller){for(let i=0;i<bytes.length;i+=size)controller.enqueue(bytes.slice(i,i+size));controller.close();}
});};
test('SSE handles split UTF-8, split CRLF, heartbeats and multiple events',async()=>{
 const events=[];
 await exports.consumeEvents(stream(': heartbeat\r\n\r\nevent: status\r\ndata: {"message":"Đang phân tích"}\r\n\r\nevent: done\r\ndata: {"content":"Công việc hôm nay"}\r\n\r\n',1),event=>events.push(event));
 assert.equal(events.length,2);
 assert.equal(events[0].data.message,'Đang phân tích');
 assert.equal(events[1].data.content,'Công việc hôm nay');
});
test('SSE refuses a silently truncated connection',async()=>{
 await assert.rejects(exports.consumeEvents(stream('event: status\ndata: {"message":"Loading"}\n\n',7),()=>{}),/gián đoạn/);
});
test('SSE error events reach the caller without being presented as a successful answer',async()=>{
 await assert.rejects(exports.consumeEvents(stream('event: error\ndata: {"message":"Permission changed"}\n\n',5),event=>{
  if(event.event==='error')throw Error(event.data.message);
 }),/Permission changed/);
});

test('history accepts null metadata on user messages',async()=>{
 const id='50000000-0000-4000-8000-000000000001';
 fakeApi.get=async()=>({data:{data:{id,projectId:null,nextCursor:null,messages:[
  {id,role:'user',content:'Question',sources:[],context:null,created_at:new Date().toISOString()}
 ]}}});
 const history=await exports.getSession();
 assert.equal(history.messages[0].context,undefined);
});
