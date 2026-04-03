#!/usr/bin/env bash
# Crée un projet Railway vide sur le workspace 3K-Négoce (token compte / workspace obligatoire si pas le bon login CLI).
# Prérequis :
#   Option A : export RAILWAY_TOKEN_3K + RAILWAY_WORKSPACE_ID_3K
#   Option B : fichier scripts/migration-3k/.generated/railway-3k.env (gitignored), voir railway-3k.env.example
#   export RAILWAY_NEW_PROJECT_NAME=luceka-3k   (optionnel)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GEN="$SCRIPT_DIR/.generated"
LOCAL_ENV="$GEN/railway-3k.env"
if [[ -f "$LOCAL_ENV" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$LOCAL_ENV"
  set +a
fi

NAME="${RAILWAY_NEW_PROJECT_NAME:-luceka-3k}"
WS="${RAILWAY_WORKSPACE_ID_3K:?Définir RAILWAY_WORKSPACE_ID_3K (ou dans $LOCAL_ENV)}"

if [[ -n "${RAILWAY_TOKEN_3K:-}" ]]; then
  export RAILWAY_TOKEN="$RAILWAY_TOKEN_3K"
fi

railway init -n "$NAME" -w "$WS" --json
