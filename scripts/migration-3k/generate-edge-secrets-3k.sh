#!/usr/bin/env bash
# Génère secrets-edge.<develop|staging|production>.env dans .generated/ :
#   SUPABASE_* via API CLI, STRIPE_SECRET_KEY + VAB_API_KEY via .railway-dump/ si présent,
#   puis fusionne secrets-edge.manual.env et secrets-edge.manual.<env>.env (optionnels).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GEN="$SCRIPT_DIR/.generated"
REFS_ENV="$GEN/supabase-refs.env"
RAILWAY_DIR="$SCRIPT_DIR/.railway-dump"

if [[ ! -f "$REFS_ENV" ]]; then
  echo "Manquant : $REFS_ENV (bootstrap Supabase 3K)." >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$REFS_ENV"
set +a

command -v jq >/dev/null || { echo "jq requis." >&2; exit 1; }
command -v supabase >/dev/null || { echo "supabase CLI requis." >&2; exit 1; }

if [[ -n "${SUPABASE_ACCESS_TOKEN_3K:-}" ]]; then
  export SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN_3K"
  supabase login --token "$SUPABASE_ACCESS_TOKEN_3K"
fi

vis_json_develop="$RAILWAY_DIR/develop__vis-a-bois_com_develop.json"
vis_json_staging="$RAILWAY_DIR/staging__vis-a-bois_com_staging.json"
vis_json_production="$RAILWAY_DIR/production www.vis-a-bois.com__vis-a-bois_com_prod.json"
n8n_develop="$RAILWAY_DIR/develop__n8n_production.json"
n8n_staging="$RAILWAY_DIR/staging__n8n_production.json"
n8n_production="$RAILWAY_DIR/production www.vis-a-bois.com__n8n_production.json"

railway_stripe() {
  local f="$1"
  [[ -f "$f" ]] || { echo ""; return; }
  jq -r '.STRIPE_SECRET_KEY // empty' "$f"
}

railway_vab() {
  local f="$1"
  [[ -f "$f" ]] || { echo ""; return; }
  jq -r '.VAB_API_KEY // empty' "$f"
}

supabase_block() {
  local ref="$1"
  local json
  json="$(supabase projects api-keys --project-ref "$ref" -o json)"
  local anon service
  anon="$(echo "$json" | jq -r '.[] | select(.name == "anon") | .api_key')"
  service="$(echo "$json" | jq -r '.[] | select(.name == "service_role") | .api_key')"
  local enc_pw
  enc_pw="$(jq -nr --arg p "$SUPABASE_DB_PASSWORD" '$p | @uri')"
  cat <<EOF
SUPABASE_URL=https://${ref}.supabase.co
SUPABASE_ANON_KEY=${anon}
SUPABASE_SERVICE_ROLE_KEY=${service}
SUPABASE_DB_URL=postgresql://postgres:${enc_pw}@db.${ref}.supabase.co:5432/postgres
EOF
}

write_one() {
  local env_name="$1" ref="$2" vis_j="$3" n8n_j="$4"
  local out="$GEN/secrets-edge.${env_name}.env"
  local stripe vab
  stripe="$(railway_stripe "$vis_j")"
  vab="$(railway_vab "$n8n_j")"

  mkdir -p "$GEN"
  {
    echo "# Généré par generate-edge-secrets-3k.sh — ne pas committer"
    supabase_block "$ref"
    echo "STRIPE_SECRET_KEY=${stripe}"
    echo "VAB_API_KEY=${vab}"
    echo ""
    echo "# --- Manuel (fichiers optionnels dans .generated/) ---"
  } >"$out"

  append_if() {
    local f="$1"
    if [[ -f "$f" ]]; then
      echo "" >>"$out"
      echo "# from $(basename "$f")" >>"$out"
      grep -v '^[[:space:]]*#' "$f" | grep -v '^[[:space:]]*$' >>"$out" || true
    fi
  }

  append_if "$GEN/secrets-edge.manual.env"
  append_if "$GEN/secrets-edge.manual.${env_name}.env"

  echo "Écrit : $out"
}

write_one develop "$SUPABASE_REF_DEVELOP" "$vis_json_develop" "$n8n_develop"
write_one staging "$SUPABASE_REF_STAGING" "$vis_json_staging" "$n8n_staging"
write_one production "$SUPABASE_REF_PRODUCTION" "$vis_json_production" "$n8n_production"

echo ""
echo "Remplir RESEND_API_KEY, ORDER_UPDATE_API_KEY, STRIPE_WEBHOOK_SECRET, N8N_WEBHOOK_URL"
echo "dans .generated/secrets-edge.manual.env (voir secrets-edge.manual.example.env), puis :"
echo "  ./scripts/migration-3k/apply-edge-secrets-3k.sh"
