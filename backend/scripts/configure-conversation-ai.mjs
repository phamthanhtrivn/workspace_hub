import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const backend=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ai=resolve(backend,'ai-service/.env'),comm=resolve(backend,'communication-service/.env');
const files=[ai,comm],local=resolve(backend,'communication-service/.env.local');
if(existsSync(local))files.push(local);
const docker=resolve(backend,'../deploy/ai/.env');
if(existsSync(docker))files.push(docker);
const get=(text,key)=>text.match(new RegExp(`^${key}=(.*)$`,'m'))?.[1]?.trim().replace(/^['"]|['"]$/g,'');
const current=files.map(file=>existsSync(file)?readFileSync(file,'utf8'):'');
const keys=[...new Set(current.map(t=>get(t,'AI_COMMUNICATION_SERVICE_KEY')).filter(Boolean))];
if(keys.length>1)throw Error('Communication AI keys differ; reconcile them first.');
const key=keys[0]||randomBytes(32).toString('base64url');
if(key.length<32)throw Error('Communication AI key must have at least 32 characters.');
for(let i=0;i<files.length;i++){
 let text=current[i];
 const values={CONVERSATION_AI_ENABLED:'true',AI_COMMUNICATION_SERVICE_KEY:key,...((files[i]===ai||files[i]===docker)?{COMMUNICATION_SERVICE_URL:files[i]===docker?'http://host.docker.internal:8083':'http://localhost:8083'}:{AI_SERVICE_URL:'http://localhost:8087'})};
 for(const [name,value] of Object.entries(values)){
  const re=new RegExp(`^${name}=.*$`,'m');
  text=re.test(text)?text.replace(re,`${name}=${value}`):`${text}\n${name}=${value}\n`;
 }
 writeFileSync(files[i],text);
}
console.log('Conversation AI configured; key hidden. Apply communication migration before restarting services.');
