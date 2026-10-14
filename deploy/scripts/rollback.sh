#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
source "$(dirname "$0")/common.sh"
if [[ "${DEPLOY_LOCK_HELD:-0}" != 1 ]]; then
  exec 9>"$APP_DIR/.deploy.lock"
  flock -n 9 || { echo 'Another deployment holds the lock' >&2; exit 1; }
fi
"${RUNTIME_PYTHON:-/opt/workspacehub/venv/bin/python}" "$APP_DIR/scripts/release-app.py" rollback
