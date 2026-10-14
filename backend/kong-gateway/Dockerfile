FROM kong:3.9.1@sha256:76c14b93e989f7f4418039f7f9789ca32564016211c86ac1a18022f4788e7b9c AS production
ENV KONG_DATABASE=off \
    KONG_PLUGINS=bundled,jwt-user-context \
    KONG_ADMIN_LISTEN=off \
    KONG_DECLARATIVE_CONFIG=/tmp/kong.yml
USER root
COPY plugins/jwt-user-context/ /usr/local/share/lua/5.1/kong/plugins/jwt-user-context/
COPY kong.docker.yml /usr/local/kong/declarative/kong.template.yml
COPY render-config.lua /usr/local/kong/render-config.lua
COPY start-kong.sh /usr/local/kong/start-kong.sh
RUN chmod 755 /usr/local/kong/start-kong.sh
USER kong
ENTRYPOINT ["/usr/local/kong/start-kong.sh"]
