#!/usr/bin/env bash
# Déploie toutes les edge functions (fixa puis admin) sur les 3 projets 3K.
# Prérequis : .generated/supabase-refs.env + login profil 3k-negoce
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GEN="$SCRIPT_DIR/.generated"
REFS_ENV="$GEN/supabase-refs.env"
FIXA_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ADMIN_ROOT="$(cd "$FIXA_ROOT/../admin-hub-central" && pwd)"

if [[ ! -f "$REFS_ENV" ]]; then
  echo "Manquant : $REFS_ENV" >&2
  exit 1
fi
set -a
# shellcheck source=/dev/null
source "$REFS_ENV"
set +a

if [[ -n "${SUPABASE_ACCESS_TOKEN_3K:-}" ]]; then
  export SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN_3K"
  supabase login --token "$SUPABASE_ACCESS_TOKEN_3K"
fi

deploy_all_in_repo() {
  local root="$1"
  local ref="$2"
  cd "$root"
  for d in supabase/functions/*/; do
    [[ -d "$d" ]] || continue
    local name
    name="$(basename "$d")"
    [[ "$name" == "_shared" ]] && continue
    [[ -f "$d/index.ts" ]] || continue
    echo "  → functions deploy $name"
    if [[ -n "${SUPABASE_PROFILE:-}" ]]; then
      supabase functions deploy "$name" --project-ref "$ref" --profile "$SUPABASE_PROFILE" --use-api --yes
    else
      supabase functions deploy "$name" --project-ref "$ref" --use-api --yes
    fi
  done
}

run_env() {
  local label="$1"
  local ref="$2"
  if [[ -z "$ref" ]]; then
    echo "Ref vide pour $label" >&2
    exit 1
  fi
  echo "=== Edge functions : $label ($ref) ==="
  echo "-- fixa-pro-hub"
  deploy_all_in_repo "$FIXA_ROOT" "$ref"
  echo "-- admin-hub-central"
  deploy_all_in_repo "$ADMIN_ROOT" "$ref"
}

run_env "develop" "$SUPABASE_REF_DEVELOP"
run_env "staging" "$SUPABASE_REF_STAGING"
run_env "production" "$SUPABASE_REF_PRODUCTION"
echo "Terminé."
