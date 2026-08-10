local typedefs = require "kong.db.schema.typedefs"

local plugin_name = "jwt-user-context"

return {
  name = plugin_name,
  fields = {
    {
      config = {
        type = "record",
        fields = {
          { header_user_id = { type = "string", default = "X-User-Id" } },
          { header_user_email = { type = "string", default = "X-User-Email" } },
          { header_user_role = { type = "string", default = "X-User-Role" } },
          { header_user_name = { type = "string", default = "X-User-Name" } },
          { header_user_avatar = { type = "string", default = "X-User-Avatar" } },
          { optional = { type = "boolean", default = false } },
        },
      },
    },
  },
}
