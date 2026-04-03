#!/usr/bin/env bash
# Applique les migrations fixa-pro-hub puis admin-hub-central sur les 3 refs 3K.
# Prérequis : avoir exécuté bootstrap-supabase-3k.sh (fichier .generated/supabase-refs.env)
#   source scripts/migration-3k/.generated/supabase-refs.env
#   export SUPABASE_ACCESS_TOKEN_3K  (ou login --profile déjà fait)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GEN="$SCRIPT_DIR/.generated"
REFS_ENV="$GEN/supabase-refs.env"
FIXA_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ADMIN_ROOT="$(cd "$FIXA_ROOT/../admin-hub-central" && pwd)"

if [[ ! -f "$REFS_ENV" ]]; then
  echo "Manquant : $REFS_ENV — lancer bootstrap-supabase-3k.sh d’abord." >&2
  exit 1
fi
# shellcheck source=/dev/null
set -a
source "$REFS_ENV"
set +a

PROFILE="${SUPABASE_PROFILE:-3k-negoce}"
if [[ -n "${SUPABASE_ACCESS_TOKEN_3K:-}" ]]; then
  supabase login --token "$SUPABASE_ACCESS_TOKEN_3K" --profile "$PROFILE"
fi

push_repo() {
  local root="$1"
  local ref="$2"
  local label="$3"
  echo "=== $label → $ref ($(basename "$root")) ==="
  cd "$root"
  supabase link --project-ref "$ref" -p "$SUPABASE_DB_PASSWORD" --profile "$PROFILE" --yes
  supabase db push --profile "$PROFILE" --yes
}

for label in develop staging production; do
  case "$label" in
    develop) ref="${SUPABASE_REF_DEVELOP:-}" ;;
    staging) ref="${SUPABASE_REF_STAGING:-}" ;;
    production) ref="${SUPABASE_REF_PRODUCTION:-}" ;;
  esac
  if [[ -z "$ref" ]]; then
    echo "Ref Supabase manquante pour $label dans $REFS_ENV" >&2
    exit 1
  fi
  push_repo "$FIXA_ROOT" "$ref" "$label"
  push_repo "$ADMIN_ROOT" "$ref" "$label"
done

echo "Migrations appliquées (fixa puis admin) sur develop, staging, production 3K."
