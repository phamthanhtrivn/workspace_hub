#!/bin/sh
set -eu
# Local PostgreSQL login is preserved. Never alter an existing database or owner.
psql -X -q -v ON_ERROR_STOP=1 -d postgres <<'SQL'
SELECT pg_advisory_lock(8087016);
SELECT 'CREATE DATABASE notebook_db' WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'notebook_db'
)\gexec
SELECT pg_advisory_unlock(8087016);
SQL
psql -X -q -v ON_ERROR_STOP=1 -d notebook_db -c 'SELECT 1' >/dev/null
echo 'Local notebook database is available.'
