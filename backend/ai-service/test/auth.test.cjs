const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
Object.assign(process.env, {
  AI_ENABLED: "true",
  NODE_ENV: "test",
  JWT_SECRET_KEY: "fixture-jwt-key-not-production-0000",
  INTERNAL_SERVICE_KEY: "fixture-internal-not-production-000",
  AI_GATEWAY_KEY: "fixture-gateway-proof-not-production-000",
  AI_DOCUMENT_SERVICE_KEY: "fixture-ai-document-not-production-000",
  RAG_SERVICE_KEY: "fixture-rag-service-not-production-000",
  DATABASE_URL: "postgres://test:test@localhost/test",
  REDIS_URL: "redis://localhost:6379",
  DOCUMENT_SERVICE_URL: "http://localhost:8085",
  RAG_WORKER_URL: "http://localhost:8088",
  LLM_BASE_URL: "https://provider.invalid/v1",
  LLM_API_KEY: "test-only",
  LLM_MODEL: "fixture",
});
const { AuthGuard } = require("../dist/auth");
const { Controller, Get, Req, Module, UseGuards } = require("@nestjs/common");
const { NestFactory } = require("@nestjs/core");
const { config } = require("../dist/config");
const actorId = randomUUID();
const identity = {
  "x-workspace-gateway-key": process.env.AI_GATEWAY_KEY,
  "x-user-id": actorId,
  "x-user-email": "owner@example.test",
  "x-user-role": "USER",
};
function authorize(headers) {
  const request = { headers };
  new AuthGuard().canActivate({
    switchToHttp: () => ({ getRequest: () => request }),
  });
  return request.actor;
}

test("direct calls cannot impersonate a user by supplying valid identity headers alone", () => {
  for (const key of [undefined, "", "wrong-key"]) {
    assert.throws(
      () => authorize({ ...identity, "x-workspace-gateway-key": key }),
      (error) => error.getStatus() === 401,
    );
  }
});

test("HTTP guard accepts gateway context and returns 401 for a bearer token without context", async (t) => {
  class Probe {
    who(request) {
      return request.actor;
    }
  }
  Controller("probe")(Probe);
  UseGuards(AuthGuard)(Probe);
  Get()(
    Probe.prototype,
    "who",
    Object.getOwnPropertyDescriptor(Probe.prototype, "who"),
  );
  Req()(Probe.prototype, "who", 0);
  class ProbeModule {}
  Module({ controllers: [Probe], providers: [AuthGuard] })(ProbeModule);
  const app = await NestFactory.create(ProbeModule, { logger: false });
  t.after(() => app.close());
  await app.listen(0, "127.0.0.1");
  const url = await app.getUrl();
  assert.equal(
    (
      await fetch(`${url}/probe`, {
        headers: { authorization: "Bearer unverified-token" },
      })
    ).status,
    401,
  );
  const { "x-workspace-gateway-key": _, ...forgedIdentity } = identity;
  assert.equal(
    (await fetch(`${url}/probe`, { headers: forgedIdentity })).status,
    401,
  );
  const accepted = await fetch(`${url}/probe`, { headers: identity });
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), {
    id: actorId,
    email: "owner@example.test",
  });
});
test("accepts validated gateway identity without a JWT secret or token", () => {
  assert.deepEqual(authorize(identity), {
    id: actorId,
    email: "owner@example.test",
  });
});
test("rejects missing or malformed gateway headers and password-reset identity", () => {
  for (const headers of [
    {},
    { authorization: "Bearer header.payload.signature" },
    { ...identity, "x-user-id": "------------------------------------" },
    { ...identity, "x-user-id": [actorId] },
    { ...identity, "x-user-email": "" },
    { ...identity, "x-user-email": "invalid" },
    { ...identity, "x-user-role": "RESET_PASSWORD_ROLE" },
  ]) {
    assert.throws(
      () => authorize(headers),
      (error) => error.getStatus() === 401,
    );
  }
});
test("disabled feature rejects business endpoints even with valid credentials", () => {
  config.AI_ENABLED = "false";
  try {
    assert.throws(
      () => authorize(identity),
      (error) => error.getStatus() === 503,
    );
  } finally {
    config.AI_ENABLED = "true";
  }
});

test("both Kong templates verify JWT and replace client identity headers for the AI route", () => {
  for (const name of ["kong.host.yml", "kong.docker.yml"]) {
    const yaml = readFileSync(`../kong-gateway/${name}`, "utf8");
    assert.match(
      yaml,
      /- name: jwt\s+route: notebook-ai-routes\s+config:\s+claims_to_verify: \[exp\]/,
    );
    assert.match(
      yaml,
      /- name: jwt-user-context\s+route: notebook-ai-routes\s+config:\s+gateway_service_key: \$AI_GATEWAY_KEY\s+header_user_id: X-User-Id\s+header_user_email: X-User-Email/,
    );
  }
});
test("gateway removes client proof before injecting its configured service identity", () => {
  const handler = readFileSync(
    "../kong-gateway/plugins/jwt-user-context/handler.lua",
    "utf8",
  );
  const clear = handler.indexOf('clear_header("X-Workspace-Gateway-Key")');
  const set = handler.indexOf(
    'set_header("X-Workspace-Gateway-Key", config.gateway_service_key)',
  );
  assert.ok(clear >= 0 && set > clear);
  assert.match(
    readFileSync("../kong-gateway/render-config.lua", "utf8"),
    /cjson.*encode\(os.getenv\('AI_GATEWAY_KEY'\)/,
  );
});
test("gateway key rotation accepts the previous key but never another service key", () => {
  config.AI_GATEWAY_KEY_PREVIOUS =
    "fixture-previous-gateway-key-not-production";
  try {
    assert.deepEqual(
      authorize({
        ...identity,
        "x-workspace-gateway-key": config.AI_GATEWAY_KEY_PREVIOUS,
      }),
      { id: actorId, email: "owner@example.test" },
    );
    assert.throws(
      () =>
        authorize({
          ...identity,
          "x-workspace-gateway-key": process.env.AI_DOCUMENT_SERVICE_KEY,
        }),
      (error) => error.getStatus() === 401,
    );
  } finally {
    config.AI_GATEWAY_KEY_PREVIOUS = "";
  }
});

test("enabled config requires dedicated keys in every environment, with no JWT or shared-key fallback", () => {
  const load = (mode, keys = {}, enabled = "true") =>
    spawnSync(
      process.execPath,
      [
        "-e",
        `try { const {config}=require('./dist/config'); console.log(JSON.stringify({ hasJwt: 'JWT_SECRET_KEY' in config, hasSharedKey: 'INTERNAL_SERVICE_KEY' in config })); } catch { process.exitCode=1; }`,
      ],
      {
        env: {
          ...process.env,
          DOTENV_CONFIG_PATH: "test/no-env-file",
          NODE_ENV: mode,
          JWT_SECRET_KEY: "",
          AI_ENABLED: enabled,
          ...keys,
        },
        encoding: "utf8",
      },
    );
  const local = load("development");
  assert.equal(local.status, 0);
  assert.deepEqual(JSON.parse(local.stdout), {
    hasJwt: false,
    hasSharedKey: false,
  });
  for (const mode of ["development", "production"]) {
    assert.equal(load(mode).status, 0);
    for (const name of [
      "AI_GATEWAY_KEY",
      "AI_DOCUMENT_SERVICE_KEY",
      "RAG_SERVICE_KEY",
    ]) {
      for (const key of ["", "local-internal-key"])
        assert.equal(load(mode, { [name]: key }).status, 1);
    }
    assert.equal(
      load(
        mode,
        {
          AI_GATEWAY_KEY: "",
          AI_DOCUMENT_SERVICE_KEY: "",
          RAG_SERVICE_KEY: "",
        },
        "false",
      ).status,
      0,
    );
  }
});
