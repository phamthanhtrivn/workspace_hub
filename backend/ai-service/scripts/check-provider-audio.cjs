// Read-only capability discovery. Does not upload audio or invoke a model.
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });

async function main() {
  const base = new URL(process.env.LLM_BASE_URL || "https://vibi.top/v1/");
  if (base.origin !== "https://vibi.top")
    throw new Error("This check is scoped to https://vibi.top");
  const key = process.env.LLM_API_KEY;
  const catalog = async () => {
    if (!key) return { configured: false };
    const response = await fetch(`${base.origin}/v1/models`, {
      headers: { authorization: `Bearer ${key}` },
      redirect: "error", signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return { status: response.status };
    const payload = await response.json();
    const models = Array.isArray(payload.data) ? payload.data : [];
    return { status: response.status, count: models.length,
      audioCandidates: models.filter(model => /whisper|transcri|speech|audio|scribe|nova/i.test(model.id || ""))
        .map(model => model.id) };
  };
  const pricing = async () => {
    const response = await fetch(`${base.origin}/api/pricing`, {
      redirect: "error", signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return { status: response.status };
    const payload = await response.json();
    const models = Array.isArray(payload.data) ? payload.data : [];
    const candidates = models.filter(model =>
      /whisper|transcri|speech|audio|scribe|nova/i.test(model.model_name || "") ||
      /audio|transcri|speech/i.test(JSON.stringify(model.supported_endpoint_types || [])));
    return { status: response.status, count: models.length,
      audioCandidates: candidates.map(model => ({ id: model.model_name,
        endpoints: model.supported_endpoint_types })) };
  };
  const results = await Promise.allSettled([catalog(), pricing()]);
  console.log(JSON.stringify({ provider: base.origin,
    keyCatalog: results[0].status === "fulfilled" ? results[0].value : { error: "Request failed" },
    publicPricing: results[1].status === "fulfilled" ? results[1].value : { error: "Request failed" },
    note: "Catalog names are discovery hints, not proof of audio inference support. No model was invoked."
  }, null, 2));
  if (results.some(result => result.status === "rejected")) process.exitCode = 1;
}
main().catch(() => { console.error("Provider check failed; no credentials logged."); process.exitCode = 1; });
