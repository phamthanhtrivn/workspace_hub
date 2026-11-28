local GatewayBoundaryHandler = {
  PRIORITY = 2001, -- Clear untrusted identity before CORS, jwt and jwt-user-context.
  VERSION = "1.0.0",
}

function GatewayBoundaryHandler:access()
  local headers, err = kong.request.get_headers(1000)
  if err == "truncated" then
    return kong.response.exit(431, { message = "Too many request headers" })
  end
  for name in pairs(headers) do
    if name:lower():sub(1, 7) == "x-user-" then
      kong.service.request.clear_header(name)
    end
  end
  kong.service.request.clear_header("X-Workspace-Gateway-Key")

  -- get_path normalizes dot segments and duplicate slashes. Decode reserved separators
  -- too so encoded internal paths cannot be exposed by an upstream router.
  local path = kong.request.get_path()
  for _ = 1, 2 do
    path = ngx.unescape_uri(path)
  end
  if path:find("\\", 1, true) then
    return kong.response.exit(400, { message = "Invalid request path" })
  end
  if path:find("/internal/", 1, true) or path:sub(-9) == "/internal" then
    return kong.response.exit(404, { message = "Not found" })
  end
end

return GatewayBoundaryHandler
