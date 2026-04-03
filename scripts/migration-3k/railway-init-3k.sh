#!/usr/bin/env bash
# Crée un projet Railway vide sur le workspace 3K-Négoce.
#
# Prérequis :
#   export RAILWAY_TOKEN_3K='...'   (token **compte** OU **workspace**)
#   export RAILWAY_WORKSPACE_ID_3K='uuid'
#   ./scripts/migration-3k/resolve-railway-workspace-3k.sh  pour obtenir l’UUID avec un workspace token
#
# Optionnel : export RAILWAY_NEW_PROJECT_NAME=luceka-3k
#
# Note : la CLI `railway init` échoue souvent avec un **workspace token** (Unauthorized).
# Dans ce cas ce script crée le projet via l’API GraphQL (projectCreate).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NAME="${RAILWAY_NEW_PROJECT_NAME:-luceka-3k}"
WS="${RAILWAY_WORKSPACE_ID_3K:?Définir RAILWAY_WORKSPACE_ID_3K (voir resolve-railway-workspace-3k.sh)}"
TOKEN="${RAILWAY_TOKEN_3K:-${RAILWAY_TOKEN:-}}"
[[ -n "$TOKEN" ]] || { echo "Définir RAILWAY_TOKEN_3K" >&2; exit 1; }

export RAILWAY_TOKEN="$TOKEN"

END="https://backboard.railway.com/graphql/v2"

create_via_graphql() {
  local payload
  payload="$(jq -nc \
    --arg n "$NAME" \
    --arg w "$WS" \
    '{query: "mutation ($input: ProjectCreateInput!) { projectCreate(input: $input) { id name } }", variables: {input: {name: $n, workspaceId: $w}}}')"
  curl -sS -X POST "$END" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

set +e
out="$(railway init -n "$NAME" -w "$WS" --json 2>&1)"
rc=$?
set -e
if [[ "$rc" -eq 0 ]]; then
  echo "$out"
  echo "Projet créé via CLI railway."
  exit 0
fi

echo "CLI railway init non autorisée (token workspace ?). Création via GraphQL…" >&2
resp="$(create_via_graphql)"
if echo "$resp" | jq -e '.errors' >/dev/null 2>&1; then
  echo "$resp" | jq . >&2
  exit 1
fi
echo "$resp" | jq .
proj_id="$(echo "$resp" | jq -r '.data.projectCreate.id')"
echo "" >&2
echo "Projet créé : $proj_id — pour lier le dépôt local : cd … && railway link -p $proj_id" >&2
