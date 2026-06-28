FROM kong:latest

USER root

# Create directory for the custom plugin
RUN mkdir -p /usr/local/share/lua/5.1/kong/plugins/jwt-user-context

# Copy the plugin source code
COPY plugins/jwt-user-context/schema.lua /usr/local/share/lua/5.1/kong/plugins/jwt-user-context/
COPY plugins/jwt-user-context/handler.lua /usr/local/share/lua/5.1/kong/plugins/jwt-user-context/

# Switch back to the kong user
USER kong
