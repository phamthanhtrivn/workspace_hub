const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const api = path.join(root, 'backend/ai-service/api');
require(path.join(api, 'node_modules/dotenv')).config({path: path.join(api, '.env'), quiet: true});
const {db} = require(path.join(api, 'dist/infrastructure/database/database'));
const headers = {'content-type': 'application/json', 'x-internal-service-key': process.env.RAG_SERVICE_KEY};

async function call(route, body) {
  const response = await fetch(process.env.RAG_WORKER_URL + route, {method: 'POST', headers,
    body: JSON.stringify(body), signal: AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const report = {verifiedSources: 0, verifiedChunks: 0, validation: null, workloads: []};
  try {
    const {rows: sources} = await db.query("SELECT s.*,n.owner_id FROM notebook_ai.sources s JOIN notebook_ai.notebooks n ON n.id=s.notebook_id WHERE s.status='READY' ORDER BY s.id");
    const batches = [];
    for (const items of Map.groupBy(sources, source => source.notebook_id).values()) {
      for (let index = 0; index < items.length; index += 5) batches.push(items.slice(index, index + 5));
    }
    for (const batch of batches) {
      const result = await call('/chunks', {scopeId: batch[0].notebook_id, sourceIds: batch.map(source => source.id)});
      if (result.evidence.length !== batch.reduce((total, source) => total + source.chunk_count, 0)) throw new Error('Stored chunk count mismatch');
      report.verifiedSources += batch.length;
      report.verifiedChunks += result.evidence.length;
    }
    const source = sources.find(source => /\.(pdf|docx)$/i.test(source.name) && Number(source.size_bytes) < 2 * 1024 * 1024);
    if (source) {
      const {authorizeSources} = require(path.join(api, 'dist/infrastructure/integrations/document.client'));
      const {downloadSource} = require(path.join(api, 'dist/modules/sources/upload-validation'));
      const [manifest] = await authorizeSources({id: source.owner_id, email: source.owner_email}, [source], true);
      const content = await downloadSource(manifest);
      const start = performance.now();
      await call('/validate', {scopeId: source.notebook_id, name: source.name, content: content.toString('base64')});
      report.validation = {format: path.extname(source.name), bytes: content.length, durationMs: Math.round(performance.now() - start)};
    }
    for (const concurrency of [1, 3, 5]) {
      let cursor = 0;
      const timings = [];
      const started = performance.now();
      await Promise.all(Array.from({length: concurrency}, async () => {
        while (cursor < 10) {
          const index = cursor++;
          const batch = batches[index % batches.length];
          const start = performance.now();
          const result = await call('/retrieve', {scopeId: batch[0].notebook_id, sourceIds: batch.map(source => source.id),
            question: `Các nội dung và yêu cầu chính trong tài liệu là gì? Lượt kiểm tra ${concurrency}-${index}.`});
          if (!result.evidence.length || result.evidence.some(item => !batch.some(source => source.id === item.sourceId))) throw new Error('Invalid retrieval result');
          timings.push(performance.now() - start);
        }
      }));
      timings.sort((a,b) => a-b);
      report.workloads.push({concurrency, requests: timings.length, errors: 0, durationMs: Math.round(performance.now() - started),
        p50Ms: Math.round(timings[Math.floor(timings.length * .5)]), p95Ms: Math.round(timings[Math.min(timings.length - 1, Math.floor(timings.length * .95))])});
    }
    fs.writeFileSync(path.join(root, '.tmp/ai-hardening-benchmark.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally {
    await db.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
