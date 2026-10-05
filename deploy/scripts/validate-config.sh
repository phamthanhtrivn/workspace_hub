#!/usr/bin/env bash
set -Eeuo pipefail
for area in dev prod/app prod/infra prod/realtime; do
  docker compose --env-file "deploy/$area/.env.example" -f "deploy/$area/compose.yml" config --quiet
done
docker compose --env-file deploy/dev/.env.example -f deploy/dev/compose.yml --profile realtime config --quiet
docker compose --env-file deploy/prod/app/.env.example -f deploy/prod/app/compose.yml --profile migration config --quiet
for script in deploy/scripts/*.sh deploy/shared/*/*.sh backend/kong-gateway/start-kong.sh; do bash -n "$script"; done
python3 -m py_compile deploy/scripts/render-runtime.py deploy/scripts/send-deployment.py
python3 -m unittest discover -s deploy/tests -v
python3 deploy/scripts/check-config.py
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.7@sha256:887a259a5a534f3c4f36cb02dca341673c6089431057242cdc931e9f133147e9
if grep -R -n -E ':latest|--accept-data-loss' deploy backend/*/Dockerfile* frontend/web/Dockerfile*; then
  echo 'Floating latest image or destructive startup command found' >&2; exit 1
fi
