#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
validate_tag "$IMAGE_TAG"
for service in user project communication notification document calendar; do
  compose --profile migration run --rm --no-deps "${service}-service-migration"
done
