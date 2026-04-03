#!/usr/bin/env bash
# Applique les secrets edge sur les 3 projets depuis un fichier .env local (gitignored).
# Copier secrets-edge.example.env vers .generated/secrets-edge.env et remplir les valeurs
# (clés Stripe 3K, Resend 3K, N8N_WEBHOOK_URL des nouveaux Railway, etc.)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GEN="$SCRIPT_DIR/.generated"
REFS_ENV="$GEN/supabase-refs.env"
SECRETS_FILE="${SECRETS_EDGE_FILE:-$GEN/secrets-edge.env}"

if [[ ! -f "$REFS_ENV" ]]; then
  echo "Manquant : $REFS_ENV" >&2
  exit 1
fi
if [[ ! -f "$SECRETS_FILE" ]]; then
  echo "Créer $SECRETS_FILE (voir secrets-edge.example.env)." >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$REFS_ENV"
set +a
PROFILE="${SUPABASE_PROFILE:-3k-negoce}"
if [[ -n "${SUPABASE_ACCESS_TOKEN_3K:-}" ]]; then
  supabase login --token "$SUPABASE_ACCESS_TOKEN_3K" --profile "$PROFILE"
fi

apply() {
  local ref="$1"
  local name="$2"
  echo "=== secrets set : $name ==="
  supabase secrets set --env-file "$SECRETS_FILE" --project-ref "$ref" --profile "$PROFILE" --yes
}

apply "$SUPABASE_REF_DEVELOP" "develop"
apply "$SUPABASE_REF_STAGING" "staging"
apply "$SUPABASE_REF_PRODUCTION" "production"
echo "OK."
