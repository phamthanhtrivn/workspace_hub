#!/bin/sh
set -eu
umask 077
script=$(mktemp)
trap 'rm -f "$script"' EXIT HUP INT TERM
cat > "$script" <<'SQL'
\set ON_ERROR_STOP on
SELECT pg_advisory_lock(82463001);
CREATE TABLE IF NOT EXISTS workspacehub_schema_history (
  filename text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
);
SQL
# Sort numerically, then by full filename: project has two distinct V20 scripts.
find /migrations -name 'V*__*.sql' | sort -V | while IFS= read -r file; do
  filename=$(basename "$file")
  case "$filename" in *[!a-zA-Z0-9_.]*) echo 'Invalid migration filename' >&2; exit 1;; esac
  checksum=$(sha256sum "$file" | cut -d ' ' -f 1)
  cat >> "$script" <<SQL
BEGIN;
DO \$\$ BEGIN
  IF EXISTS (SELECT 1 FROM workspacehub_schema_history WHERE filename = '$filename' AND checksum <> '$checksum') THEN
    RAISE EXCEPTION 'Previously applied migration changed: $filename';
  END IF;
END \$\$;
SELECT NOT EXISTS (SELECT 1 FROM workspacehub_schema_history WHERE filename = '$filename') AS apply_migration \gset
\if :apply_migration
\i $file
INSERT INTO workspacehub_schema_history(filename, checksum) VALUES ('$filename', '$checksum');
\endif
COMMIT;
SQL
done
printf '\nSELECT pg_advisory_unlock(82463001);\n' >> "$script"
exec psql -X -v ON_ERROR_STOP=1 -f "$script"
