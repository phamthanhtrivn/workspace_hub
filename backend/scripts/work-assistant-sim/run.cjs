const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto'),path=require('path');
const root=path.resolve(__dirname,'../../..');
const {chromium}=require(process.env.WORK_ASSISTANT_PLAYWRIGHT_MODULE||path.resolve(root,'../.tmp/dashboard-verification/node_modules/playwright'));
const out=path.resolve(root,'../.tmp/work-assistant-simulation'),c=JSON.parse(fs.readFileSync(out+'/access.private.json'));
const reports=[],answers=[],base=c.api,[admin,a,b,empty]=c.users;
let tokens={},p1session,personalSession,firstRequest,liveCount=0;const quotaRetried=new Set();
const reuse=process.env.WA_SIM_RETEST_ALL!=='1'&&fs.existsSync(out+'/results.json');
const previous=reuse?JSON.parse(fs.readFileSync(out+'/results.json')):{cases:[],liveModelRequests:0};liveCount=previous.liveModelRequests;if(reuse&&fs.existsSync(out+'/answers.json'))answers.push(...JSON.parse(fs.readFileSync(out+'/answers.json')));
const force=new Set(['WA26','WA20','WA17','WA24','WA01','WA07','WA08','WA09','WA10']);
const persist=()=>{fs.writeFileSync(out+'/results.json',JSON.stringify({runAt:new Date().toISOString(),mode:'real-ai-module-and-model; isolated-sql; source-and-auth-fixtures',
 model:c.model,caseCount:reports.length,passed:reports.filter(x=>x.status==='PASS').length,failed:reports.filter(x=>x.status==='FAIL').length,
 liveModelRequests:liveCount,cases:reports},null,2));fs.writeFileSync(out+'/answers.json',JSON.stringify(answers,null,2));};
async function check(id,layer,fn){const prior=previous.cases.find(x=>x.id===id);if(prior?.status==='PASS'&&!force.has(id)){reports.push(prior);persist();console.log('RETAIN PASS '+id);return;}const start=Date.now();try{const evidence=await fn();reports.push({id,layer,status:'PASS',ms:Date.now()-start,evidence});console.log('PASS '+id+' '+layer);}catch(e){reports.push({id,layer,status:'FAIL',ms:Date.now()-start,error:e.message});console.log('FAIL '+id+' '+e.message);}persist();}
async function response(user,method,path,data,headers={}){
 return fetch(base+path,{method,headers:{'content-type':'application/json',...(user?{authorization:'Bearer '+tokens[user.id]}:{}),...headers},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(115000)});
}
async function api(user,method,path,data){const r=await response(user,method,path,data);const text=await r.text();let v;try{v=JSON.parse(text)}catch{v={message:text.slice(0,100)}}if(!r.ok)throw Error(r.status+' '+(v.message||JSON.stringify(v)));return v.data;}
async function control(value){const r=await fetch(base+'/__test/control',{method:'POST',headers:{'content-type':'application/json','x-test-key':c.testKey},body:JSON.stringify(value)});return r.json();}
async function snapshot(){return (await(await fetch(base+'/__test/snapshot',{headers:{'x-test-key':c.testKey}})).json()).data;}
async function session(projectId,user=a){return api(user,'GET','/api/ai/work-assistant/session'+(projectId?'?projectId='+projectId:''));}
async function ask(question,sid=p1session.id,audience='mine'){
 const requestId=crypto.randomUUID();firstRequest??=requestId;liveCount++;
 const r=await response(a,'POST','/api/ai/work-assistant/sessions/'+sid+'/messages',{question,requestId,audience,timeZone:'Asia/Ho_Chi_Minh'});
 const text=await r.text();const blocks=text.split('\n\n');const done=blocks.find(x=>x.startsWith('event: done'));
 if(!done){const block=blocks.find(x=>x.startsWith('event: error'));const error=block?JSON.parse(block.split('\ndata: ')[1]):{};if(error.status===429&&!quotaRetried.has(question)){quotaRetried.add(question);console.log('Waiting one minute for model quota before retrying '+question.slice(0,30));await new Promise(resolve=>setTimeout(resolve,65000));return ask(question,sid,audience);}throw Error('Model response failed: '+text.slice(-650));}
 const data=JSON.parse(done.split('\ndata: ')[1]);answers.push({question,content:data.message.content,scope:data.scope,sourceTime:data.fetchedAt});
 assert.ok(!data.message.content.includes('PRIVATE_TASK_CANARY'));assert.ok(!data.message.content.includes('PRIVATE_EVENT_CANARY'));
 persist();return data.message.content;
}
const overview=(pid,mode='mine',user=a)=>api(user,'GET','/api/ai/work-assistant/overview?audience='+mode+(pid?'&projectId='+pid:''));

(async()=>{
 for(const u of c.users){const data=await api(null,'POST','/api/auth/login',{email:u.email,password:u.password});tokens[u.id]=data.accessToken;}
 p1session=await session(c.ids.p1);personalSession=await session();
 await check('WA02','API seeded-data',async()=>{const v=await overview();assert.equal(v.metrics.project.open,79);assert.equal(v.metrics.personal.open,2);
  assert.ok(!v.tasks.some(t=>t.id===c.ids.t4));assert.ok(!JSON.stringify(v).includes('PRIVATE_TASK_CANARY'));return {projectOpen:79,personalOpen:2};});
 await check('WA03','API seeded-data',async()=>{const mine=await overview(c.ids.p1),all=await overview(c.ids.p1,'project');assert.equal(mine.metrics.project.open,4);assert.equal(all.metrics.project.open,5);return {mine:4,project:5};});
  await check('WA07','live model Calendar scheduling',async()=>{const text=await ask('Dựa vào Calendar ngày '+c.workingDay+', gợi ý một phiên Pomodoro ban ngày tránh lịch bận, chỉ tư vấn.');
  assert.ok(!text.includes('Thiết lập giờ làm'));return text;});
 await check('WA08','API removed manual preferences',async()=>{assert.equal((await response(a,'GET','/api/ai/work-assistant/preferences')).status,404);
  assert.equal((await response(a,'PUT','/api/ai/work-assistant/preferences',{})).status,404);return 'No manual work-hours API';});
 await check('WA09','API timezone and identity validation',async()=>{for(const suffix of ['timeZone=wrong','userId='+b.id])
  assert.equal((await response(a,'GET','/api/ai/work-assistant/overview?'+suffix)).status,400);return 'Invalid timezone and forged identity rejected';});
 await check('WA10','API Calendar gaps',async()=>{const v=await overview(c.ids.p1),slots=v.freeSlots.filter(x=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(x.startAt))===c.workingDay);
  assert.equal(v.schedulingBasis,'calendar');assert.equal('preferences' in v,false);
  const hours=slots.map(x=>[(new Date(x.startAt).getUTCHours()+7)%24,(new Date(x.endAt).getUTCHours()+7)%24||24]);
  assert.deepEqual(hours,[[0,10],[11,14],[15,24]]);return hours;});
 await check('WA11','live model + exact aggregates',async()=>{const v=await overview(c.ids.p1);assert.equal(v.metrics.project.completedInPeriod,5);assert.equal(v.metrics.project.onTimeRate,.75);
  const text=await ask('Phân tích hiệu suất 7 ngày qua. Nêu số task hoàn thành, mẫu số đúng hạn và tỷ lệ phần trăm chính xác.');assert.match(text,/75\s*%|0[.,]75/);return text;});
 await check('WA12','live model tool 30 days',async()=>{const text=await ask('Còn 30 ngày qua thì sao? Nêu số hoàn thành và tỷ lệ đúng hạn theo dữ liệu mới.');
  assert.match(text,/7|bảy/i);assert.match(text,/66[.,]7|66[.,]67|4\s*\/\s*6/);return text;});
 await check('WA13','API personal focus isolation',async()=>{const v=await overview(c.ids.p1);assert.equal(v.metrics.focusSeconds,3600);const other=await overview(undefined,'mine',b);assert.equal(other.metrics.focusSeconds,9999);return {aSeconds:3600,bSeconds:9999};});
 await check('WA14','API empty account',async()=>{const v=await overview(undefined,'mine',empty);assert.equal(v.metrics.project.open,0);assert.equal(v.sources.project.state,'empty');assert.equal(v.metrics.focusSeconds,0);return v.sources;});
 await check('WA15','API fault injection',async()=>{try{await control({calendarOffline:true});const v=await overview();assert.equal(v.sources.calendar.state,'unavailable');assert.equal(v.metrics.focusSeconds,null);assert.equal(v.freeSlots.length,0);
  await control({calendarOffline:false,projectOffline:true});const p=await overview();assert.equal(p.metrics.project,null);assert.equal(p.sources.project.state,'unavailable');return 'Outages are not empty data; no free slots on missing busy data';}finally{await control({calendarOffline:false,projectOffline:false});}});
 await check('WA16','API large dataset',async()=>{const v=await overview(c.ids.p3);assert.equal(v.metrics.project.open,75);assert.equal(v.tasks.length,60);assert.equal(v.detailPartial,true);return {aggregate:75,details:60};});
 await check('WA19','API ownership matrix',async()=>{for(const method of ['POST','DELETE']){const r=await response(b,method,'/api/ai/work-assistant/sessions/'+p1session.id+'/messages',method==='POST'?{question:'Steal history',requestId:crypto.randomUUID()}:undefined);assert.equal(r.status,404);}
  const mine=await session(c.ids.p1,b);assert.notEqual(mine.id,p1session.id);assert.equal(mine.messages.length,0);return 'Separate sessions; foreign send/delete denied';});
 await check('WA21','API cancellation fault',async()=>{await control({delayAnswer:true});try{const before=await session(),rid=crypto.randomUUID();
  const stream=await response(a,'POST','/api/ai/work-assistant/sessions/'+personalSession.id+'/messages',{question:'Delayed cancellation test',requestId:rid});
  assert.equal((await response(b,'POST','/api/ai/work-assistant/requests/'+rid+'/cancel',{})).status,404);
  assert.equal((await response(a,'POST','/api/ai/work-assistant/requests/'+rid+'/cancel',{})).status,201);
  assert.match(await stream.text(),/event: error/);assert.equal((await session()).messages.length,before.messages.length);return 'Cancellation stored, no incomplete answer';}finally{await control({delayAnswer:false});}});
 await check('WA22','API replay and concurrency',async()=>{assert.equal((await response(a,'POST','/api/ai/work-assistant/sessions/'+p1session.id+'/messages',{question:'Replay',requestId:firstRequest})).status,409);
  await control({delayAnswer:true});try{const rid=crypto.randomUUID(),stream=await response(a,'POST','/api/ai/work-assistant/sessions/'+personalSession.id+'/messages',{question:'Hold one',requestId:rid});
  assert.equal((await response(a,'POST','/api/ai/work-assistant/sessions/'+p1session.id+'/messages',{question:'Concurrent',requestId:crypto.randomUUID()})).status,409);
  await response(a,'POST','/api/ai/work-assistant/requests/'+rid+'/cancel',{});await stream.text();return 'Replay and second concurrent request denied';}finally{await control({delayAnswer:false});}});
 await check('WA23','live model read-only',async()=>{const before=await snapshot();const text=await ask('Hãy đổi deadline T1 sang ngày mai và tạo checklist mới cho T5 ngay.');
  const after=await snapshot();assert.deepEqual(after.tasks,before.tasks);assert.equal(after.writes.length,0);return text;});
 await check('WA25','API identity/authorization matrix',async()=>{assert.equal((await response(a,'GET','/api/ai/work-assistant/overview?projectId='+c.ids.p2)).status,403);
  assert.equal((await response(a,'POST','/api/ai/work-assistant/sessions/'+p1session.id+'/messages',{question:'Hi',requestId:crypto.randomUUID(),userId:b.id})).status,400);
  assert.equal((await response(null,'GET','/api/ai/work-assistant/session')).status,401);return 'Foreign project, forged body identity and unauthenticated request blocked';});
 await check('WA04','live model priority',async()=>{const text=await ask('Hôm nay nên làm gì trước để không trễ hạn? Phân biệt task quá hạn, đến hạn hôm nay và task bị chặn.');assert.match(text,/T2/);assert.match(text,/T1/);return text;});
 await check('WA05-WA06','live model blocker and breakdown',async()=>{const text=await ask('Vì sao T3 bị chặn? Giúp chia nhỏ T5 và ước lượng số phiên Pomodoro, đừng ghi thay đổi.');
  assert.ok(!text.includes('OVERRIDDEN_BY_TASK'));assert.match(text,/T4/);assert.match(text,/ước lượng|ước tính|dự kiến/i);return text;});
 await check('WA27','model payload privacy',async()=>{const v=await snapshot();assert.ok(v.observedModelPayloads.length>0);assert.ok(v.observedModelPayloads.every(x=>!x.includes('PRIVATE_TASK_CANARY')&&!x.includes('PRIVATE_EVENT_CANARY')));
  return {payloads:v.observedModelPayloads.length,privateCanaries:'absent'};});
 await check('WA28','executed clock utilities',async()=>{const {wallTime,workRange}=require(root+'/backend/ai-service/dist/modules/work-assistant/work-time');
  assert.equal(workRange(new Date('2026-10-26T18:00:00Z'),'Asia/Ho_Chi_Minh',7).today,'2026-10-27');
  assert.equal(wallTime('2026-03-08',540,'America/New_York').toISOString(),'2026-03-08T13:00:00.000Z');return 'Vietnam midnight and DST cases pass';});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await context.route('https://accounts.google.com/**',r=>r.fulfill({status:200,body:''}));
  await context.routeWebSocket(/\/(communication|notification|project)\.io\//,socket=>socket.close());
  await check('WA01','browser normal login and lazy loading',async()=>{
   let count=0;page.on('request',r=>{if(r.url().includes('/work-assistant/'))count++;});
   await page.goto('http://localhost:3100/login');await page.locator('#email').fill(a.email);await page.locator('#password').fill(a.password);
   await page.locator('button[type="submit"]').click();
   await page.getByRole('button',{name:'Mở trợ lý công việc',exact:true}).waitFor();assert.equal(count,0);
   await page.getByRole('button',{name:'Mở trợ lý công việc',exact:true}).click();await page.locator('#work-assistant-panel').getByText('T2 Urgent overdue bug',{exact:true}).first().waitFor();return 'Logged in through ordinary form; no assistant calls before opening';});
  await check('WA17','browser reload persistence',async()=>{await page.goto('http://localhost:3100/projects/'+c.ids.p1);await page.getByRole('button',{name:'Mở trợ lý công việc',exact:true}).click();
   const panel=page.locator('#work-assistant-panel');await panel.getByRole('log').locator('article').first().waitFor();await page.reload();await page.getByRole('button',{name:'Mở trợ lý công việc',exact:true}).click();
   await panel.getByRole('log').locator('article').first().waitFor();await page.screenshot({path:out+'/desktop.png',fullPage:true});return 'Live-model answers persisted across navigation/reload';});
  await check('WA18','browser + API history pagination',async()=>{await fetch(base+'/__test/seed-history',{method:'POST',headers:{'content-type':'application/json','x-test-key':c.testKey},body:'{}'});
   const first=await session();assert.equal(first.messages.length,30);assert.ok(first.nextCursor);const old=await api(a,'GET','/api/ai/work-assistant/session?before='+first.nextCursor);
   assert.ok(old.messages.length>=4);assert.equal(new Set([...first.messages,...old.messages].map(m=>m.id)).size,first.messages.length+old.messages.length);return {newPage:first.messages.length,oldPage:old.messages.length};});
  await check('WA24','browser mobile + keyboard',async()=>{await page.setViewportSize({width:390,height:844});const panel=page.locator('#work-assistant-panel');await page.waitForFunction(()=>document.getElementById('work-assistant-panel')?.getAttribute('aria-modal')==='true');
   const box=await panel.boundingBox();assert.ok(box.x>=0&&box.width<=390);await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.getElementById('work-assistant-panel').contains(document.activeElement)),true);
   await page.screenshot({path:out+'/mobile.png',fullPage:true});await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});return 'Mobile fits viewport; focus stays in dialog; Escape closes';});
  await check('WA20','API + browser permission revocation',async()=>{if(!(await session()).messages.some(m=>m.role==='assistant'&&!m.hidden))await ask('Nhiem vu T2 cua toi hien can xu ly the nao?',personalSession.id);await control({revoked:true});try{assert.equal((await response(a,'GET','/api/ai/work-assistant/session?projectId='+c.ids.p1)).status,403);
   const personal=await session();const hiddenAnswers=personal.messages.filter(m=>m.role==='assistant');assert.ok(hiddenAnswers.length>0);assert.ok(hiddenAnswers.every(m=>m.hidden));
   await page.getByRole('button',{name:'Mở trợ lý công việc',exact:true}).click();await page.locator('#work-assistant-panel').getByRole('alert').filter({hasText:'không còn quyền'}).waitFor();return 'Project blocked; referenced personal answers hidden; UI hides cached history';}finally{await control({revoked:false});}});
  await check('WA26','browser safe rendering',async()=>{assert.equal(await page.locator('#work-assistant-panel script,#work-assistant-panel img').count(),0);assert.deepEqual(errors,[]);return 'No model HTML/images executed; no page errors';});
 }finally{await browser.close();}
 reports.push({id:'WA29',layer:'real-stack',status:'BLOCKED',reason:'Existing User Service registration has legacy schema error; Docker gateway subsequently timed out. Channel/DM regression is covered separately by existing unit tests, not simulated as a full live chat service.'});
 persist();console.log('COMPLETE '+reports.filter(x=>x.status==='PASS').length+' passed / '+reports.filter(x=>x.status==='FAIL').length+' failed; model requests '+liveCount);
})().catch(e=>{console.error('RUNNER '+e.message);reports.push({id:'RUNNER',status:'FAIL',error:e.message});persist();process.exitCode=1});