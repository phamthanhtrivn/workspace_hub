import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire, Module } from 'node:module';
import { createHash } from 'node:crypto';
const tooling=createRequire(new URL('../communication-service/package.json',import.meta.url));
tooling('ts-node').register({transpileOnly:true,skipProject:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',target:'ES2023',esModuleInterop:true,experimentalDecorators:true}});
const require=createRequire(new URL('../ai-service/api/package.json',import.meta.url));
const {VisionLimiter,mapVisionImages}=require('./src/common/vision-concurrency.ts');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done});return {promise,resolve};}

test('a global limit is shared across files and canceled queued work never starts',async()=>{
  const limiter=new VisionLimiter(3),gate=deferred(),signal=new AbortController().signal;let active=0,peak=0,started=0;
  const tasks=Array.from({length:9},()=>limiter.run(async()=>{started++;active++;peak=Math.max(peak,active);await gate.promise;active--;},signal));
  await tick();assert.equal(started,3);assert.equal(peak,3);
  const canceled=new AbortController();let sent=false;
  const queued=limiter.run(async()=>{sent=true},canceled.signal);const rejected=assert.rejects(queued,{name:'AbortError'});canceled.abort();await rejected;
  gate.resolve();await Promise.all(tasks);assert.equal(started,9);assert.equal(peak,3);assert.equal(sent,false);
  await limiter.run(async()=>{},signal);
});
test('a failed request frees its slot without retrying and pre-aborted work is rejected',async()=>{
  const limiter=new VisionLimiter(1),signal=new AbortController().signal;let calls=0;
  await assert.rejects(limiter.run(async()=>{calls++;throw new Error('upstream')},signal),/upstream/);
  await limiter.run(async()=>{calls++},signal);assert.equal(calls,2);
  const controller=new AbortController();controller.abort();await assert.rejects(async()=>limiter.run(async()=>assert.fail(),controller.signal),{name:'AbortError'});
});
test('out-of-order images preserve their input order',async()=>{
  const gates=[deferred(),deferred(),deferred()];
  const result=mapVisionImages([0,1,2],3,async index=>{await gates[index].promise;return index});
  gates[2].resolve();gates[0].resolve();await tick();gates[1].resolve();assert.deepEqual(await result,[0,1,2]);
});
test('failure stops scheduling new images but waits for in-flight checkpoints',async()=>{
  const gate=deferred(),calls=[];let saved=false;
  const result=mapVisionImages([0,1,2,3,4],3,async index=>{calls.push(index);if(index===0)throw new Error('failed');await gate.promise;saved=true;return index});
  const rejected=assert.rejects(result,/failed/);await tick();assert.deepEqual(calls,[0,1,2]);assert.equal(saved,false);gate.resolve();await rejected;assert.equal(saved,true);assert.deepEqual(calls,[0,1,2]);
});

function stub(file,exports){const id=require.resolve(file),entry=new Module(id);entry.filename=id;entry.loaded=true;entry.exports=exports;require.cache[id]=entry;}
const hash=value=>createHash('sha256').update(value).digest('hex');
stub('./src/config/env.config.ts',{config:{LLM_MODEL:'synthetic-model',VISION_CONCURRENCY:3}});
stub('./src/common/abort-polling.ts',{pollUntilAborted:()=>()=>{}});
let descriptions=new Map(),extraction,processor,checkAccess=async()=>{},updates=[],calls=[];
const source={id:'source',notebook_id:'notebook',revision:'revision',name:'test.pdf'};
function image(index,context='context '+index){const bytes=Buffer.from('synthetic '+index);return {id:hash('id'+index),hash:hash(bytes),page:index+1,context,dataUrl:'data:image/jpeg;base64,'+bytes.toString('base64')};}
stub('./src/infrastructure/database/database.ts',{
  rows:async(sql,args)=>{
    if(sql.startsWith('SELECT revision,status'))return [{revision:'revision',status:'INDEXING'}];
    if(sql.startsWith('SELECT payload'))return [{payload:{pages:extraction.pages,images:extraction.images.map(({dataUrl,...rest})=>rest)}}];
    if(sql.startsWith('SELECT image_id,data_url'))return extraction.images.map(item=>({image_id:item.id,data_url:item.dataUrl}));
    if(sql.startsWith('SELECT description'))return descriptions.has(args[2]+':'+args[3])?[{description:descriptions.get(args[2]+':'+args[3])}]:[];
    if(sql.startsWith('INSERT INTO notebook_ai.source_visuals')){descriptions.set(args[3]+':'+args[4],args[9]);return [];}
    if(sql.startsWith('UPDATE notebook_ai.sources SET progress')){assert.ok(sql.includes('GREATEST(progress,$2)'));updates.push(args[1]);return [];}
    assert.fail('Unexpected SQL');
  },transaction:async()=>assert.fail('Extraction cache must be reused'),
});
stub('./src/infrastructure/integrations/rag.client.ts',{rag:async()=>assert.fail('Extraction cache must be reused')});
stub('./src/infrastructure/integrations/document.client.ts',{authorizeSources:(...args)=>checkAccess(...args)});
stub('./src/infrastructure/integrations/vision.client.ts',{VISION_PROMPT_VERSION:'test',describeImage:async(dataUrl,context,signal)=>{calls.push(context);return processor(dataUrl,context,signal)}});
const {enrichVisualSource}=require('./src/jobs/visual-ingestion.ts');
function reset(images){descriptions=new Map();extraction={pages:[{text:'synthetic',page:1}],images};updates=[];calls=[];checkAccess=async()=>{};}

test('production enrichment runs three images together, preserves order and reuses saved descriptions',async()=>{
  reset([image(0),image(1),image(2)]);const gates=[deferred(),deferred(),deferred()];
  processor=async(_url,context)=>{const index=Number(context.at(-1));await gates[index].promise;return 'description '+index};
  const pending=enrichVisualSource(source,{},'unused');await tick();assert.equal(calls.length,3);
  gates[2].resolve();await tick();gates[1].resolve();await tick();gates[0].resolve();
  const result=await pending;assert.deepEqual(result.visuals.map(item=>item.imageId),extraction.images.map(item=>item.id));assert.deepEqual(updates,[53,66,80]);
  calls=[];await enrichVisualSource(source,{},'unused');assert.deepEqual(calls,[]);
});
test('retry preserves successful sibling images and only retries the missing image',async()=>{
  reset([image(0),image(1),image(2)]);processor=async(_url,context)=>{if(context==='context 1')throw new Error('503');return 'saved '+context};
  await assert.rejects(enrichVisualSource(source,{},'unused'),/503/);assert.equal(descriptions.size,2);
  calls=[];processor=async()=> 'recovered';await enrichVisualSource(source,{},'unused');assert.deepEqual(calls,['context 1']);
});
test('identical image and context share one in-flight model request',async()=>{
  const first=image(0),second={...first,id:hash('another-id'),page:2};reset([first,second]);processor=async()=>{await tick();return 'same description'};
  const result=await enrichVisualSource(source,{},'unused');assert.equal(calls.length,1);assert.equal(result.visuals.length,2);
});
test('corrupted cached image and denied source access cannot reach the model',async()=>{
  reset([{...image(0),hash:'a'.repeat(64)}]);processor=async()=>assert.fail();await assert.rejects(enrichVisualSource(source,{},'unused'));assert.equal(calls.length,0);
  reset([image(0)]);checkAccess=async()=>{throw new Error('access denied')};await assert.rejects(enrichVisualSource(source,{},'unused'),/access denied/);assert.equal(calls.length,0);
});
