#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
source "$(dirname "$0")/common.sh"
export IMAGE_TAG="${1:?New image tag is required}"
validate_tag "$IMAGE_TAG"
test -s "$APP_DIR/.env.production" || { echo 'Operator-managed .env.production is required' >&2; exit 1; }
if [[ "${DEPLOY_LOCK_HELD:-0}" != 1 ]]; then
  exec 9>"$APP_DIR/.deploy.lock"
  flock -n 9 || { echo 'Another deployment holds the lock' >&2; exit 1; }
fi
export DEPLOY_LOCK_HELD=1
old_tag=$(release_tag)
# The installer stages the candidate compose separately; retain the working manifest and secrets.
if [[ -n "$old_tag" ]]; then
  cp "$APP_DIR/.release.env" "$APP_DIR/.previous-release.env"
  cp "$APP_DIR/compose.yml" "$APP_DIR/.previous-compose.yml"
  cp "$APP_DIR/.env.runtime" "$APP_DIR/.previous-env.runtime"
fi
rollout_started=false
restore_on_pre_rollout_error() {
  if ! $rollout_started && [[ -n "$old_tag" ]]; then
    cp "$APP_DIR/.previous-compose.yml" "$APP_DIR/compose.yml"
    cp "$APP_DIR/.previous-env.runtime" "$APP_DIR/.env.runtime"
  fi
}
trap restore_on_pre_rollout_error ERR
cp "$APP_DIR/compose.candidate.yml" "$APP_DIR/compose.yml"
RUNTIME_DIR="$APP_DIR" bash "$APP_DIR/scripts/bootstrap-app-env.sh" app
compose config --quiet
compose --profile migration pull
if ! bash "$APP_DIR/scripts/migrate.sh"; then
  echo 'Migration failed; existing application containers remain running.' >&2
  if [[ -n "$old_tag" ]]; then
    cp "$APP_DIR/.previous-compose.yml" "$APP_DIR/compose.yml"
    cp "$APP_DIR/.previous-env.runtime" "$APP_DIR/.env.runtime"
  fi
  exit 1
fi
rollout_started=true
if compose up -d --remove-orphans && bash "$APP_DIR/scripts/health-check.sh"; then
  printf 'IMAGE_TAG=%s\nPREVIOUS_IMAGE_TAG=%s\n' "$IMAGE_TAG" "$old_tag" > "$APP_DIR/.release.env.new"
  mv "$APP_DIR/.release.env.new" "$APP_DIR/.release.env"
  echo "Deployed $IMAGE_TAG"
else
  if [[ -n "$old_tag" ]]; then
    bash "$APP_DIR/scripts/rollback.sh"
  else
    echo 'First release failed; no previous release exists for rollback.' >&2
  fi
  exit 1
fi
# No automatic image pruning: retain both current and previous releases for rollback.
