const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { LuaFactory } = require("wasmoon");

test("Kong Lua handler strips forged proof and requires verified credentials before adding gateway proof", async () => {
  const handler = readFileSync(
    "../kong-gateway/plugins/jwt-user-context/handler.lua",
    "utf8",
  );
  const code = `
    local payload = { sub = 'real-owner', email = 'real@example.test', role = 'USER' }
    package.preload['cjson.safe'] = function() return { decode = function() return payload end } end
    ngx = { decode_base64 = function() return '{}' end, log = function() end, ERR = 'error' }
    local upstream, credential, status, auth
    kong = {
      service = { request = {
        clear_header = function(name) upstream[name] = nil end,
        set_header = function(name, value) upstream[name] = value end
      } },
      request = { get_header = function() return auth end },
      client = { get_credential = function() return credential end },
      response = { exit = function(code) status = code end }
    }
    local handler = (function() ${handler} end)()
    local config = {
      header_user_id = 'X-User-Id', header_user_email = 'X-User-Email',
      header_user_role = 'X-User-Role', header_user_name = 'X-User-Name',
      header_user_avatar = 'X-User-Avatar', optional = false,
      gateway_service_key = 'fixture-gateway-proof-not-production-000'
    }
    local function reset()
      upstream = { ['X-User-Id'] = 'forged-owner', ['X-Workspace-Gateway-Key'] = 'forged-proof' }
      status = nil
      auth = 'Bearer header.payload.signature'
    end
    reset()
    credential = nil
    handler:access(config)
    assert(status == 401, 'Unsigned/unchecked tokens must never receive trusted proof')
    assert(upstream['X-Workspace-Gateway-Key'] == nil)
    assert(upstream['X-User-Id'] == nil)
    reset()
    credential = { key = 'verified-jwt-credential' }
    handler:access(config)
    assert(status == nil)
    assert(upstream['X-Workspace-Gateway-Key'] == config.gateway_service_key)
    assert(upstream['X-User-Id'] == payload.sub)
    assert(upstream['X-User-Email'] == payload.email)
    reset()
    auth = nil
    handler:access(config)
    assert(status == 401)
    assert(upstream['X-Workspace-Gateway-Key'] == nil)
    reset()
    config.gateway_service_key = nil
    handler:access(config)
    assert(status == nil, 'Existing routes without AI proof keep working')
    assert(upstream['X-Workspace-Gateway-Key'] == nil)
  `;
  const state = await new LuaFactory().createEngine();
  try {
    await state.doString(code);
  } finally {
    state.global.close();
  }
});

test("gateway renderer quotes dedicated credentials and tolerates disabled AI without breaking other routes", async () => {
  const renderer = readFileSync("../kong-gateway/render-config.lua", "utf8");
  const template =
    "jwt: $JWT_SECRET_KEY\nfrontend: $FRONTEND_URL\nproof: $AI_GATEWAY_KEY\n";
  for (const key of [
    undefined,
    'fixture-gateway-key-with-"quoted"-characters',
  ]) {
    const state = await new LuaFactory().createEngine();
    const jwt = 'fixture-jwt-with-"quotes"-$symbols';
    const frontend = "http://localhost:3000";
    try {
      state.global.set("json_encode", JSON.stringify);
      state.global.set("template", template);
      state.global.set("jwt", jwt);
      state.global.set("frontend", frontend);
      if (key) state.global.set("gateway_key", key);
      await state.doString(`
        package.preload['cjson'] = function() return { encode = json_encode } end
        os.getenv = function(name)
          if name == 'JWT_SECRET_KEY' then return jwt end
          if name == 'FRONTEND_URL' then return frontend end
          if name == 'AI_GATEWAY_KEY' then return gateway_key end
        end
        io.open = function(path, mode)
          if mode == 'r' then return { read = function() return template end, close = function() end } end
          return { write = function(self, value) rendered = value end, close = function() end }
        end
        ${renderer}
      `);
      assert.equal(
        state.global.get("rendered"),
        `jwt: ${JSON.stringify(jwt)}\nfrontend: ${JSON.stringify(frontend)}\nproof: ${JSON.stringify(key || "disabled")}\n`,
      );
    } finally {
      state.global.close();
    }
  }
});
