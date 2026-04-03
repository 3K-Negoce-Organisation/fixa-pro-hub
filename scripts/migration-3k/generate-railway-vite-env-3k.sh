#!/usr/bin/env bash
# Écrit .generated/railway-vite-env.txt : VITE_SUPABASE_* pour chaque projet 3K
# (copier-coller dans les variables Railway par environnement).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GEN="$SCRIPT_DIR/.generated"
REFS_ENV="$GEN/supabase-refs.env"
OUT="$GEN/railway-vite-env.txt"

if [[ ! -f "$REFS_ENV" ]]; then
  echo "Manquant : $REFS_ENV" >&2
  exit 1
fi
command -v jq >/dev/null || { echo "jq requis." >&2; exit 1; }
command -v supabase >/dev/null || { echo "supabase CLI requis." >&2; exit 1; }

set -a
# shellcheck source=/dev/null
source "$REFS_ENV"
set +a

if [[ -n "${SUPABASE_ACCESS_TOKEN_3K:-}" ]]; then
  export SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN_3K"
  supabase login --token "$SUPABASE_ACCESS_TOKEN_3K"
fi

vite_block() {
  local label="$1" ref="$2"
  local json pub
  json="$(supabase projects api-keys --project-ref "$ref" -o json)"
  pub="$(echo "$json" | jq -r '[.[] | select(.type == "publishable")] | first | .api_key // empty')"
  if [[ -z "$pub" ]]; then
    pub="$(echo "$json" | jq -r '[.[] | select(.name == "anon")] | first | .api_key // empty')"
  fi
  cat <<EOF

# --- Railway / $label (projet $ref) ---
VITE_SUPABASE_URL=https://${ref}.supabase.co
VITE_SUPABASE_PROJECT_ID=${ref}
VITE_SUPABASE_PUBLISHABLE_KEY=${pub}
EOF
}

{
  echo "# Généré par generate-railway-vite-env-3k.sh — ne pas committer (.generated/)"
  echo "# Coller ces trois lignes dans le service storefront (et adapter l'admin si besoin)."
  vite_block "develop" "$SUPABASE_REF_DEVELOP"
  vite_block "staging" "$SUPABASE_REF_STAGING"
  vite_block "production" "$SUPABASE_REF_PRODUCTION"
} >"$OUT"

echo "Écrit : $OUT"
