#!/bin/sh
set -eu
# Run with the PostgreSQL 15 client image, not with the AI runtime credentials.
: "${PGHOST:?PGHOST is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${NOTEBOOK_POSTGRES_PASSWORD:?NOTEBOOK_POSTGRES_PASSWORD is required}"
NOTEBOOK_POSTGRES_USER=${NOTEBOOK_POSTGRES_USER:-notebook}
export NOTEBOOK_POSTGRES_USER
[ "$NOTEBOOK_POSTGRES_USER" = notebook ] || { echo 'Expected dedicated notebook role' >&2; exit 1; }
[ "${#NOTEBOOK_POSTGRES_PASSWORD}" -ge 32 ] || { echo 'Notebook password must have at least 32 characters' >&2; exit 1; }

# Session lock covers role/database creation without wrapping CREATE DATABASE in a transaction.
# Read the password inside psql; never interpolate it into a shell command or print generated SQL.
psql -X -q -v ON_ERROR_STOP=1 -d postgres <<'SQL'
\set ECHO none
\getenv notebook_password NOTEBOOK_POSTGRES_PASSWORD
SELECT pg_advisory_lock(8087015);
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname='notebook'
    AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
    OR EXISTS (SELECT FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname='notebook')
  THEN RAISE EXCEPTION 'Existing notebook role has unexpected privileges'; END IF;
  IF EXISTS (SELECT FROM pg_database d JOIN pg_roles r ON r.oid=d.datdba
    WHERE d.datname='notebook_db' AND r.rolname<>'notebook')
  THEN RAISE EXCEPTION 'Existing notebook_db has an unexpected owner'; END IF;
END $$;
SELECT format('CREATE ROLE notebook LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', :'notebook_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname='notebook')\gexec
SELECT 'CREATE DATABASE notebook_db OWNER notebook'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='notebook_db')\gexec
REVOKE ALL ON DATABASE notebook_db FROM PUBLIC;
SELECT pg_advisory_unlock(8087015);
SQL

# An existing role's password is not silently rotated. Fail if the supplied credential differs.
PGUSER=notebook PGPASSWORD="$NOTEBOOK_POSTGRES_PASSWORD" psql -X -q -v ON_ERROR_STOP=1 -d notebook_db -c 'SELECT 1' >/dev/null
echo 'Notebook database provisioned; runtime credential verified.'
