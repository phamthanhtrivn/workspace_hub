import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const backend=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const services=['ai-service','project-service','calendar-service'];
const read=service=>readFileSync(resolve(backend,service,'.env'),'utf8');
const existing=services.map(service=>/^WORK_ASSISTANT_SERVICE_KEY=(.*)$/m.exec(read(service))?.[1].trim().replace(/^["']|["']$/g,'')).filter(Boolean);
if(new Set(existing).size>1) throw new Error('Existing assistant keys differ; synchronize them before continuing.');
const key=existing[0]??randomBytes(32).toString('hex');
if(key.length<32) throw new Error('Assistant key must contain at least 32 characters.');
for(const service of services) {
  let env=read(service);
  const values={WORK_ASSISTANT_SERVICE_KEY:key,...(service==='ai-service'?{
    WORK_ASSISTANT_ENABLED:'true',
    WORK_ASSISTANT_PROJECT_URL:process.env.WORK_ASSISTANT_PROJECT_URL??'http://localhost:8082',
    WORK_ASSISTANT_CALENDAR_URL:process.env.WORK_ASSISTANT_CALENDAR_URL??'http://localhost:8086',
  }:{})};
  for(const [name,value] of Object.entries(values)) {
    if(new RegExp('^'+name+'=','m').test(env)) {
      if(name==='WORK_ASSISTANT_SERVICE_KEY')env=env.replace(new RegExp('^'+name+'=.*$','m'),name+'='+value);
    } else env+=(env.endsWith('\n')?'':'\n')+name+'='+value+'\n';
  }
  writeFileSync(resolve(backend,service,'.env'),env,'utf8');
}
console.log('Configured matching assistant keys in the three services; no secrets printed.');
