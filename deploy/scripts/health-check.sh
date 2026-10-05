#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
deadline=$((SECONDS + ${HEALTH_TIMEOUT_SECONDS:-240}))
while (( SECONDS < deadline )); do
  healthy=true
  for service in user-service project-service communication-service notification-service document-service calendar-service kong frontend-web; do
    container=$(compose ps -q "$service")
    if [[ -z "$container" ]] || [[ "$(docker inspect --format '{{.State.Health.Status}}' "$container" 2>/dev/null)" != healthy ]]; then
      healthy=false
      break
    fi
  done
  if $healthy; then
    kong_port=$(compose port kong 8000 | head -n 1 | awk -F: '{print $NF}')
    proxies=true
    for service in user project communication notification document calendar; do
      curl -fsS --max-time 5 "http://127.0.0.1:${kong_port}/health/${service}" >/dev/null || proxies=false
    done
    $proxies && exit 0
  fi
  sleep 5
done
echo 'Application readiness/proxy checks timed out.' >&2
compose ps
exit 1
