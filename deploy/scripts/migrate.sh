#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
(( $# > 0 )) || { echo 'Pass the selected migration service names' >&2; exit 2; }
for service in "$@"; do
  case "$service" in user-service-migration|project-service-migration|communication-service-migration|notification-service-migration|document-service-migration|calendar-service-migration) ;; *) exit 2;; esac
  compose --profile migration run --rm --no-deps "$service"
done
