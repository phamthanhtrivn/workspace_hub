local cjson_safe = require "cjson.safe"
local string_gsub = string.gsub
local string_rep = string.rep
local ngx_decode_base64 = ngx.decode_base64
local ngx_log = ngx.log
local ngx_ERR = ngx.ERR

local JwtUserContextHandler = {
  PRIORITY = 999, -- Run after the official jwt plugin (priority 1005)
  VERSION = "1.0.0",
}

local function decode_base64_url(input)
  local reminder = #input % 4
  if reminder > 0 then
    local padlen = 4 - reminder
    input = input .. string_rep("=", padlen)
  end
  input = string_gsub(input, "-", "+")
  input = string_gsub(input, "_", "/")
  return ngx_decode_base64(input)
end

function JwtUserContextHandler:access(config)
  -- 1. Always clear incoming headers to prevent header spoofing from the client
  kong.service.request.clear_header(config.header_user_id)
  kong.service.request.clear_header(config.header_user_email)
  kong.service.request.clear_header(config.header_user_role)

  -- 2. Extract JWT from Authorization header
  local auth_header = kong.request.get_header("Authorization")
  if not auth_header then
    -- The official JWT plugin should have blocked this if route is protected,
    -- but if it's somehow missing, we block it here.
    return kong.response.exit(401, { message = "Unauthorized: Missing Authorization header" })
  end

  local token = auth_header:match("Bearer%s+(.+)")
  if not token then
    return kong.response.exit(401, { message = "Unauthorized: Invalid Authorization header format" })
  end

  -- 3. Extract the payload (second part of the JWT)
  local header_b64, payload_b64, signature_b64 = token:match("^([^%.]+)%.([^%.]+)%.([^%.]+)$")
  if not payload_b64 then
    return kong.response.exit(401, { message = "Unauthorized: Invalid JWT format" })
  end

  -- 4. Decode payload safely
  local payload_json = decode_base64_url(payload_b64)
  if not payload_json then
    ngx_log(ngx_ERR, "[jwt-user-context] Failed to decode base64 JWT payload")
    return kong.response.exit(401, { message = "Unauthorized: Invalid JWT payload encoding" })
  end

  -- 5. Parse JSON safely
  local payload, err = cjson_safe.decode(payload_json)
  if err or not payload then
    ngx_log(ngx_ERR, "[jwt-user-context] Failed to parse JWT payload JSON: ", err)
    return kong.response.exit(401, { message = "Unauthorized: Invalid JWT payload JSON" })
  end

  -- 6. Extract user identity and set headers
  local sub = payload.sub
  local email = payload.email
  local role = payload.role

  if sub then
    kong.service.request.set_header(config.header_user_id, tostring(sub))
  end
  if email then
    kong.service.request.set_header(config.header_user_email, tostring(email))
  end
  if role then
    kong.service.request.set_header(config.header_user_role, tostring(role))
  end
end

return JwtUserContextHandler
