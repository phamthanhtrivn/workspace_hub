local source = assert(io.open('/usr/local/kong/declarative/kong.template.yml', 'r'))
local config = source:read('*a')
source:close()
for _, key in ipairs({'JWT_SECRET_KEY', 'FRONTEND_URL'}) do
  local value = assert(os.getenv(key), key .. ' is required')
  assert(#value > 0, key .. ' must not be empty')
  -- JSON strings are YAML scalars too; quoting avoids sed/YAML injection.
  local quoted = require('cjson').encode(value)
  config = config:gsub('%$' .. key, function() return quoted end)
end
local destination = assert(io.open('/tmp/kong.yml', 'w'))
destination:write(config)
destination:close()
