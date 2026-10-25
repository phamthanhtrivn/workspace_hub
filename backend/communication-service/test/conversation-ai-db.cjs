
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PGlite}=require('../../ai-service/node_modules/@electric-sql/pglite');
const {Prisma}=require('@prisma/client');
const {readFileSync}=require('node:fs');
const {randomUUID}=require('node:crypto');
const Module=require('node:module'),path=require('node:path');
const resolve=Module._resolveFilename;
Module._resolveFilename=function(id,...args){return resolve.call(this,id.startsWith('src/')?path.resolve('dist',id.slice(4)):id,...args)};
const {ConversationAiService}=require('../dist/modules/conversation-ai/conversation-ai.service');
test('real PostgreSQL history SQL selects 30 preceding messages and completion inserts once',async()=>{
 const db=new PGlite();
 try{
 await db.exec(readFileSync('prisma/migrations/20261023000100_conversation_ai/migration.sql','utf8'));
 await db.exec(readFileSync('prisma/migrations/20261023000200_conversation_ai_outbox/migration.sql','utf8'));
 await db.exec(readFileSync('prisma/migrations/20261024000100_conversation_ai_reliability/migration.sql','utf8'));
 await db.exec(readFileSync('prisma/migrations/20261024000200_conversation_ai_attachments/migration.sql','utf8'));
 await db.exec(`CREATE TABLE messages(id uuid primary key,channel_id uuid,sender_id uuid,content text,type text,thread_parent_id uuid,created_at timestamptz default now(),deleted_at timestamptz,recalled boolean default false);
 CREATE TABLE user_profile_snapshots(user_id uuid,full_name text);`);
 const actor=randomUUID(),chat=randomUUID(),id=randomUUID(),start=new Date('2026-10-23T00:00:00Z');
 const trigger={id,channelId:chat,senderId:actor,content:'@ai summarize conversation',type:'TEXT',createdAt:start,threadParentId:null,deletedAt:null,recalled:false};
 await db.query('INSERT INTO messages(id,channel_id,sender_id,content,type,created_at) VALUES($1,$2,$3,$4,$5,$6)',[id,chat,actor,trigger.content,'TEXT',start]);
 await db.query(`INSERT INTO conversation_ai_requests(id,actor_id,chat_id,chat_type) VALUES($1,$2,$3,'CHANNEL')`,[id,actor,chat]);
 for(let i=1;i<=35;i++) await db.query(`INSERT INTO messages(id,channel_id,sender_id,content,type,created_at) VALUES($1,$2,$3,$4,'TEXT',$5)`,[randomUUID(),chat,actor,`msg-${i}`,new Date(start.getTime()-i*1000)]);
 await db.query(`INSERT INTO messages(id,channel_id,sender_id,content,type,created_at) VALUES($1,$2,$3,'future','TEXT',$4)`,[randomUUID(),chat,actor,new Date(start.getTime()+1000)]);
 let failOutboxInsert=false;
 const query=(strings,...values)=>{const q=!Array.isArray(strings)?strings:Prisma.sql(strings,...values);if(failOutboxInsert && q.text.includes('INSERT INTO conversation_ai_outbox'))throw Error('outbox insert failed');return db.query(q.text,q.values)};
 const prisma={
  $queryRaw:async(...a)=>(await query(...a)).rows,
  $executeRaw:async(...a)=>(await query(...a)).affectedRows,
  channelMember:{findUnique:async()=>({channel:{spaceId:'space'}})},spaceMember:{findUnique:async()=>({})},
  message:{findUnique:async({where})=>where.id===id?trigger:(await db.query('SELECT id,content FROM messages WHERE id=$1',[where.id])).rows[0],
   create:async({data})=>db.query('INSERT INTO messages(id,channel_id,sender_id,content,type) VALUES($1,$2,$3,$4,$5)',[data.id,data.channelId,data.senderId,data.content,data.type])},
  channel:{update:async()=>({})},
 };
 prisma.$transaction=async fn=>{await db.exec('BEGIN');try{const result=await fn(prisma);await db.exec('COMMIT');return result}catch(error){await db.exec('ROLLBACK');throw error}};
 let publications=0,failDelivery=true;
 const publisher={assertReady:()=>{},publishChannelMessageCreated:async()=>{if(failDelivery)throw Error('socket offline');publications++}};
 const service=new ConversationAiService(prisma,publisher);
 const claim=await service.claim(id);assert.ok(claim.token);
 assert.equal(await service.claim(id),null);
 const history=await service.history(id,claim.token);
 assert.equal(history.length,30);assert.equal(history[0].content,'msg-30');assert.equal(history.at(-1).content,'msg-1');
 await db.query("INSERT INTO messages(id,channel_id,sender_id,content,type,created_at) VALUES($1,$2,$3,NULL,'TEXT',$4)",[randomUUID(),chat,actor,new Date(start.getTime()-1)]);
 assert.equal((await service.history(id,claim.token)).length,30);
 // PostgreSQL timestamps can carry microseconds that a JS Date rounds away.
 await db.query("UPDATE messages SET created_at='2026-10-23T00:00:00.0009Z' WHERE id=$1",[id]);
 await db.query("INSERT INTO messages(id,channel_id,sender_id,content,type,created_at) VALUES($1,$2,$3,'microsecond predecessor','TEXT','2026-10-23T00:00:00.0008Z')",[randomUUID(),chat,actor]);
 assert.equal((await service.history(id,claim.token)).at(-1).content,'microsecond predecessor');


 failOutboxInsert=true;
 await assert.rejects(service.complete(id,claim.token,'summary',false),/outbox insert failed/);
 assert.equal((await db.query('SELECT status FROM conversation_ai_requests')).rows[0].status,'RUNNING');
 assert.equal((await db.query("SELECT count(*)::int AS count FROM messages WHERE type='AI'")).rows[0].count,0);
 failOutboxInsert=false;
 await service.complete(id,claim.token,'summary',false);
 await service.complete(id,claim.token,'summary',false);
 assert.equal((await db.query("SELECT count(*)::int AS count FROM messages WHERE type='AI'")).rows[0].count,1);
 assert.equal(publications,0);
 assert.equal((await db.query('SELECT status FROM conversation_ai_outbox')).rows[0].status,'PENDING');
 assert.equal((await db.query('SELECT status FROM conversation_ai_requests')).rows[0].status,'COMPLETED');
 failDelivery=false;
 await db.exec('UPDATE conversation_ai_outbox SET next_attempt_at=now()');
 const restarted=new ConversationAiService(prisma,publisher);
 await Promise.all([restarted.flushOutbox(),service.flushOutbox()]);
 assert.equal(publications,1);
 assert.equal((await db.query('SELECT status FROM conversation_ai_outbox')).rows[0].status,'PUBLISHED');
 await service.complete(id,claim.token,'summary',false);
 assert.equal(publications,1);
 // A lease left by a crashed publisher is recoverable, but an active lease is not stolen.
 await db.exec("UPDATE conversation_ai_outbox SET status='PENDING',lease_until=now()+interval '1 minute'");
 await restarted.flushOutbox();assert.equal(publications,1);
 await db.exec("UPDATE conversation_ai_outbox SET lease_until=now()-interval '1 second'");
 await restarted.flushOutbox();assert.equal(publications,2);
 // Revoked membership cancels pending delivery without exposing the saved answer.
 await db.exec("UPDATE conversation_ai_outbox SET status='PENDING',lease_until=NULL");
 prisma.channelMember.findUnique=async()=>null;
 await restarted.flushOutbox();assert.equal(publications,2);
 assert.equal((await db.query('SELECT status FROM conversation_ai_outbox')).rows[0].status,'CANCELLED');
 const envBefore=process.env.CONVERSATION_AI_ENABLED,fetchBefore=global.fetch;
 process.env.CONVERSATION_AI_ENABLED='true';
 const sent=[];
 global.fetch=async url=>{sent.push(url);return new Response(null,{status:202})};
 try{
  for(let i=0;i<25;i++)await db.query("INSERT INTO conversation_ai_requests(id,actor_id,chat_id,chat_type) VALUES($1,$2,$3,'CHANNEL')",[randomUUID(),actor,chat]);
  await service.dispatch();await service.dispatch();
  assert.equal(sent.length,25);assert.equal(new Set(sent).size,25);
 }finally{
  global.fetch=fetchBefore;
  if(envBefore===undefined)delete process.env.CONVERSATION_AI_ENABLED;else process.env.CONVERSATION_AI_ENABLED=envBefore;
 }

 }finally{await db.close()}
});

test('direct thread history stays within its root, validates snapshots and rejects cross-conversation roots',async()=>{
 const db=new PGlite();
 const envBefore=process.env.CONVERSATION_AI_ENABLED;
 process.env.CONVERSATION_AI_ENABLED='true';
 try {
  for(const migration of ['20261023000100_conversation_ai','20261023000200_conversation_ai_outbox','20261024000100_conversation_ai_reliability','20261024000200_conversation_ai_attachments'])await db.exec(readFileSync(`prisma/migrations/${migration}/migration.sql`,'utf8'));
  await db.exec("CREATE TABLE direct_messages(id uuid primary key,conversation_id uuid,sender_id uuid,content text,type text,thread_parent_id uuid,created_at timestamptz default now(),deleted_at timestamptz,recalled boolean default false); CREATE TABLE user_profile_snapshots(user_id uuid,full_name text);");
  const actor=randomUUID(),chat=randomUUID(),root=randomUUID(),id=randomUUID(),otherRoot=randomUUID();
  const now=new Date('2026-10-24T00:00:00Z');
  const query=(strings,...values)=>{const q=!Array.isArray(strings)?strings:Prisma.sql(strings,...values);return db.query(q.text,q.values)};
  const prisma={
   $queryRaw:async(...a)=>(await query(...a)).rows,$executeRaw:async(...a)=>(await query(...a)).affectedRows,
   directConversationParticipant:{findUnique:async()=>({userId:actor})},
   directMessage:{findUnique:async({where})=>(await db.query('SELECT id,conversation_id AS "conversationId",sender_id AS "senderId",content,type,thread_parent_id AS "threadParentId",created_at AS "createdAt",deleted_at AS "deletedAt",recalled FROM direct_messages WHERE id=$1',[where.id])).rows[0]},
  };
  const insert=(messageId,scope,text,parent,age)=>db.query("INSERT INTO direct_messages(id,conversation_id,sender_id,content,type,thread_parent_id,created_at) VALUES($1,$2,$3,$4,'TEXT',$5,$6)",[messageId,scope,actor,text,parent,new Date(now.getTime()-age)]);
  await insert(root,chat,'thread root',null,10000);
  await insert(randomUUID(),chat,'thread reply',root,5000);
  await insert(randomUUID(),chat,'main conversation excluded',null,3000);
  await insert(otherRoot,randomUUID(),'different conversation',null,2000);
  await insert(id,chat,'@ai tóm tắt hội thoại',root,0);
  const service=new ConversationAiService(prisma,{});
  const trigger=await prisma.directMessage.findUnique({where:{id}});
  await db.exec('BEGIN');await service.register(trigger,actor,chat,'DIRECT_MESSAGE',prisma);await db.exec('COMMIT');
  const claim=await service.claim(id);
  assert.deepEqual((await service.history(id,claim.token)).map(m=>m.content),['thread root','thread reply']);
  await db.query("UPDATE direct_messages SET content='@ai changed prompt' WHERE id=$1",[id]);
  await assert.rejects(service.validate(id,claim.token));
  await db.query('UPDATE direct_messages SET content=$2,thread_parent_id=$3 WHERE id=$1',[id,trigger.content,otherRoot]);
  await assert.rejects(service.history(id,claim.token));
 }finally{
  await db.close();
  if(envBefore===undefined)delete process.env.CONVERSATION_AI_ENABLED;else process.env.CONVERSATION_AI_ENABLED=envBefore;
 }
});
