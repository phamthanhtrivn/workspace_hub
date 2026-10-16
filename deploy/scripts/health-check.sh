#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
deadline=$((SECONDS + ${HEALTH_TIMEOUT_SECONDS:-240}))
services=("$@")
if (( ${#services[@]} == 0 )); then
  services=(user-service project-service communication-service notification-service document-service calendar-service ai-service ai-worker kong frontend-web)
fi
while (( SECONDS < deadline )); do
  healthy=true
  for service in "${services[@]}"; do
    container=$(compose ps -q "$service")
    if [[ -z "$container" ]] || [[ "$(docker inspect --format '{{.State.Health.Status}}' "$container" 2>/dev/null)" != healthy ]]; then
      healthy=false
      break
    fi
  done
  if $healthy; then
    proxies=true
    routes=()
    for service in "${services[@]}"; do
      if [[ "$service" == kong ]]; then
        routes=(user project communication notification document calendar)
        available=$(compose config --services)
        if [[ "$available" == *ai-service* ]]; then routes+=(ai); fi
        break
      fi
      if [[ "$service" == *-service ]]; then routes+=("${service%-service}"); fi
    done
    if (( ${#routes[@]} > 0 )); then
      kong_port=$(compose port kong 8000 | head -n 1 | awk -F: '{print $NF}')
    fi
    for service in "${routes[@]}"; do
      curl -fsS --max-time 5 "http://127.0.0.1:${kong_port}/health/${service}" >/dev/null || proxies=false
    done
    $proxies && exit 0
  fi
  sleep 5
done
echo 'Application readiness/proxy checks timed out.' >&2
compose ps
exit 1
