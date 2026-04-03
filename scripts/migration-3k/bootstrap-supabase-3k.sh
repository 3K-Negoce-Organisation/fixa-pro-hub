#!/usr/bin/env bash
# Crée 3 projets Supabase dans l’org 3K-Négoce (profil CLI dédié).
# Prérequis (dans le shell, sans commiter) :
#   export SUPABASE_ACCESS_TOKEN_3K='sbp_...'
#   export SUPABASE_ORG_ID_3K='uuid-de-l-org'   # Dashboard Supabase → Organization settings
# Optionnel : export SUPABASE_DB_PASSWORD='mot de passe DB fort' (sinon généré)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GEN="$SCRIPT_DIR/.generated"
mkdir -p "$GEN"

if [[ -z "${SUPABASE_ACCESS_TOKEN_3K:-}" ]]; then
  echo "Définir SUPABASE_ACCESS_TOKEN_3K (token compte / org 3K-Négoce)." >&2
  exit 1
fi
if [[ -z "${SUPABASE_ORG_ID_3K:-}" ]]; then
  echo "Définir SUPABASE_ORG_ID_3K (UUID org, visible dans l’URL du dashboard Supabase)." >&2
  echo "Ou : supabase login --token \"\$SUPABASE_ACCESS_TOKEN_3K\" && supabase orgs list -o json" >&2
  exit 1
fi

export SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN_3K"
supabase login --token "$SUPABASE_ACCESS_TOKEN_3K"

DB_PASS="${SUPABASE_DB_PASSWORD:-$(openssl rand -base64 32 | tr -d '/+=' | head -c 28)}"
REGION="${SUPABASE_REGION:-eu-west-1}"

create_one() {
  local name="$1"
  local key="$2"
  echo ">>> Création projet : $name"
  local json
  json="$(supabase projects create "$name" \
    --org-id "$SUPABASE_ORG_ID_3K" \
    --db-password "$DB_PASS" \
    --region "$REGION" \
    --yes -o json)"
  local ref
  ref="$(echo "$json" | jq -r '.id // .ref // .project_id // empty')"
  if [[ -z "$ref" || "$ref" == "null" ]]; then
    echo "Réponse inattendue : $json" >&2
    exit 1
  fi
  echo "${key}=${ref}" >>"$GEN/supabase-refs.env"
}

rm -f "$GEN/supabase-refs.env"
echo "# Généré par bootstrap-supabase-3k.sh — ne pas committer" >"$GEN/supabase-refs.env"
create_one "vis-a-bois-develop-3k" "SUPABASE_REF_DEVELOP"
create_one "vis-a-bois-staging-3k" "SUPABASE_REF_STAGING"
create_one "vis-a-bois-production-3k" "SUPABASE_REF_PRODUCTION"
echo "SUPABASE_DB_PASSWORD=${DB_PASS}" >>"$GEN/supabase-refs.env"

echo ""
echo "OK. Fichier : $GEN/supabase-refs.env"
echo "Les nouveaux projets peuvent prendre 1–2 minutes avant d’accepter link/db push."
