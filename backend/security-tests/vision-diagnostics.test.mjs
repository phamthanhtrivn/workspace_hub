import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createRequire, Module } from 'node:module';
const tooling = createRequire(new URL('../communication-service/package.json', import.meta.url));
tooling('ts-node').register({transpileOnly:true,skipProject:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',target:'ES2023',esModuleInterop:true}});
const require = createRequire(new URL('../ai-service/api/package.json',import.meta.url));
function stub(file,exports){const id=require.resolve(file),entry=new Module(id);entry.filename=id;entry.loaded=true;entry.exports=exports;require.cache[id]=entry;}
stub('./src/config/env.config.ts',{config:{LLM_MODEL:'test',LLM_API_KEY:'private-test-key',LLM_BASE_URL:'https://provider.invalid/v1',LLM_TIMEOUT_MS:5000,VISION_MAX_TOKENS:2048}});
stub('./src/infrastructure/integrations/llm.client.ts',{admitModel:async()=>{}});
const {providerErrorMetadata}=require('./src/infrastructure/integrations/provider-error.ts');
const {describeImage}=require('./src/infrastructure/integrations/vision.client.ts');
const {closeProviderConnections}=require('./src/infrastructure/integrations/provider-http.ts');
after(closeProviderConnections);

test('provider metadata preserves known cause without logging arbitrary messages or codes',async()=>{
  assert.deepEqual(await providerErrorMetadata(new Response(JSON.stringify({error:{code:'no_available_channel',message:'private-test-key secret document'}}))),{provider_code:'no_available_channel',category:'channel_unavailable'});
  assert.deepEqual(await providerErrorMetadata(new Response(JSON.stringify({error:{code:'private-test-key',message:'private document'}}))),{provider_code:'unknown',category:'unknown'});
  assert.deepEqual(await providerErrorMetadata(new Response('<html>private upstream failure</html>')),{provider_code:'unknown',category:'unknown'});
});
test('oversized error bodies are bounded and the reader is released',async()=>{
  let canceled=false;const response=new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(9000))},cancel(){canceled=true}}));
  assert.equal((await providerErrorMetadata(response)).provider_code,'unknown');assert.equal(canceled,true);assert.equal(response.body.locked,false);
});
test('Vision 503 is diagnosed by safe metadata and its English message survives the UI filter',async()=>{
  const fetch=globalThis.fetch,error=console.error,logs=[];
  globalThis.fetch=async()=>new Response(JSON.stringify({error:{code:'no_available_channel',message:'private-test-key secret image'}}),{status:503});
  console.error=line=>logs.push(JSON.parse(line));
  try{await assert.rejects(describeImage('data:image/jpeg;base64,QUJD','private context',new AbortController().signal),/image-reading provider returned HTTP 503/);
    assert.equal(logs[0].provider_code,'no_available_channel');assert.equal(logs[0].category,'channel_unavailable');
    assert.ok(!JSON.stringify(logs).includes('private'));assert.ok(!JSON.stringify(logs).includes('QUJD'));
  }finally{globalThis.fetch=fetch;console.error=error;}
});
test('successful Vision calls log completion metadata only',async()=>{
  const fetch=globalThis.fetch,info=console.info,logs=[];
  globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'private image description'}}]}));console.info=line=>logs.push(JSON.parse(line));
  try{assert.equal(await describeImage('data:image/jpeg;base64,QUJD','private context',new AbortController().signal),'private image description');
    assert.equal(logs[0].finish_reason,'stop');assert.equal(logs[0].output_limit,2048);assert.ok(!JSON.stringify(logs).includes('private'));
  }finally{globalThis.fetch=fetch;console.info=info;}
});
