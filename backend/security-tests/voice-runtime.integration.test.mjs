import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Opt-in checks in isolated child processes of the existing local containers.
// No service restarts, persistent test files, model downloads or user-table writes.
const enabled = process.env.WORKSPACEHUB_VOICE_RUNTIME === '1';
const require = createRequire(new URL('../communication-service/package.json', import.meta.url));
const ts = require('typescript');
const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const compile = path => ts.transpileModule(source(`../ai-service/api/src/${path}.ts`), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true, experimentalDecorators: true },
}).outputText;
const moduleLoader = `
const assert = require('node:assert/strict');
const {Module, createRequire} = require('node:module');
function latest(name, code, overrides={}) {
  const filename = '/app/dist/' + name + '.js';
  const module = new Module(filename);
  module.filename=filename; module.paths=Module._nodeModulePaths('/app/node_modules');
  const fallback=createRequire(filename);
  module.require=name => Object.hasOwn(overrides,name) ? overrides[name] : fallback(name);
  module._compile(code,filename);
  return module.exports;
}
`;

function run(container, executable, script) {
  execFileSync('docker', ['exec', '-i', container, executable, '-'], {
    input: script, timeout: 55000, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
  });
}
const aiContainer = process.env.VOICE_TEST_AI_CONTAINER || 'wh-notebook-notebook-api-1';
const speechContainer = process.env.VOICE_TEST_SPEECH_CONTAINER || 'wh-notebook-speech-worker-1';

test('runtime FFmpeg normalizes and splits real audio with the latest shared pipeline', { skip: !enabled, timeout: 60000 }, () => {
  run(aiContainer, 'node', moduleLoader + `
const {prepareAudioChunks, assertMediaUrl}=latest('modules/meeting-summary/media',${JSON.stringify(compile('modules/meeting-summary/media'))});
const {pcmWaveSeconds}=latest('modules/voice-transcript/wave-duration',${JSON.stringify(compile('modules/voice-transcript/wave-duration'))});
const {config}=require('/app/dist/config/env.config.js');
const http=require('node:http'), fs=require('node:fs/promises'), os=require('node:os'), path=require('node:path');
(async()=>{
  const pcmBytes=46*32000, wave=Buffer.alloc(44+pcmBytes);
  wave.write('RIFF');wave.writeUInt32LE(36+pcmBytes,4);wave.write('WAVEfmt ',8);
  wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);
  wave.writeUInt32LE(16000,24);wave.writeUInt32LE(32000,28);wave.writeUInt16LE(2,32);
  wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(pcmBytes,40);
  const server=http.createServer((_req,res)=>{res.writeHead(200,{'content-length':wave.length});res.end(wave);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'voice-runtime-'));
  try {
    const host='127.0.0.1:'+server.address().port;
    config.MEETING_MEDIA_HOSTS=host; config.NODE_ENV='test';
    assert.throws(()=>assertMediaUrl('https://untrusted.invalid/file'));
    const files=await prepareAudioChunks({url:'http://'+host+'/audio',sizeBytes:wave.length},directory,AbortSignal.timeout(30000),{maxBytes:10*1024*1024,maxSeconds:300});
    assert.equal(files.length,2);
    const durations=await Promise.all(files.map(async file=>pcmWaveSeconds(await fs.readFile(file))));
    assert.ok(durations.every(seconds=>seconds>0 && seconds<=46));
    assert.ok(Math.abs(durations.reduce((a,b)=>a+b,0)-46)<0.1);
  } finally {
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    assert.equal(path.dirname(directory),os.tmpdir());assert.ok(path.basename(directory).startsWith('voice-runtime-'));
    await fs.rm(directory,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
`);
});

test('runtime Postgres verifies migration, private cache and concurrent-start deduplication in a temporary table', { skip: !enabled, timeout: 60000 }, () => {
  run(aiContainer, 'node', moduleLoader + `
const {Client}=require('/app/node_modules/pg');
const {randomUUID}=require('node:crypto');
const constants=latest('modules/voice-transcript/voice.constants',${JSON.stringify(compile('modules/voice-transcript/voice.constants'))});
const migration=${JSON.stringify(source('../ai-service/api/migrations/006_voice_transcripts.sql'))};
(async()=>{
  const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();
  try {
    await client.query(migration.replace('CREATE TABLE IF NOT EXISTS notebook_ai.voice_transcripts','CREATE TEMP TABLE voice_transcripts').replaceAll('notebook_ai.voice_transcripts','pg_temp.voice_transcripts'));
    const queued=[];
    const {VoiceTranscriptService}=latest('modules/voice-transcript/voice-transcript.service',${JSON.stringify(compile('modules/voice-transcript/voice-transcript.service'))},{
      '../../infrastructure/database/database':{rows:async(sql,args)=>(await client.query(sql.replaceAll('notebook_ai.voice_transcripts','pg_temp.voice_transcripts'),args)).rows},
      '../../infrastructure/queue/notebook.queue':{meetingSummaryQueue:{client:Promise.resolve({get:async()=>constants.VOICE_TRANSCRIPT.heartbeatValue}),add:async(...args)=>queued.push(args)}},
      './voice.constants':constants,
      './voice-source':{voiceSource:async()=>({revision:'a'.repeat(64)})},
    });
    const service=new VoiceTranscriptService(), media=randomUUID(), first=randomUUID(), second=randomUUID();
    const results=await Promise.all([service.start(media,first,'CHANNEL'),service.start(media,first,'CHANNEL')]);
    assert.ok(results.every(result=>result.status==='QUEUED'));assert.equal(queued.length,1);
    await client.query("UPDATE pg_temp.voice_transcripts SET status='COMPLETED',text='private transcript' WHERE actor_id=$1",[first]);
    assert.equal((await service.status(media,first,'CHANNEL')).text,'private transcript');
    assert.equal((await service.status(media,second,'CHANNEL')).status,'NOT_CREATED');
    assert.equal((await service.status(media,first,'DIRECT_MESSAGE')).status,'NOT_CREATED');
    await service.start(media,first,'CHANNEL');assert.equal(queued.length,1);
    await service.start(media,second,'CHANNEL');assert.equal(queued.length,2);
    const runId=queued[1][1].runId;
    const claim="UPDATE pg_temp.voice_transcripts SET status='RUNNING' WHERE run_id=$1 AND status='QUEUED' RETURNING actor_id";
    assert.equal((await client.query(claim,[runId])).rows[0].actor_id,second);
    assert.equal((await client.query(claim,[runId])).rowCount,0);
  } finally {await client.end();}
})().catch(error=>{console.error(error);process.exitCode=1;});
`);
});

test('runtime local Whisper accepts the latest auto-language voice path without translation', { skip: !enabled, timeout: 60000 }, () => {
  run(speechContainer, 'python', source('../ai-service/speech-worker/app.py') + `
output=io.BytesIO()
with wave.open(output,'wb') as recording:
    recording.setnchannels(1)
    recording.setsampwidth(2)
    recording.setframerate(16000)
    recording.writeframes(b'\\x00\\x00'*16000)
audio=output.getvalue()
validate_audio(audio)
model=load_model()
assert recognize(model,audio,'auto') == ''
`);
});
