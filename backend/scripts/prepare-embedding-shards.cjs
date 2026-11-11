const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const api = path.join(root, 'backend/ai-service/api');
require(path.join(api, 'node_modules/dotenv')).config({ path: path.join(api, '.env'), quiet: true });

async function main() {
  const { db } = require(path.join(api, 'dist/infrastructure/database/database'));
  try {
    const { rows: sources } = await db.query(
      "SELECT id,notebook_id,revision,chunk_count FROM notebook_ai.sources WHERE status='READY' ORDER BY id");
    const response = await fetch(process.env.RAG_WORKER_URL + '/ready', {
      headers: { 'x-internal-service-key': process.env.RAG_SERVICE_KEY }, signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error('RAG worker is not ready');
    const { embeddingCollections: collections } = await response.json();
    if (!collections || Object.keys(collections).length !== 3) throw new Error('Expected three model collections');
    await new Promise((resolve, reject) => {
      const child = spawn('docker', ['exec', '-i', 'wh-notebook-rag-worker-1', 'python', '-m', 'app.prepare_shards'],
        { cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
      child.once('error', reject);
      child.once('exit', code => code === 0 ? resolve() : reject(new Error('Shard preparation failed')));
      child.stdin.end(JSON.stringify({ collections, sources }));
    });
    const { rows: latest } = await db.query(
      "SELECT id,notebook_id,revision,chunk_count FROM notebook_ai.sources WHERE status='READY' ORDER BY id");
    if (JSON.stringify(sources) !== JSON.stringify(latest)) throw new Error('Sources changed; repeat preparation before switching');
    fs.writeFileSync(path.join(root, '.tmp/embedding-shards-prepared.json'), JSON.stringify({ sources, collections }));
    console.log('Verified all assigned indexes; existing vectors retained.');
  } finally {
    await db.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
