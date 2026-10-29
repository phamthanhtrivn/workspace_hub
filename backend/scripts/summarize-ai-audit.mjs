import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const target = resolve(root, "docs/testing/ai-comprehensive");
const read = (name) => JSON.parse(readFileSync(resolve(target, name), "utf8"));
const regression = JSON.parse(readFileSync(resolve(root, "docs/testing/ai-performance/tests.json"), "utf8"));
const pipeline = JSON.parse(readFileSync(resolve(root, "docs/testing/ai-service-audit-results.json"), "utf8"));
const inventory = read("architecture-inventory.json");
const http = read("http-coverage.json");
const rag = read("rag-tests.json");
const nativeFiles = ["native-flow.json", "native-additional.json", "native-meeting.json", "native-recovery.json", "native-s3.json", "native-ocr.json"];
const native = nativeFiles.every(name => existsSync(resolve(target, name))) ? Object.fromEntries(nativeFiles.map(name => [name, read(name)])) : undefined;
const nativePassed = !!native && Object.values(native).every(run => run.passed === true || run.status === "PASS");
const communication = existsSync(resolve(target, "communication-regression.json")) ? read("communication-regression.json") : undefined;
const communicationLint = existsSync(resolve(target, "communication-lint-baseline.json")) ? read("communication-lint-baseline.json") : undefined;
const cleanup = existsSync(resolve(target, "native-cleanup.json")) ? read("native-cleanup.json") : undefined;
const speech = read("speech-accuracy.json");
const media = JSON.parse(readFileSync(resolve(root, "docs/testing/meeting-local-speech-results.json"), "utf8"));
const liveFiles = ["live-model.json", "live-model-work-backend-metrics.json", "live-model-vision-document-image.json"];
const liveRuns = liveFiles.map(read);
const liveCases = new Map();
for (const [index, run] of liveRuns.entries())
  for (const item of run.cases) {
    const entry = liveCases.get(item.id) ?? { id: item.id, attempts: [] };
    entry.attempts.push({ status: item.status, errorType: item.errorType, artifact: liveFiles[index], durationMs: item.durationMs });
    entry.finalStatus = item.status;
    entry.checks = item.checks;
    liveCases.set(item.id, entry);
  }
const relatedTests = pipeline.steps.filter((step) => step.name !== "ai-tests" && step.status === "PASS" && step.tests).reduce((sum, step) => sum + step.tests, 0);
const rerank = JSON.parse(readFileSync(resolve(root, "../.tmp/ai-comprehensive-rerank.json"), "utf8"));
writeFileSync(resolve(target, "retrieval-evaluation.json"), JSON.stringify(rerank, null, 2) + "\n");
const coveredRoutes = http.routes.filter((route) => route.statuses.some((status) => status >= 200 && status < 300)).length;
const scopedChecksPassed = regression.tests > 0 && regression.failed === 0 && pipeline.automatedPassed && rag.failures.length === 0 && rag.errors.length === 0 && liveCases.size === 5 && [...liveCases.values()].every((item) => item.finalStatus === "PASS") && media.passed === true && coveredRoutes === inventory.endpoints;
const result = {
  generatedAt: new Date().toISOString(),
  verdict: scopedChecksPassed && nativePassed ? "Automated checks and isolated native stack scenarios pass; production certification and universal AI accuracy are not established" : scopedChecksPassed ? "Automated and bounded live checks pass; native stack evidence incomplete" : "Some scoped checks failed or are incomplete; inspect evidence",
  scopedChecksPassed: scopedChecksPassed && (!native || nativePassed),
  architecture: { sourceFiles: inventory.sourceFiles, sourceLines: inventory.sourceLines, endpoints: inventory.endpoints, testFiles: inventory.testFiles },
  automation: {
    aiTests: { total: regression.tests, passed: regression.passed, failed: regression.failed },
    relatedTests,
    rag: native?.["native-ocr.json"] ?? { total: rag.tests, passed: rag.passed, failed: rag.failures.length + rag.errors.length, skipped: rag.skipped.length },
    communication: communication ? { total: communication.numTotalTests, passed: communication.numPassedTests, failed: communication.numFailedTests, suites: communication.numTotalTestSuites } : undefined,
    totalPassed: regression.passed + relatedTests + (native?.["native-ocr.json"].passed ?? rag.passed) + (communication?.numPassedTests ?? 0),
    skipped: native?.["native-ocr.json"].skipped === 0 ? [] : rag.skipped,
    buildAndLint: pipeline.steps.filter((step) => /build|lint|types/.test(step.name)).map(({ name, status }) => ({ name, status })),
  },
  http: {
    implemented: inventory.endpoints,
    covered: coveredRoutes,
    requests: http.routes.reduce((sum, route) => sum + route.requests, 0),
    mode: http.mode,
  },
  liveModel: { requests: liveRuns.reduce((sum, run) => sum + run.requests.length, 0), cases: [...liveCases.values()], scope: liveRuns[0].mode },
  liveSpeech: { passed: media.passed === true, referenceWords: speech.referenceWords, wordEdits: speech.wordEdits, wer: speech.wer, scope: speech.scope },
  reranking: rerank,
  fixedDefects: [
    { id: "AI-QA-01", severity: "P2", description: "Preserve Project 403 during timezone refetch", regression: "comprehensive-regressions.test.cjs" },
    { id: "AI-QA-02", severity: "P2", description: "Partition Studio artifact cache by provider, effective model and output budget", regression: "comprehensive-regressions.test.cjs" },
    ...(nativePassed ? [{ id: "AI-QA-03", severity: "P1", description: "Communication production startup failed because emitted JavaScript retained unresolved src/* imports; convert 19 imports across 12 files to relative paths", regression: "273 Communication tests and actual compiled native service startup" }] : []),
  ],
  fullStackVerified: false,
  isolatedNativeStackVerified: nativePassed,
  nativeEvidence: native,
  environmentCleanup: cleanup,
  codeQuality: {
    aiLintPassed: pipeline.steps.some(step => step.name === "ai-lint" && step.status === "PASS"),
    communicationLint: communicationLint ? {
      clean: communicationLint.files.every(file => file.currentErrors === 0 && file.currentWarnings === 0),
      noNewDiagnosticsFromImportFix: communicationLint.passed,
      existingErrors: communicationLint.files.reduce((sum, file) => sum + file.currentErrors, 0),
      existingWarnings: communicationLint.files.reduce((sum, file) => sum + file.currentWarnings, 0),
      evidence: "communication-lint-baseline.json",
    } : undefined,
  },
  remainingChecks: nativePassed ? [
    "S3 HTTP uses local Moto emulation, not AWS cloud infrastructure, IAM, KMS or CloudFront certification.",
    "Meeting recording input uses fixture completed-recording metadata and a public audio sample; LiveKit capture/egress is not exercised.",
    "100 notebook reads at concurrency 10 are a local bounded smoke, not sustained load, multi-node failover, disk/OOM testing or an LLM throughput SLA.",
    "Recovery covers queued cleanup, Redis AOF, PostgreSQL/Qdrant and API/worker restarts; unknown outcomes during paid model process crashes are not certified by native tests.",
    "Real multilingual-e5-small retrieval passed one synthetic document scenario; Docling paths and statistical multilingual document/LLM/STT quality still require reviewed representative corpora.",
  ] : [
    "Five local OCR tests require Tesseract and Vietnamese/English language packs; run in RAG Docker image.",
    "Docker daemon and application services were not running; full Kong/JWT, Document/S3, native PostgreSQL/Redis/Qdrant and Communication integration remains unverified.",
    "Qdrant tests use in-memory engine and fixture vectors; real embedding model quality, vector server indexes and Docling model loading remain unverified.",
    "No sustained production load, distributed locking, process-crash durability or statistically meaningful LLM/STT quality benchmark was performed.",
    "Live model smoke checks use synthetic authorized inputs and isolated quota SQL; they do not exercise live application permissions or persistence.",
  ],
};
writeFileSync(resolve(target, "results.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ passed: result.automation.totalPassed, skipped: result.automation.rag.skipped, routes: result.http.covered, liveCases: result.liveModel.cases.map(({ id, finalStatus }) => ({ id, finalStatus })), isolatedNativeStackVerified: nativePassed, fullStackVerified: false }));
if (!result.scopedChecksPassed) process.exitCode = 1;
