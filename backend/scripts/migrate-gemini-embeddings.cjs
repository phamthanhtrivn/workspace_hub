const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const api = path.join(root, 'backend/ai-service/api');
const dotenv = require(path.join(api, 'node_modules/dotenv'));
dotenv.config({ path: path.join(api, '.env'), quiet: true });
const embedding = dotenv.parse(fs.readFileSync(path.join(root, 'deploy/ai/.env')));
const targetModel = process.argv.find(arg => arg.startsWith('--model='))?.slice('--model='.length) || 'gemini-embedding-001';

function run(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', '-i', 'wh-notebook-rag-worker-1', 'python', '-m', 'app.migrate_embeddings'],
      { cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error('Gemini migration failed')));
    child.stdin.end(JSON.stringify({ ...payload, target_model: targetModel, api_key: embedding.EMBEDDING_API_KEY }));
  });
}

async function main() {
  if (!embedding.EMBEDDING_API_KEY) throw new Error('Configure EMBEDDING_API_KEY first');
  if (!['gemini-embedding-001','gemini-embedding-2','intfloat/multilingual-e5-small'].includes(targetModel)) throw new Error('Unsupported target model');
  if (!process.argv.includes('--apply')) return run({ probe: true });
  const { db } = require(path.join(api, 'dist/infrastructure/database/database'));
  const { authorizeSources } = require(path.join(api, 'dist/infrastructure/integrations/document.client'));
  try {
    const { rows: sources } = await db.query(
      "SELECT s.*,n.owner_id FROM notebook_ai.sources s JOIN notebook_ai.notebooks n ON n.id=s.notebook_id WHERE s.status='READY' ORDER BY s.id");
    for (const source of sources) {
      await authorizeSources({ id: source.owner_id, email: source.owner_email }, [source], false, AbortSignal.timeout(15000));
    }
    const response = await fetch(process.env.RAG_WORKER_URL + '/ready', {
      headers: { 'x-internal-service-key': process.env.RAG_SERVICE_KEY }, signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error('Live RAG worker is not ready');
    const { collection } = await response.json();
    const snapshot = sources.map(({ id, notebook_id, revision, chunk_count }) => ({ id, notebook_id, revision, chunk_count }));
    console.log(JSON.stringify({ event: 'gemini_embedding_migration_start', sources: snapshot.length,
      chunks: snapshot.reduce((n, source) => n + source.chunk_count, 0) }));
    await run({ old_collection: collection, sources: snapshot });
    const { rows: latest } = await db.query("SELECT id,notebook_id,revision,chunk_count FROM notebook_ai.sources WHERE status='READY' ORDER BY id");
    if (JSON.stringify(latest) !== JSON.stringify(snapshot)) throw new Error('Sources changed during migration; do not switch the live provider');
    const manifest = targetModel === 'gemini-embedding-001' ? 'gemini-embedding-migration.json'
      : targetModel === 'gemini-embedding-2' ? 'gemini-embedding-2-migration.json' : 'local-embedding-migration.json';
    fs.writeFileSync(path.join(root, '.tmp', manifest), JSON.stringify({ target_model: targetModel, old_collection: collection, sources: snapshot }, null, 2));
    console.log('Source snapshots verified; the local collection and live provider are unchanged.');
  } finally {
    await db.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
