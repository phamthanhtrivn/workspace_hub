const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "../..");
const directory = path.resolve(root, "../.tmp/ai-native-stack");
const state = JSON.parse(fs.readFileSync(path.join(directory, "state.json")));
const { ports, keys } = state;
const requireAi = createRequire(path.join(root, "backend/ai-service/package.json"));
const { Pool } = requireAi("pg");
const pg = new Pool({ connectionString: `postgresql://qa:${keys.pg}@127.0.0.1:${ports.pg}/ai_db` });
const report = { runAt: new Date().toISOString(), project: state.project, mode: "Actual Kong/JWT, User/Document/Project/Calendar/Communication/AI processes, native PostgreSQL/Redis/Qdrant, real multilingual embedding and configured LLM; local Moto S3 emulator", cases: [], resources: {} };
const target = path.join(root, "docs/testing/ai-comprehensive/native-flow.json");
const save = () => fs.writeFileSync(target, JSON.stringify(report, null, 2) + "\n");
const gateway = `http://127.0.0.1:${ports.kong}`;
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
async function run(id, fn) {
  const start = performance.now();
  try { await fn(); report.cases.push({ id, status: "PASS", durationMs: Math.round(performance.now() - start) }); }
  catch (error) { report.cases.push({ id, status: "FAIL", error: error.message.slice(0, 500), durationMs: Math.round(performance.now() - start) }); throw error; }
  finally { save(); console.log(JSON.stringify(report.cases.at(-1))); }
}
async function request(method, endpoint, body, user, expected = [200, 201], options = {}) {
  const response = await fetch((options.direct ?? gateway) + endpoint, {
    method, headers: { "content-type": "application/json", ...(user ? { authorization: `Bearer ${user.accessToken}` } : {}), ...options.headers },
    signal: AbortSignal.timeout(options.timeout ?? 150000),
    ...(body === undefined ? {} : { body: options.raw ? body : JSON.stringify(body) }),
  });
  const text = await response.text();
  assert.ok(expected.includes(response.status), `${method} ${endpoint} returned ${response.status}: ${text.slice(0, 250)}`);
  return { status: response.status, text, headers: response.headers, data: response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text).data : undefined };
}
async function readySource(notebookId, sourceId, user) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const { data } = await request("GET", `/api/ai/notebooks/${notebookId}`, undefined, user);
    const source = data.sources.find((item) => item.id === sourceId);
    if (source?.status === "READY") return source;
    if (["FAILED", "UNAVAILABLE"].includes(source?.status)) throw Error(`Index source ${source.status}: ${source.error}`);
    await pause(500);
  }
  throw Error("Source did not reach READY within 120s");
}
(async () => {
  let owner, reader, notebook, readerNotebook, document, source, readerSource, share;
  const content = Buffer.from("# Atlas pilot — synthetic QA\n\nApproved pilot budget: 108,000,000 VND, VAT included. The old draft budget of 120,000,000 VND was cancelled. Demo date: 2 November 2026 at 09:00 Vietnam time. The payment API has no assigned owner or deadline.\n");
  await run("real-user-registration-login-and-gateway-jwt", async () => {
    for (const [role, fullName] of [["owner", "QA Owner"], ["reader", "QA Reader"]]) {
      const email = `${role}.${Date.now()}@example.test`;
      await request("POST", "/api/auth/register", { fullName, email, password: "AuditPass!2026" });
      const login = await request("POST", "/api/auth/login", { email, password: "AuditPass!2026" });
      assert.ok(login.data?.accessToken && login.data?.userId);
      if (role === "owner") owner = login.data; else reader = login.data;
    }
    await request("GET", "/api/ai/notebooks", undefined, undefined, [401]);
    await request("GET", "/api/ai/notebooks", undefined, owner, [401], { headers: { authorization: "Bearer invalid.jwt.signature" } });
    notebook = (await request("POST", "/api/ai/notebooks", { title: "Native QA Atlas" }, owner)).data;
    readerNotebook = (await request("POST", "/api/ai/notebooks", { title: "Native QA shared source" }, reader)).data;
    await request("GET", `/api/ai/notebooks/${notebook.id}`, undefined, reader, [404], { headers: { "x-user-id": owner.userId, "x-user-email": owner.email } });
    report.resources = { ownerId: owner.userId, readerId: reader.userId, notebookId: notebook.id, readerNotebookId: readerNotebook.id };
  });
  await run("document-presigned-upload-and-real-native-ingestion", async () => {
    const body = { name: "atlas-native.md", mimeType: "text/markdown", sizeBytes: content.length };
    const upload = (await request("POST", "/api/documents/upload/initiate", body, owner)).data;
    assert.ok(upload.presignedUrl && upload.s3Key);
    const put = await fetch(upload.presignedUrl, { method: "PUT", headers: { "content-type": body.mimeType }, body: content, signal: AbortSignal.timeout(10000) });
    assert.equal(put.status, 200); await put.body?.cancel();
    document = (await request("POST", "/api/documents/upload/confirm", { ...body, s3Key: upload.s3Key }, owner)).data;
    assert.ok(document.id);
    source = (await request("POST", `/api/ai/notebooks/${notebook.id}/sources`, { refs: [{ documentId: document.id }] }, owner)).data[0];
    const ready = await readySource(notebook.id, source.id, owner);
    assert.ok(ready.chunk_count > 0);
    report.resources.documentId = document.id; report.resources.sourceId = source.id;
    report.resources.originalS3Key = upload.s3Key;
  });
  await run("real-rag-retrieval-scope-and-grounded-llm-stream", async () => {
    const retrieval = await fetch(`http://127.0.0.1:${ports.rag}/retrieve`, { method: "POST", headers: { "content-type": "application/json", "x-internal-service-key": keys.rag }, body: JSON.stringify({ scopeId: notebook.id, sourceIds: [source.id], question: "approved budget" }), signal: AbortSignal.timeout(20000) });
    assert.equal(retrieval.status, 200);
    const evidence = await retrieval.json(); assert.ok(evidence.evidence.length);
    assert.ok(evidence.evidence.every((item) => item.sourceId === source.id));
    const foreign = await fetch(`http://127.0.0.1:${ports.rag}/retrieve`, { method: "POST", headers: { "content-type": "application/json", "x-internal-service-key": keys.rag }, body: JSON.stringify({ scopeId: readerNotebook.id, sourceIds: [source.id], question: "approved budget" }) });
    assert.deepEqual((await foreign.json()).evidence, []);
    const answer = await request("POST", `/api/ai/notebooks/${notebook.id}/messages`, { requestId: randomUUID(), question: "What is the approved Atlas pilot budget? Is VAT included?", sourceIds: [source.id] }, owner);
    assert.match(answer.headers.get("content-type"), /text\/event-stream/);
    assert.match(answer.text, /event: done/); assert.doesNotMatch(answer.text, /event: error/);
    assert.match(answer.text, /108/); assert.match(answer.text, /S1/);
    const stored = await pg.query("SELECT content,citations FROM notebook_ai.messages WHERE notebook_id=$1 AND role='ASSISTANT'", [notebook.id]);
    assert.ok(stored.rows.length && stored.rows[0].citations.length);
  });
  await run("real-document-sharing-and-revocation-blocks-new-access", async () => {
    await request("POST", `/api/ai/notebooks/${readerNotebook.id}/sources`, { refs: [{ documentId: document.id }] }, reader, [403]);
    share = (await request("POST", `/api/documents/${document.id}/sharing/shares`, { email: reader.email, permission: "VIEWER" }, owner)).data;
    assert.ok(share.id);
    readerSource = (await request("POST", `/api/ai/notebooks/${readerNotebook.id}/sources`, { refs: [{ documentId: document.id }] }, reader)).data[0];
    await readySource(readerNotebook.id, readerSource.id, reader);
    await request("DELETE", `/api/documents/${document.id}/sharing/shares/${share.id}`, undefined, owner);
    const masked = (await request("GET", `/api/ai/notebooks/${readerNotebook.id}`, undefined, reader)).data;
    assert.equal(masked.sources[0].status, "UNAVAILABLE");
    await request("POST", `/api/ai/notebooks/${readerNotebook.id}/messages`, { requestId: randomUUID(), question: "What is the budget?", sourceIds: [readerSource.id] }, reader, [403]);
  });
  await run("studio-summary-real-redis-worker-and-native-checkpoints", async () => {
    const artifact = (await request("POST", `/api/ai/notebooks/${notebook.id}/artifacts`, { kind: "SUMMARY", sourceIds: [source.id] }, owner)).data;
    const deadline = Date.now() + 180000;
    let completed;
    while (Date.now() < deadline) {
      const { rows } = await pg.query("SELECT status,content,sections,error FROM notebook_ai.artifacts WHERE id=$1", [artifact.id]);
      if (rows[0].status === "COMPLETED") { completed = rows[0]; break; }
      if (["FAILED", "CANCELLED"].includes(rows[0].status)) throw Error(`Summary ${rows[0].status}: ${rows[0].error}`);
      await pause(500);
    }
    assert.ok(completed, "Summary did not finish"); assert.match(completed.content, /108/); assert.ok(completed.sections.length);
  });
  await run("native-project-context-and-work-assistant", async () => {
    const project = (await request("POST", "/api/projects", { name: "Atlas Native QA" }, owner)).data;
    assert.ok(project.id); report.resources.projectId = project.id;
    const task = (await request("POST", `/api/projects/${project.id}/tasks`, { title: "Fix overdue payment callback", priority: "HIGH", dueDate: new Date(Date.now() - 86400000).toISOString(), assigneeUserId: owner.userId }, owner)).data;
    assert.ok(task.id);
    const overview = (await request("GET", `/api/ai/work-assistant/overview?projectId=${project.id}&audience=project`, undefined, owner)).data;
    assert.equal(overview.sources.project.state, "ready"); assert.ok(overview.tasks.some((item) => item.id === task.id));
    await request("GET", `/api/ai/work-assistant/overview?projectId=${project.id}&audience=project`, undefined, reader, [403]);
    const session = (await request("POST", "/api/ai/work-assistant/sessions", { projectId: project.id }, owner)).data;
    const result = await request("POST", `/api/ai/work-assistant/sessions/${session.id}/messages`, { question: "What work is overdue? Use only my project data.", requestId: randomUUID(), audience: "project" }, owner);
    assert.match(result.text, /event: done/); assert.match(result.text, /callback/i);
    report.resources.workSessionId = session.id;
  });
  report.passed = true;
  fs.writeFileSync(path.join(directory, "test-identities.json"), JSON.stringify({ owner, reader, ...report.resources }, null, 2));
})().catch((error) => { report.passed = false; console.error(JSON.stringify({ nativeFlow: "FAIL", error: error.message.slice(0, 500) })); process.exitCode = 1; })
  .finally(async () => { save(); await pg.end(); });
