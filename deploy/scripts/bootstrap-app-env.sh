#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
role="${1:-app}"
case "$role" in app|infra|realtime) ;; *) exit 2;; esac
runtime_dir="/opt/workspacehub/$role"
aws ssm get-parameters-by-path --path "/workspacehub/prod/$role/" --recursive --with-decryption --output json |
  python3 "$(dirname "$0")/render-runtime.py" "$role" "$runtime_dir"
