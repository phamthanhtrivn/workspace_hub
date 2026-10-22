import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceName = process.argv[2];
if (!sourceName || sourceName.length > 300) {
  console.error(
    "Usage: node backend/scripts/benchmark-ai.mjs <ready-source-name>",
  );
  process.exit(1);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
// Run beside the API with existing credentials; never export keys, identities or excerpts.
const code = `
  const {db}=require('./dist/infrastructure/database/database');
  const {closeQueues}=require('./dist/infrastructure/queue/notebook.queue');
  const {authorizeSources}=require('./dist/infrastructure/integrations/document.client');
  const {retrieve}=require('./dist/infrastructure/integrations/rag.client');
  (async()=>{
    try {
      const matches=await db.query(
        'SELECT s.*,n.owner_id FROM notebook_ai.sources s JOIN notebook_ai.notebooks n ON n.id=s.notebook_id WHERE s.name=$1 AND s.status=$2',
        [${JSON.stringify(sourceName)},'READY']);
      if(matches.rows.length!==1) throw Error('Expected one READY source');
      const source=matches.rows[0];
      const actor={id:source.owner_id,email:source.owner_email};
      const samples=[];
      for(let i=0;i<6;i++) {
        await authorizeSources(actor,[source]);
        const start=performance.now();
        const result=await retrieve(source.notebook_id,[source.id],'Tóm tắt nội dung tài liệu',AbortSignal.timeout(20000));
        if(result.evidence.some(e=>e.sourceId!==source.id)) throw Error('Source filter violation');
        samples.push({ms:Math.round(performance.now()-start),results:result.evidence.length});
      }
      const warm=samples.slice(1).map(s=>s.ms).sort((a,b)=>a-b);
      console.log(JSON.stringify({samples,warmMedianMs:warm[2],llmCalled:false}));
    } catch {
      console.error('Benchmark failed; check readiness, unique READY source and document permissions. Sensitive diagnostics suppressed.');
      process.exitCode=1;
    } finally {await closeQueues();await db.end();}
  })();
`;
const result = spawnSync(
  "docker",
  [
    "compose",
    "--env-file",
    resolve(root, "deploy/ai/.env"),
    "-f",
    resolve(root, "deploy/ai/compose.yml"),
    "exec",
    "-T",
    "notebook-jobs",
    "node",
    "-e",
    code,
  ],
  { cwd: root, encoding: "utf8", timeout: 180000, maxBuffer: 100000 },
);
if (result.status !== 0) {
  console.error(
    "AI benchmark could not complete. No provider or document data was printed.",
  );
  process.exitCode = 1;
} else {
  try {
    const report = JSON.parse(result.stdout);
    console.log(JSON.stringify(report));
  } catch {
    console.error("Unexpected benchmark output; suppressed for safety.");
    process.exitCode = 1;
  }
}
