#!/usr/bin/env bash
# Exécute un fichier SQL sur Supabase staging ou production (projet 3K-Négoce).
# Usage: ./scripts/run-sql-migration.sh <staging|production> [chemin-fichier.sql]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV="${1:-}"
SQL_FILE="${2:-$ROOT/supabase/migrations/20260523150000_round_product_prices_clear_user_carts.sql}"

STAGING_REF="${SUPABASE_REF_STAGING:-lhrwjnieojuempxjbgql}"
PRODUCTION_REF="${SUPABASE_REF_PRODUCTION:-lqsbsinycyewdvdtbruy}"

if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  echo "Usage: $0 <staging|production> [fichier.sql]" >&2
  exit 1
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Fichier introuvable: $SQL_FILE" >&2
  exit 1
fi

if [[ -f "$ROOT/../scripts/load-3k-env.sh" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$ROOT/../scripts/load-3k-env.sh" && set +a
elif [[ -f "$ROOT/../scripts/supabase-refs.env" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$ROOT/../scripts/supabase-refs.env" && set +a
fi

export SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-${SUPABASE_ACCESS_TOKEN_3K:-}}}"
if [[ -z "$SUPABASE_ACCESS_TOKEN" ]]; then
  echo "Définir SUPABASE_ACCESS_TOKEN ou SUPABASE_ACCESS_TOKEN_3K (voir docs/AGENT_SECRETS_FROM_IMAC.md)." >&2
  exit 1
fi

if [[ "$ENV" == "staging" ]]; then
  PROJECT_REF="$STAGING_REF"
else
  PROJECT_REF="$PRODUCTION_REF"
fi

echo "→ Projet Supabase: $PROJECT_REF ($ENV)"
echo "→ SQL: $SQL_FILE"

cd "$ROOT"
supabase link --project-ref "$PROJECT_REF" --yes
supabase db query --linked -f "$SQL_FILE"

echo "OK — migration appliquée sur $ENV ($PROJECT_REF)."
