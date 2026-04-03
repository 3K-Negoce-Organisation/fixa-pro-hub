#!/usr/bin/env bash
# Dump data-only (schema public) depuis les anciens projets Supabase vers les projets 3K.
# Prérequis : pg_dump et psql (Postgres client), jq.
#
# 1) cp scripts/migration-3k/legacy-db.passwords.env.example scripts/migration-3k/.generated/legacy-db.passwords.env
# 2) Remplir LEGACY_DB_PASSWORD_* (Dashboard ancien projet → Database password)
# 3) ./scripts/migration-3k/dump-restore-data-3k.sh [--dry-run]
#
# auth.users : non inclus. Les comptes existants ne seront pas recréés (à migrer séparément ou réinscription).
# Storage : non inclus (buckets / objects à traiter à part).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GEN="$SCRIPT_DIR/.generated"
REFS_ENV="$GEN/supabase-refs.env"
LEGACY_PW_ENV="$GEN/legacy-db.passwords.env"

LEGACY_DEVELOP="ojtrsrdcaugyzvtqtupf"
LEGACY_STAGING="giguuzfnjkkqdeteujwc"
LEGACY_PRODUCTION="aueuxlqtueoqjxsdemeu"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

if [[ ! -f "$REFS_ENV" ]]; then
  echo "Manquant : $REFS_ENV" >&2
  exit 1
fi
if ! $DRY_RUN && [[ ! -f "$LEGACY_PW_ENV" ]]; then
  echo "Manquant : $LEGACY_PW_ENV (voir legacy-db.passwords.env.example)" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$REFS_ENV"
if [[ -f "$LEGACY_PW_ENV" ]]; then
  # shellcheck source=/dev/null
  source "$LEGACY_PW_ENV"
fi
set +a

if $DRY_RUN; then
  echo "Paires prévues (data-only, schema public) :"
  echo "  develop    $LEGACY_DEVELOP  →  $SUPABASE_REF_DEVELOP"
  echo "  staging    $LEGACY_STAGING  →  $SUPABASE_REF_STAGING"
  echo "  production $LEGACY_PRODUCTION  →  $SUPABASE_REF_PRODUCTION"
  echo "Commande type : pg_dump -h db.<legacy>.supabase.co ... --data-only --schema=public"
  echo "                puis psql vers db.<nouveau>.supabase.co avec session_replication_role=replica"
  echo ""
fi

command -v pg_dump >/dev/null || { echo "pg_dump requis (brew install libpq)." >&2; exit 1; }
command -v psql >/dev/null || { echo "psql requis." >&2; exit 1; }

run_pair() {
  local label="$1" legacy_ref="$2" new_ref="$3" legacy_pw_var="$4"
  local legacy_pw="${!legacy_pw_var:-}"
  if [[ -z "$legacy_pw" ]]; then
    echo "Ignoré ($label) : $legacy_pw_var vide." >&2
    return 0
  fi

  local dump_file="$GEN/data-only-${label}.sql"
  local legacy_host="db.${legacy_ref}.supabase.co"
  local new_host="db.${new_ref}.supabase.co"

  echo "=== $label : dump depuis $legacy_ref ==="
  if $DRY_RUN; then
    echo "DRY-RUN: PGPASSWORD=*** pg_dump -h $legacy_host -U postgres -d postgres --data-only --schema=public -f $dump_file"
    return 0
  fi

  PGPASSWORD="$legacy_pw" pg_dump \
    -h "$legacy_host" -U postgres -d postgres \
    --data-only \
    --schema=public \
    --no-owner \
    --no-privileges \
    -f "$dump_file"

  echo "=== $label : restore vers $new_ref ==="
  {
    echo "SET session_replication_role = replica;"
    cat "$dump_file"
    echo "SET session_replication_role = DEFAULT;"
  } | PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h "$new_host" -U postgres -d postgres -v ON_ERROR_STOP=1

  echo "OK $label"
}

run_pair "develop" "$LEGACY_DEVELOP" "$SUPABASE_REF_DEVELOP" "LEGACY_DB_PASSWORD_DEVELOP"
run_pair "staging" "$LEGACY_STAGING" "$SUPABASE_REF_STAGING" "LEGACY_DB_PASSWORD_STAGING"
run_pair "production" "$LEGACY_PRODUCTION" "$SUPABASE_REF_PRODUCTION" "LEGACY_DB_PASSWORD_PRODUCTION"

echo "Terminé."
