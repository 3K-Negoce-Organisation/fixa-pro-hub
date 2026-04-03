#!/usr/bin/env bash
# Applique les secrets edge sur les 3 projets depuis .generated/secrets-edge.<env>.env
# (générés par generate-edge-secrets-3k.sh + secrets-edge.manual*.env).
# Fallback : un seul fichier $GEN/secrets-edge.env ou SECRETS_EDGE_FILE.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GEN="$SCRIPT_DIR/.generated"
REFS_ENV="$GEN/supabase-refs.env"
FORCE="${APPLY_EDGE_SECRETS_FORCE:-}"

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

secrets_file_for() {
  local name="$1"
  local per_env="$GEN/secrets-edge.${name}.env"
  if [[ -f "$per_env" ]]; then
    echo "$per_env"
    return
  fi
  if [[ -n "${SECRETS_EDGE_FILE:-}" && -f "$SECRETS_EDGE_FILE" ]]; then
    echo "$SECRETS_EDGE_FILE"
    return
  fi
  local legacy="$GEN/secrets-edge.env"
  if [[ -f "$legacy" ]]; then
    echo "$legacy"
    return
  fi
  echo ""
}

validate_env_file() {
  local f="$1"
  local label="$2"
  local key val line
  for key in RESEND_API_KEY ORDER_UPDATE_API_KEY STRIPE_WEBHOOK_SECRET N8N_WEBHOOK_URL; do
    line="$(grep -E "^${key}=" "$f" 2>/dev/null | tail -1 || true)"
    val="${line#${key}=}"
    val="${val%$'\r'}"
    if [[ -z "${val// }" ]]; then
      echo "Clé vide ou absente : $key ($label) dans $f" >&2
      return 1
    fi
  done
  return 0
}

apply() {
  local ref="$1"
  local name="$2"
  local file
  file="$(secrets_file_for "$name")"
  if [[ -z "$file" ]]; then
    echo "Aucun fichier secrets pour $name : lancer generate-edge-secrets-3k.sh ou créer $GEN/secrets-edge.${name}.env" >&2
    exit 1
  fi
  if [[ -z "$FORCE" ]]; then
    validate_env_file "$file" "$name" || {
      echo "Corrigez le fichier ou export APPLY_EDGE_SECRETS_FORCE=1 pour appliquer quand même." >&2
      exit 1
    }
  fi
  echo "=== secrets set : $name ($file) ==="
  if [[ -n "${SUPABASE_PROFILE:-}" ]]; then
    supabase secrets set --env-file "$file" --project-ref "$ref" --profile "$SUPABASE_PROFILE" --yes
  else
    supabase secrets set --env-file "$file" --project-ref "$ref" --yes
  fi
}

apply "$SUPABASE_REF_DEVELOP" "develop"
apply "$SUPABASE_REF_STAGING" "staging"
apply "$SUPABASE_REF_PRODUCTION" "production"
echo "OK."
