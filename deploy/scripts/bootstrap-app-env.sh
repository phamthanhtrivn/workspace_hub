#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
role="${1:-app}"
case "$role" in app|infra|realtime) ;; *) exit 2;; esac
runtime_dir="${RUNTIME_DIR:-/opt/workspacehub/$role}"
"${RUNTIME_PYTHON:-/opt/workspacehub/venv/bin/python}" "$(dirname "$0")/render-runtime.py" "$role" "$runtime_dir"
