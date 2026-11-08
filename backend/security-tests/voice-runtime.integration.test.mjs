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
const compileCommunication = path => ts.transpileModule(source(`../communication-service/src/${path}.ts`), {
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
    await assert.rejects(fs.access(directory),'temporary audio directory must be removed');
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
`);
});

test('runtime Postgres preserves saved text across readers, sessions and concurrent starts', { skip: !enabled, timeout: 60000 }, () => {
  run(aiContainer, 'node', moduleLoader + `
const {Client}=require('/app/node_modules/pg');
const {randomUUID}=require('node:crypto');
const constants=latest('modules/voice-transcript/voice.constants',${JSON.stringify(compile('modules/voice-transcript/voice.constants'))});
const migration=${JSON.stringify(source('../ai-service/api/migrations/006_voice_transcripts.sql'))};
const sharedMigration=${JSON.stringify(source('../ai-service/api/migrations/007_shared_voice_transcripts.sql'))};
(async()=>{
  const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();
  try {
    await client.query(migration.replace('CREATE TABLE IF NOT EXISTS notebook_ai.voice_transcripts','CREATE TEMP TABLE voice_transcripts').replaceAll('notebook_ai.voice_transcripts','pg_temp.voice_transcripts'));
    const legacyMedia=randomUUID(), legacyOwner=randomUUID();
    await client.query("INSERT INTO pg_temp.voice_transcripts(media_id,actor_id,chat_type,revision,run_id,status,text) VALUES($1,$2,'CHANNEL','old',$3,'COMPLETED','saved legacy text'),($1,$4,'CHANNEL','old',$5,'RUNNING',NULL)",
      [legacyMedia,legacyOwner,randomUUID(),randomUUID(),randomUUID()]);
    const migrate=()=>client.query(sharedMigration.replaceAll('notebook_ai.voice_transcripts','pg_temp.voice_transcripts'));
    await migrate();await migrate();
    const legacy=await client.query('SELECT text FROM pg_temp.voice_transcripts WHERE media_id=$1',[legacyMedia]);
    assert.deepEqual(legacy.rows,[{text:'saved legacy text'}]);
    const queued=[];
    let revision='a'.repeat(64), denied=false;
    const {VoiceTranscriptService}=latest('modules/voice-transcript/voice-transcript.service',${JSON.stringify(compile('modules/voice-transcript/voice-transcript.service'))},{
      '../../infrastructure/database/database':{rows:async(sql,args)=>(await client.query(sql.replaceAll('notebook_ai.voice_transcripts','pg_temp.voice_transcripts'),args)).rows},
      '../../infrastructure/queue/notebook.queue':{meetingSummaryQueue:{client:Promise.resolve({get:async()=>constants.VOICE_TRANSCRIPT.heartbeatValue}),add:async(...args)=>queued.push(args)}},
      './voice.constants':constants,
      './voice-source':{voiceSource:async()=>{if(denied)throw Error('Access revoked');return {revision};}},
    });
    const service=new VoiceTranscriptService(), media=randomUUID(), first=randomUUID(), second=randomUUID();
    const results=await Promise.all([service.start(media,first,'CHANNEL'),service.start(media,second,'CHANNEL')]);
    assert.ok(results.every(result=>result.status==='QUEUED'));assert.equal(queued.length,1);
    assert.equal(queued[0][2].attempts,3);
    await client.query("UPDATE pg_temp.voice_transcripts SET status='COMPLETED',text='saved transcript' WHERE media_id=$1",[media]);
    assert.equal((await service.status(media,first,'CHANNEL')).text,'saved transcript');
    assert.equal((await service.status(media,second,'CHANNEL')).text,'saved transcript');
    assert.equal((await service.status(media,first,'DIRECT_MESSAGE')).status,'NOT_CREATED');
    await service.start(media,first,'CHANNEL');assert.equal(queued.length,1);
    // A new service instance models an empty session/cache after logging in again.
    const nextSession=new VoiceTranscriptService();
    assert.equal((await nextSession.start(media,second,'CHANNEL')).text,'saved transcript');
    assert.equal(queued.length,1);
    denied=true;await assert.rejects(nextSession.status(media,second,'CHANNEL'),/Access revoked/);denied=false;
    revision='b'.repeat(64);
    assert.equal((await service.status(media,second,'CHANNEL')).status,'NOT_CREATED');
    await service.start(media,second,'CHANNEL');assert.equal(queued.length,2);
    const runId=queued[1][1].runId;
    const claim="UPDATE pg_temp.voice_transcripts SET status='RUNNING' WHERE run_id=$1 AND status='QUEUED' RETURNING actor_id";
    assert.equal((await client.query(claim,[runId])).rows[0].actor_id,second);
    assert.equal((await client.query(claim,[runId])).rowCount,0);
  } finally {await client.end();}
})().catch(error=>{console.error(error);process.exitCode=1;});
`);
});

test('runtime background dispatch rolls back with the message, survives restart and fences expired leases', { skip: !enabled, timeout: 60000 }, () => {
  run(aiContainer, 'node', moduleLoader + `
const {Client}=require('/app/node_modules/pg');
const {randomUUID}=require('node:crypto');
const {ServiceUnavailableException}=require('@nestjs/common');
const constants=latest('communication/voice.constants',${JSON.stringify(compileCommunication('modules/media/types/voice-transcript.constants'))});
const audio=latest('communication/voice-audio',${JSON.stringify(compileCommunication('modules/media/voice-transcript-audio'))});
const {VoiceTranscriptDispatchService}=latest('communication/voice-transcript-dispatch',${JSON.stringify(compileCommunication('modules/media/voice-transcript-dispatch.service'))},{
  './types/voice-transcript.constants':constants,'./voice-transcript-audio':audio,
  './voice-transcript.config':{isVoiceTranscriptionEnabled:()=>true},
  '../../prisma/prisma.service':{},'./voice-transcript.service':{},
});
const migration=${JSON.stringify(source('../communication-service/prisma/migrations/20261108000100_voice_transcript_requests/migration.sql'))};
(async()=>{
  const client=new Client({connectionString:process.env.DATABASE_URL});await client.connect();
  try {
    await client.query(migration.replace('CREATE TABLE voice_transcript_requests','CREATE TEMP TABLE voice_transcript_requests'));
    const query=async(parts,...values)=>{
      const sql=parts.reduce((result,part,index)=>result+part+(index<values.length?'$'+(index+1):''),'');
      return (await client.query(sql,values)).rows;
    };
    const prisma={$executeRaw:query,$queryRaw:query};
    const media={id:randomUUID(),name:'song.mp3',mimeType:'audio/mpeg',sizeBytes:500},actor=randomUUID();
    const service=new VoiceTranscriptDispatchService(prisma,{});
    await client.query('BEGIN');await service.register([media],actor,'CHANNEL',prisma);await client.query('ROLLBACK');
    assert.equal((await client.query('SELECT * FROM voice_transcript_requests')).rowCount,0);
    await service.register([media],actor,'CHANNEL',prisma);
    await service.register([media],actor,'CHANNEL',prisma);
    assert.equal((await client.query('SELECT * FROM voice_transcript_requests')).rowCount,1);
    let release,started;
    const waiting=new Promise(resolve=>{release=resolve;}),begun=new Promise(resolve=>{started=resolve;});
    const original=new VoiceTranscriptDispatchService(prisma,{proxy:async()=>{started();await waiting;}});
    const originalTask=original.dispatch();await begun;
    let deliveries=0;
    const restarted=new VoiceTranscriptDispatchService(prisma,{proxy:async()=>{deliveries++;}});
    await restarted.dispatch();assert.equal(deliveries,0,'an active lease cannot be claimed twice');
    await client.query("UPDATE voice_transcript_requests SET lease_until=now()-interval '1 second'");
    await restarted.dispatch();assert.equal(deliveries,1,'an expired lease is recovered after restart');
    release();await originalTask;
    let row=(await client.query('SELECT * FROM voice_transcript_requests')).rows[0];
    assert.equal(row.status,'DISPATCHED');assert.equal(row.attempts,2);assert.equal(row.lease_token,null);
    await client.query("UPDATE voice_transcript_requests SET status='PENDING',attempts=0,next_attempt_at=now()");
    let attempts=0;
    const unavailable=new VoiceTranscriptDispatchService(prisma,{proxy:async()=>{attempts++;throw new ServiceUnavailableException();}});
    for(let index=0;index<3;index++){
      await unavailable.dispatch();
      row=(await client.query('SELECT * FROM voice_transcript_requests')).rows[0];
      assert.equal(row.status,index===2?'FAILED':'PENDING');
      await client.query('UPDATE voice_transcript_requests SET next_attempt_at=now()');
    }
    await unavailable.dispatch();assert.equal(attempts,3);
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
