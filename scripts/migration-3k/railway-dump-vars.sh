#!/usr/bin/env bash
# Dump Railway variables per linked project (run from repo root after railway link).
set -euo pipefail
if [[ -z "${RAILWAY_TOKEN_PERSONAL:-}" ]]; then
  echo "export RAILWAY_TOKEN_PERSONAL=..." >&2
  exit 1
fi
export RAILWAY_TOKEN="$RAILWAY_TOKEN_PERSONAL"
echo "Link projet luceka: railway link (choisir le workspace / projet)"
echo "Puis par service / env: railway variables --kv"
railway whoami 2>&1 || true
