#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
if [[ "${DEPLOY_LOCK_HELD:-0}" != 1 ]]; then
  exec 9>"$APP_DIR/.deploy.lock"
  flock -n 9 || { echo 'Another deployment holds the lock' >&2; exit 1; }
fi
previous=$(sed -n 's/^IMAGE_TAG=//p' "$APP_DIR/.previous-release.env" 2>/dev/null || true)
validate_tag "$previous"
test -f "$APP_DIR/.previous-compose.yml"
test -f "$APP_DIR/.previous-env.production"
cp "$APP_DIR/.previous-compose.yml" "$APP_DIR/compose.yml"
cp "$APP_DIR/.previous-env.production" "$APP_DIR/.env.production"
export IMAGE_TAG="$previous"
compose pull
compose up -d --remove-orphans
bash "$APP_DIR/scripts/health-check.sh"
cp "$APP_DIR/.previous-release.env" "$APP_DIR/.release.env"
echo "Restored application release $previous. Database migrations were not reversed."
