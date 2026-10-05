#!/usr/bin/env bash
set -Eeuo pipefail
APP_DIR="${APP_DIR:-/opt/workspacehub/app}"
cd "$APP_DIR"
compose() { docker compose --env-file "$APP_DIR/.env.production" -f "$APP_DIR/compose.yml" "$@"; }
validate_tag() { [[ "$1" =~ ^sha-[0-9a-f]{40}$ ]] || { echo 'Expected sha-<40 lowercase hex characters>' >&2; return 1; }; }
release_tag() { sed -n 's/^IMAGE_TAG=//p' "$APP_DIR/.release.env" 2>/dev/null || true; }
