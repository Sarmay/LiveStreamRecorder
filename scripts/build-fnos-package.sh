#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${VERSION:-${1:-1.0.0}}"
IMAGE_NAMESPACE="${IMAGE_NAMESPACE:-ghcr.io/sarmay}"
IMAGE_PREFIX="${IMAGE_PREFIX:-livestreamrecorder}"

node "$ROOT_DIR/scripts/prepare-fnos-package.mjs" \
  --version="$VERSION" \
  --image-namespace="$IMAGE_NAMESPACE" \
  --image-prefix="$IMAGE_PREFIX"

fnpack build --directory "$ROOT_DIR/fnos"
