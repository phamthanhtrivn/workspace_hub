local typedefs = require "kong.db.schema.typedefs"

return {
  name = "gateway-boundary",
  fields = {
    { protocols = typedefs.protocols_http },
    { config = { type = "record", fields = {} } },
  },
}
