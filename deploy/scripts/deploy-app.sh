#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
source "$(dirname "$0")/common.sh"
tag="${1:?Release tag required}"
validate_tag "$tag"
test -s "$APP_DIR/.env.production" || { echo 'Operator-managed .env.production is required' >&2; exit 1; }
if [[ "${DEPLOY_LOCK_HELD:-0}" != 1 ]]; then
  exec 9>"$APP_DIR/.deploy.lock"
  flock -n 9 || { echo 'Another deployment holds the lock' >&2; exit 1; }
fi
"${RUNTIME_PYTHON:-/opt/workspacehub/venv/bin/python}" "$APP_DIR/scripts/release-app.py" "${2:?Release plan required}" "${tag#sha-}"
