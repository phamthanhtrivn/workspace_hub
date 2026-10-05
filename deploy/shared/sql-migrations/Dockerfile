FROM postgres:15.18-alpine@sha256:cd17e2ac98240fce1541ad2a803b34009b4eea5aec8a832363cdc7eca62e722e AS base
COPY deploy/shared/sql-migrations/migrate.sh /usr/local/bin/workspacehub-migrate
RUN chmod 755 /usr/local/bin/workspacehub-migrate
ENTRYPOINT ["/usr/local/bin/workspacehub-migrate"]

FROM base AS user
COPY backend/user-service/src/main/resources/db/migration/ /migrations/

FROM base AS project
COPY backend/project-service/database/migrations/ /migrations/
