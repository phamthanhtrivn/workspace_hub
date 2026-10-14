#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
role="${1:?Host role required}"
tag="${2:?Release tag required}"
plan="${3:?Release plan required}"
case "$role" in app|infra|realtime) ;; *) exit 2;; esac
bundle_dir=$(cd "$(dirname "$0")/.." && pwd)
runtime_dir="/opt/workspacehub/$role"
test -s "$runtime_dir/.env.production" || { echo 'Operator-managed .env.production is required' >&2; exit 1; }
mkdir -p "$runtime_dir/scripts"
exec 9>"$runtime_dir/.deploy.lock"
flock -n 9 || { echo 'Another deployment holds the lock' >&2; exit 1; }
export DEPLOY_LOCK_HELD=1
cp "$bundle_dir/scripts/"* "$runtime_dir/scripts/"
# Verify the planned baseline under the host lock before changing configuration.
"${RUNTIME_PYTHON:-/opt/workspacehub/venv/bin/python}" "$runtime_dir/scripts/verify-host-plan.py" "$role" "$runtime_dir" "$plan" "${tag#sha-}"
if [[ "$role" == app ]]; then
  cp "$bundle_dir/config/compose.yml" "$runtime_dir/compose.candidate.yml"
  APP_DIR="$runtime_dir" RUNTIME_DIR="$runtime_dir" bash "$runtime_dir/scripts/deploy-app.sh" "$tag" "$plan"
else
  cp -R "$bundle_dir/config/". "$runtime_dir/"
  "${RUNTIME_PYTHON:-/opt/workspacehub/venv/bin/python}" "$runtime_dir/scripts/release-host.py" "$role" "$runtime_dir" "$plan"
fi
if [[ "$role" != app ]]; then
  "${RUNTIME_PYTHON:-/opt/workspacehub/venv/bin/python}" "$runtime_dir/scripts/verify-host-plan.py" "$role" "$runtime_dir" "$plan" "${tag#sha-}" --commit
fi
