#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
role="${1:?Host role required}"
tag="${2:?Release tag required}"
case "$role" in app|infra|realtime) ;; *) exit 2;; esac
bundle_dir=$(cd "$(dirname "$0")/.." && pwd)
runtime_dir="/opt/workspacehub/$role"
test -s "$runtime_dir/.env.production" || { echo 'Operator-managed .env.production is required' >&2; exit 1; }
mkdir -p "$runtime_dir/scripts"
exec 9>"$runtime_dir/.deploy.lock"
flock -n 9 || { echo 'Another deployment holds the lock' >&2; exit 1; }
export DEPLOY_LOCK_HELD=1
cp "$bundle_dir/scripts/"* "$runtime_dir/scripts/"
if [[ "$role" == app ]]; then
  cp "$bundle_dir/config/compose.yml" "$runtime_dir/compose.candidate.yml"
  APP_DIR="$runtime_dir" RUNTIME_DIR="$runtime_dir" bash "$runtime_dir/scripts/deploy-app.sh" "$tag"
else
  cp -R "$bundle_dir/config/". "$runtime_dir/"
  RUNTIME_DIR="$runtime_dir" bash "$runtime_dir/scripts/bootstrap-app-env.sh" "$role"
  if [[ "$role" == realtime ]]; then
    # The pinned Egress image runs as UID 1001; keep the secret config private.
    chown 1001:0 "$runtime_dir/egress.runtime.yaml"
  fi
  cd "$runtime_dir"
  docker compose --env-file .env.runtime -f compose.yml config --quiet
  docker compose --env-file .env.runtime -f compose.yml pull
  if [[ "$role" == infra ]]; then
    docker compose --env-file .env.runtime -f compose.yml up -d --wait postgres redis kafka
    docker compose --env-file .env.runtime -f compose.yml run --rm kafka-init
  else
    docker compose --env-file .env.runtime -f compose.yml up -d
    timeout 180 bash -c 'until curl -fsS http://127.0.0.1:7880/ >/dev/null && curl -fsS http://127.0.0.1:9090/ >/dev/null; do sleep 5; done'
  fi
fi
