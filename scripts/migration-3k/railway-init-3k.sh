#!/usr/bin/env bash
# Crée un projet Railway vide sur le workspace 3K-Négoce (compte déjà authentifié ou token).
# Prérequis :
#   export RAILWAY_TOKEN_3K='...'   puis railway qui utilise ce token, OU railway login sur le compte 3K
#   export RAILWAY_WORKSPACE_ID_3K='uuid'   (Railway → workspace 3K → paramètres / URL)
#   export RAILWAY_NEW_PROJECT_NAME=luceka-3k   (optionnel)
set -euo pipefail
NAME="${RAILWAY_NEW_PROJECT_NAME:-luceka-3k}"
WS="${RAILWAY_WORKSPACE_ID_3K:?Définir RAILWAY_WORKSPACE_ID_3K}"

if [[ -n "${RAILWAY_TOKEN_3K:-}" ]]; then
  export RAILWAY_TOKEN="$RAILWAY_TOKEN_3K"
fi

railway init -n "$NAME" -w "$WS" --json
